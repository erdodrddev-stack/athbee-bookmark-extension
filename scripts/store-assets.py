"""
Chrome Web Store images: 1280x800 screenshots (pt-BR and English) and promo tiles.

    npm run store:assets

Loads the built extension into a local Chromium-based browser (same setup as
tests/e2e), fills a throwaway profile with realistic demo bookmarks, visits
those sites once so favicons and suggestions are real (needs internet), then
captures each screen. Output: docs/store/images/.
"""
import hashlib, json, os, shutil, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'store', 'images')
TMP = os.path.join(ROOT, 'scripts', '.tmp-store')
CANDIDATES = ['/opt/brave.com/brave/brave', '/usr/bin/brave-browser', '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser']
EXE = os.environ.get('ATHBEE_BROWSER') or next((c for c in CANDIDATES if os.path.exists(c)), None)
if not EXE: sys.exit('No browser found: set ATHBEE_BROWSER.')

# copy of the build with site access pre-granted, so the link check can run headless
shutil.rmtree(TMP, ignore_errors=True)
DIST = os.path.join(TMP, 'dist')
shutil.copytree(os.path.join(ROOT, 'dist'), DIST)
m = json.load(open(os.path.join(DIST, 'manifest.json')))
m['host_permissions'] = ['<all_urls>']
json.dump(m, open(os.path.join(DIST, 'manifest.json'), 'w'))
h = hashlib.sha256(os.path.abspath(DIST).encode()).hexdigest()[:32]
NEWTAB = 'chrome-extension://' + ''.join(chr(97 + int(c, 16)) for c in h) + '/newtab.html'

# ---- demo data (titles per language) ----
L = {
  'pt': dict(work='Trabalho', docs='Documentação', study='Estudos', personal='Pessoal', later='Ler depois',
             s1='Pesquisa de design', s2='Viagem para Lisboa', s3='Sprint 42', ws_work='Trabalho', ws_life='Pessoal',
             old='Blog antigo do time', cal='Agenda', maps='Mapas'),
  'en': dict(work='Work', docs='Docs', study='Study', personal='Personal', later='Read later',
             s1='Design research', s2='Trip to Lisbon', s3='Sprint 42', ws_work='Work', ws_life='Personal',
             old='Old team blog', cal='Calendar', maps='Maps'),
}

def seed_js(t):
    return """async (t) => {
  const mk = (parentId, title, url) => chrome.bookmarks.create({ parentId, title, url })
  const ids = {}
  const bar = '1', other = '2'
  for (const [title, url] of [['GitHub', 'https://github.com/'], ['YouTube', 'https://www.youtube.com/'], ['Wikipedia', 'https://www.wikipedia.org/'], ['Hacker News', 'https://news.ycombinator.com/']])
    ids[title] = (await mk(bar, title, url)).id
  const work = await mk(bar, t.work); ids.work = work.id
  for (const [title, url] of [['Gmail', 'https://mail.google.com/'], [t.cal, 'https://calendar.google.com/'], ['Notion', 'https://www.notion.so/'], ['Slack', 'https://slack.com/'], ['Figma', 'https://www.figma.com/'], ['Linear', 'https://linear.app/'], ['Trello', 'https://trello.com/']])
    ids[title] = (await mk(work.id, title, url)).id
  const docs = await mk(work.id, t.docs); ids.docs = docs.id
  for (const [title, url] of [['MDN Web Docs', 'https://developer.mozilla.org/'], ['Vue.js', 'https://vuejs.org/'], ['Stack Overflow', 'https://stackoverflow.com/'], ['Can I use', 'https://caniuse.com/']])
    ids[title] = (await mk(docs.id, title, url)).id
  const study = await mk(bar, t.study); ids.study = study.id
  for (const [title, url] of [['Coursera', 'https://www.coursera.org/'], ['Khan Academy', 'https://www.khanacademy.org/'], ['Duolingo', 'https://www.duolingo.com/'], ['freeCodeCamp', 'https://www.freecodecamp.org/']])
    ids[title] = (await mk(study.id, title, url)).id
  const personal = await mk(bar, t.personal); ids.personal = personal.id
  for (const [title, url] of [['Spotify', 'https://open.spotify.com/'], ['Netflix', 'https://www.netflix.com/'], ['Airbnb', 'https://www.airbnb.com/'], [t.maps, 'https://www.google.com/maps'], ['Amazon', 'https://www.amazon.com/']])
    ids[title] = (await mk(personal.id, title, url)).id
  const later = await mk(other, t.later); ids.later = later.id
  for (const [title, url] of [['The Verge', 'https://www.theverge.com/'], ['Smashing Magazine', 'https://www.smashingmagazine.com/'], ['CSS-Tricks', 'https://css-tricks.com/'], ['GitHub', 'https://www.github.com/?utm_source=newsletter'], [t.old, 'https://github.com/athbee-bookmark-demo/this-page-does-not-exist'], ['Firefox', 'http://www.mozilla.org/firefox/new/'], ['Twitter', 'http://twitter.com/']])
    ids['later:' + title] = (await mk(later.id, title, url)).id
  return ids
}"""

def setup(page, lang, ids):
    t = L[lang]
    tags = {ids['GitHub']: ['dev'], ids['MDN Web Docs']: ['dev', 'docs'], ids['Vue.js']: ['dev', 'docs'], ids['Stack Overflow']: ['dev'],
            ids['Notion']: ['planning'], ids['Figma']: ['design'], ids['Linear']: ['planning'], ids['Coursera']: ['course'],
            ids['freeCodeCamp']: ['course', 'dev'], ids['Hacker News']: ['news'], ids['later:The Verge']: ['news'],
            ids['later:Smashing Magazine']: ['design'], ids['later:CSS-Tricks']: ['dev', 'design'], ids['Airbnb']: ['travel'], ids[t['maps']]: ['travel']}
    if lang == 'pt':
        ren = {'planning': 'planejamento', 'course': 'curso', 'news': 'notícias', 'travel': 'viagem'}
        tags = {k: [ren.get(x, x) for x in v] for k, v in tags.items()}
    colors = {'dev': '#74b9ff', 'design': '#ff8fd1'}
    work = [{'id': 'wwork', 'name': t['ws_work'], 'folders': [ids['work']], 'accent': 'blue', 'look': 'modern'},
            {'id': 'wlife', 'name': t['ws_life'], 'folders': [ids['personal'], ids['study']], 'accent': 'green', 'look': None}]
    meta = {'pinned': [ids['Gmail'], ids[t['cal']], ids['Notion'], ids['docs']], 'hidden': [], 'tags': tags, 'tagColors': colors,
            'workspaces': work, 'activeWs': None, 'seenVersion': m['version'], 'historyOpen': False, 'expanded': {'1': True, ids['work']: True}}
    settings = {'lang': lang, 'theme': 'light', 'look': 'modern', 'accent': 'yellow', 'style': 'card', 'layout': 'grid', 'width': 230}
    now = int(time.time() * 1000)
    g = lambda title, color: {'title': title, 'color': color}
    sessions = [
        {'id': 's1', 'name': t['s1'], 'createdAt': now - 3600e3, 'updatedAt': now - 3600e3, 'tabs': [
            {'url': 'https://www.figma.com/', 'title': 'Figma', 'pinned': True},
            {'url': 'https://www.smashingmagazine.com/', 'title': 'Smashing Magazine', 'group': g('Refs', 'pink')},
            {'url': 'https://css-tricks.com/', 'title': 'CSS-Tricks', 'group': g('Refs', 'pink')},
            {'url': 'https://developer.mozilla.org/', 'title': 'MDN Web Docs', 'group': g('Refs', 'pink')},
            {'url': 'https://caniuse.com/', 'title': 'Can I use', 'group': g('Specs', 'blue')},
            {'url': 'https://vuejs.org/', 'title': 'Vue.js', 'group': g('Specs', 'blue')}]},
        {'id': 's2', 'name': t['s2'], 'createdAt': now - 86400e3 * 2, 'updatedAt': now - 86400e3 * 2, 'tabs': [
            {'url': 'https://www.airbnb.com/', 'title': 'Airbnb'}, {'url': 'https://www.google.com/maps', 'title': t['maps']},
            {'url': 'https://www.wikipedia.org/', 'title': 'Wikipedia'}, {'url': 'https://www.duolingo.com/', 'title': 'Duolingo'}]},
        {'id': 's3', 'name': t['s3'], 'createdAt': now - 86400e3 * 6, 'updatedAt': now - 86400e3 * 5, 'tabs': [
            {'url': 'https://linear.app/', 'title': 'Linear', 'pinned': True}, {'url': 'https://github.com/', 'title': 'GitHub', 'group': g('Code', 'green')},
            {'url': 'https://stackoverflow.com/', 'title': 'Stack Overflow', 'group': g('Code', 'green')},
            {'url': 'https://slack.com/', 'title': 'Slack'}, {'url': 'https://www.notion.so/', 'title': 'Notion'},
            {'url': 'https://trello.com/', 'title': 'Trello'}, {'url': 'https://calendar.google.com/', 'title': t['cal']}]},
    ]
    # Pro on, so the paid screens (workspace looks, whole-library link check, cyberpunk) render without locks
    license = {'pro': True, 'source': 'dev', 'since': now}
    page.evaluate("async (d) => { await chrome.storage.local.set(d) }", {'meta': meta, 'settings': settings, 'sessions': sessions, 'license': license})

def run_lang(p, lang):
    profile = os.path.join(TMP, 'profile-' + lang)
    ctx = p.chromium.launch_persistent_context(
        profile, executable_path=EXE, headless=True, viewport={'width': 1280, 'height': 800}, device_scale_factor=1,
        # the browser names its root folders ("Bookmarks bar") from the system locale when it creates the profile
        env={**os.environ, 'LANG': 'pt_BR.UTF-8' if lang == 'pt' else 'en_US.UTF-8', 'LANGUAGE': 'pt_BR' if lang == 'pt' else 'en_US'},
        locale='pt-BR' if lang == 'pt' else 'en-US',
        args=[f'--disable-extensions-except={DIST}', f'--load-extension={DIST}', '--no-first-run', '--lang=' + ('pt-BR' if lang == 'pt' else 'en-US')],
    )
    page = ctx.new_page()
    page.goto(NEWTAB); page.wait_for_selector('.brand')
    ids = page.evaluate(seed_js(L[lang]), L[lang])

    # visit the sites once: real favicons, real history for suggestions
    urls = page.evaluate("async () => { const out = []; const walk = (n) => { if (n.url) out.push(n.url); (n.children || []).forEach(walk) }; walk((await chrome.bookmarks.getTree())[0]); return out }")
    weights = {'https://github.com/': 6, 'https://mail.google.com/': 5, 'https://developer.mozilla.org/': 4, 'https://www.notion.so/': 4,
               'https://www.youtube.com/': 3, 'https://www.figma.com/': 3, 'https://vuejs.org/': 3, 'https://stackoverflow.com/': 2}
    pages = [ctx.new_page() for _ in range(6)]
    queue = [u for u in urls for _ in range(weights.get(u, 1))]
    while queue:
        batch, queue = queue[:6], queue[6:]
        for pg, u in zip(pages, batch):
            try: pg.goto(u, wait_until='load', timeout=25000)
            except Exception: pass
        time.sleep(3)  # favicons are fetched after load
    for pg in pages: pg.close()
    page.wait_for_timeout(2000)

    setup(page, lang, ids)
    out = os.path.join(OUT, lang); os.makedirs(out, exist_ok=True)
    def shot(name, wait=900):
        page.wait_for_timeout(wait)
        page.mouse.move(1270, 790)
        page.screenshot(path=os.path.join(out, name + '.png'))

    # 1 — home: suggestions, pinned, bookmarks bar
    page.goto(NEWTAB); page.wait_for_selector('.bm'); page.wait_for_timeout(1500)
    shot('1-home')

    # 2 — workspace "Work" in dark theme, columns layout, its own accent/look
    page.evaluate("async () => { const s = await chrome.storage.local.get(['meta', 'settings']); s.meta.activeWs = 'wwork'; s.settings.theme = 'dark'; s.settings.layout = 'columns'; await chrome.storage.local.set(s) }")
    page.reload(); page.wait_for_selector('.bm'); page.locator('.ws-switch').click(); page.wait_for_selector('.ctx-item')
    shot('2-workspaces')
    page.keyboard.press('Escape')

    # 3 — sessions with tab groups
    page.evaluate("async () => { const s = await chrome.storage.local.get(['meta', 'settings']); s.meta.activeWs = null; s.settings.theme = 'light'; s.settings.layout = 'grid'; s.settings.accent = 'orange'; s.meta.lastFolder = 'sessions'; await chrome.storage.local.set(s) }")
    # a few open tabs, so the save button reads "Save 3 tabs" instead of 0
    extra = []
    for u in ('https://www.wikipedia.org/', 'https://news.ycombinator.com/', 'https://www.theverge.com/'):
        pg = ctx.new_page(); extra.append(pg)
        try: pg.goto(u, wait_until='domcontentloaded', timeout=20000)
        except Exception: pass
    page.bring_to_front()
    page.reload(); page.wait_for_selector('.sess-card')
    page.locator('.sess-chev').first.click()
    shot('3-sessions', 1500)
    for pg in extra: pg.close()

    # 4 — maintenance: real broken-link check
    page.evaluate("async () => { const s = await chrome.storage.local.get(['meta', 'settings']); s.meta.lastFolder = '1'; s.settings.accent = 'yellow'; await chrome.storage.local.set(s) }")
    page.reload(); page.wait_for_selector('.bm')
    page.locator('.sb-foot .tree-row').first.click()
    page.locator('.mt-tabs button').nth(2).click()
    page.locator('.mt-actions .btn-primary').click()
    page.wait_for_selector('.mt-actions .btn-primary:not([disabled])', timeout=180000)
    page.wait_for_function("() => !document.querySelector('.mt-actions .btn-danger')", timeout=180000)
    shot('4-maintenance')
    page.keyboard.press('Escape')

    # 5 — icon style, cyberpunk, search by tag with bulk selection
    page.evaluate("async () => { const s = await chrome.storage.local.get(['meta', 'settings']); s.settings.theme = 'dark'; s.settings.look = 'cyber'; s.settings.style = 'icon'; s.settings.accent = 'pink'; s.meta.lastFolder = null; await chrome.storage.local.set(s) }")
    page.goto(NEWTAB); page.wait_for_selector('.bm')
    cards = page.locator('.hsec .bm[data-id]')
    cards.nth(0).hover(); cards.nth(0).locator('.bm-check').click()
    cards.nth(3).click(modifiers=['Shift'])
    shot('5-icons-selection')
    ctx.close()

def promo(p):
    font = 'file://' + os.path.join(ROOT, 'node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2')
    mono = 'file://' + os.path.join(ROOT, 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2')
    logo = '<svg viewBox="0 0 100 100" width="{s}" height="{s}"><rect width="100" height="100" fill="#191919"/><path d="M33 22h34v58L50 64 33 80z" fill="#f6c324"/></svg>'
    css = f"""@font-face{{font-family:A;src:url({font})}}@font-face{{font-family:M;src:url({mono})}}
      body{{margin:0;background:#f6c324;font-family:A;color:#191919;display:flex;align-items:center;justify-content:center;height:100vh;
      background-image:radial-gradient(#19191922 1.2px,transparent 1.2px);background-size:18px 18px}}
      .box{{display:flex;align-items:center;gap:var(--g)}} h1{{margin:0;font-size:var(--t);line-height:1;text-transform:uppercase;letter-spacing:-.01em}}
      p{{margin:.45em 0 0;font-family:M;font-size:var(--s);font-weight:700}}
      .card{{border:4px solid #191919;background:#fffff0;box-shadow:10px 10px 0 #191919;padding:var(--pad)}}"""
    browser = p.chromium.launch(executable_path=EXE, headless=True)
    for name, w, h, vars_, tag in [
        ('promo-small-440x280', 440, 280, '--g:14px;--t:30px;--s:12px;--pad:18px', 'Favoritos, workspaces<br>e sessões'),
        ('promo-small-440x280-en', 440, 280, '--g:14px;--t:30px;--s:12px;--pad:18px', 'Bookmarks, workspaces<br>and sessions'),
        ('marquee-1400x560', 1400, 560, '--g:44px;--t:100px;--s:30px;--pad:48px', 'Seus favoritos, organizados.<br>Nada sai do navegador.'),
        ('marquee-1400x560-en', 1400, 560, '--g:44px;--t:100px;--s:30px;--pad:48px', 'Your bookmarks, organized.<br>Nothing leaves your browser.'),
    ]:
        pg = browser.new_page(viewport={'width': w, 'height': h})
        size = 78 if w < 600 else 220
        # a file:// page, so the file:// fonts are allowed to load
        html = os.path.join(TMP, name + '.html')
        open(html, 'w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><body style="{vars_}"><div class="card box">{logo.format(s=size)}<div><h1>Athbee<br>Bookmark</h1><p>{tag}</p></div></div></body>')
        pg.goto('file://' + html)
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(OUT, name + '.png'))
        pg.close()
    browser.close()

with sync_playwright() as p:
    os.makedirs(OUT, exist_ok=True)
    # PROMO_ONLY=1 redraws just the promo tiles (no internet needed)
    if not os.environ.get('PROMO_ONLY'):
        for lang in ('pt', 'en'):
            print('screenshots:', lang); run_lang(p, lang)
    print('promo tiles'); promo(p)
shutil.rmtree(TMP, ignore_errors=True)
print('done:', OUT)
