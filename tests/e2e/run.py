"""
End-to-end smoke test: loads the built extension (dist/) into a real
Chromium-based browser, headless, and drives every feature through the UI.

    npm run test:e2e

Needs Python with Playwright (see tests/e2e/README.md) and a Chromium-based
browser that still accepts --load-extension (Brave, Edge, Chromium, Chrome for
Testing; branded Google Chrome 137+ does not). Set BOOKDECK_BROWSER to pick
one. Screenshots and the downloaded backup land in tests/e2e/.tmp/out/.
"""
import hashlib, http.server, json, os, shutil, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIST = os.path.join(ROOT, 'dist')
CANDIDATES = [
    '/opt/brave.com/brave/brave', '/usr/bin/brave-browser', '/usr/bin/microsoft-edge', '/usr/bin/chromium',
    '/usr/bin/chromium-browser', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]
EXE = os.environ.get('BOOKDECK_BROWSER') or next((c for c in CANDIDATES if os.path.exists(c)), None)
if not EXE:
    sys.exit('No browser found: set BOOKDECK_BROWSER to a Chromium-based browser executable.')
if not os.path.exists(os.path.join(SRC_DIST, 'manifest.json')):
    sys.exit('dist/ is missing: run "npm run build" first.')

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.tmp')
os.makedirs(HERE, exist_ok=True)
# test copy of the build with site access pre-granted: headless can't click the permission prompt
DIST = os.path.join(HERE, 'dist-test')
shutil.rmtree(DIST, ignore_errors=True)
shutil.copytree(SRC_DIST, DIST)
_m = json.load(open(os.path.join(DIST, 'manifest.json')))
_m['host_permissions'] = ['<all_urls>']
json.dump(_m, open(os.path.join(DIST, 'manifest.json'), 'w'))
OUT = os.path.join(HERE, 'out')
PROFILE = os.path.join(HERE, 'profile')
shutil.rmtree(PROFILE, ignore_errors=True)
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)

# ---- local site for link checks and sessions ----
class Site(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body=b'', headers=None):
        self.send_response(code)
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)
    def do_HEAD(self): self.do_GET()
    def do_GET(self):
        p = self.path
        if p == '/gone': return self._send(404)
        if p == '/moved': return self._send(301, headers={'Location': '/new-home'})
        return self._send(200, f'<title>Page {p}</title><h1>{p}</h1>'.encode())

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Site)
threading.Thread(target=srv.serve_forever, daemon=True).start()
SITE = f'http://127.0.0.1:{srv.server_address[1]}'

def ext_id(path):
    h = hashlib.sha256(os.path.abspath(path).encode()).hexdigest()[:32]
    return ''.join(chr(ord('a') + int(c, 16)) for c in h)

EID = ext_id(DIST)
NEWTAB = f'chrome-extension://{EID}/newtab.html'
results, errors = [], []

def step(name):
    def wrap(fn):
        try:
            fn()
            results.append(('PASS', name, ''))
        except Exception as e:
            results.append(('FAIL', name, f'{type(e).__name__}: {str(e).splitlines()[0][:300]}'))
            try: page.screenshot(path=os.path.join(OUT, f'FAIL-{name}.png'))
            except Exception: pass
        return fn
    return wrap

def shot(name): page.screenshot(path=os.path.join(OUT, f'{name}.png'))
def expect(cond, msg):
    if not cond: raise AssertionError(msg)

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        PROFILE, executable_path=EXE, headless=True, accept_downloads=True,
        viewport={'width': 1360, 'height': 860},
        args=[f'--disable-extensions-except={DIST}', f'--load-extension={DIST}', '--no-first-run', '--lang=pt-BR'],
    )
    page = ctx.new_page()
    def watch(pg):
        pg.on('console', lambda m: m.type == 'error' and errors.append(f'[{pg.url[:60]}] {m.text}'))
        pg.on('pageerror', lambda e: errors.append(f'[{pg.url[:60]}] {e}'))
    watch(page)
    page.goto(NEWTAB)
    page.wait_for_selector('.brand')

    @step('welcome tour on first run, not shown again')
    def _():
        page.wait_for_selector('.wl-step')
        page.wait_for_timeout(400)
        shot('00-welcome')
        for _ in range(3):
            page.get_by_role('button', name='Próximo').click()
        expect('navegador' in page.locator('.wl-h').inner_text().lower(), 'last step not reached')
        page.get_by_role('button', name='Vamos lá').click()
        page.wait_for_selector('.wl', state='detached')
        page.reload(); page.wait_for_selector('.brand'); page.wait_for_timeout(800)
        expect(page.locator('.wl').count() == 0, 'welcome shown again after reload')

    # ---- seed bookmarks through the extension's own API access ----
    page.evaluate("""async (site) => {
      const bar = '1', other = '2'
      const mk = (parentId, title, url) => chrome.bookmarks.create({ parentId, title, url })
      const work = await mk(bar, 'Trabalho')
      await mk(work.id, 'Jira', site + '/jira')
      await mk(work.id, 'Wiki – Equipe', site + '/wiki')
      const docs = await mk(work.id, 'Docs')
      await mk(docs.id, 'API Reference', site + '/api')
      const pers = await mk(bar, 'Pessoal')
      await mk(pers.id, 'Banco', site + '/bank')
      await mk(pers.id, 'Receitas', site + '/recipes')
      await mk(bar, 'GitHub', 'https://github.com/')
      await mk(bar, 'GitHub (cópia)', 'http://www.github.com?utm_source=newsletter')
      await mk(bar, 'Página removida', site + '/gone')
      await mk(bar, 'Endereço antigo', site + '/moved')
      await mk(bar, 'Notícias', site + '/news')
      await mk(other, 'Mapa', site + '/map')
    }""", SITE)
    page.reload()
    page.wait_for_selector('.bm')
    page.wait_for_timeout(500)

    @step('home renders seeded bookmarks')
    def _():
        expect(page.locator('.bm').count() >= 7, f"only {page.locator('.bm').count()} cards")
        shot('01-home')

    @step('style: icon-only tiles')
    def _():
        page.get_by_text('Configurações', exact=True).click()
        page.locator('.st-tabs button', has_text='Aparência').click()
        page.get_by_text('Ícones', exact=True).click()
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        expect(page.locator('.bm-tile').count() >= 7, 'no .bm-tile cards')
        expect(page.locator('.bm-tile .bm-title', has_text='Wiki').first.inner_text() == 'Wiki', 'short label not applied')
        shot('02-icon-style')
        # back to cards for the rest of the run
        page.get_by_text('Configurações', exact=True).click()
        page.locator('.st-tabs button', has_text='Aparência').click()
        page.get_by_text('Cartões', exact=True).click()
        page.keyboard.press('Escape')

    @step('backup: export downloads a valid file')
    def _():
        page.get_by_text('Configurações', exact=True).click()
        page.locator('.st-tabs button', has_text='Backup').click()
        with page.expect_download() as dl:
            page.get_by_role('button', name='Exportar').click()
        path = os.path.join(OUT, 'backup.json')
        dl.value.save_as(path)
        data = json.load(open(path))
        expect(data['app'] == 'bookdeck' and len(data['roots']) >= 2, 'bad backup content')
        global BACKUP
        BACKUP = path

    @step('backup: import preview and merge')
    def _():
        page.locator('input[type=file]').set_input_files(BACKUP)
        page.wait_for_selector('.bk-box')
        shot('03-import-preview')
        page.get_by_role('button', name='Importar', exact=True).click()
        page.wait_for_selector('.bk-done')
        txt = page.locator('.bk-done').inner_text()
        expect('0 itens criados' in txt, f'unexpected result: {txt}')
        page.keyboard.press('Escape')

    @step('maintenance: duplicates found and resolved with undo')
    def _():
        page.get_by_text('Manutenção', exact=True).click()
        page.locator('.mt-tabs button', has_text='Duplicados').click()
        page.wait_for_selector('.dup-group')
        expect(page.locator('.dup-group').count() == 1, 'expected 1 duplicate group')
        shot('04-duplicates')
        page.get_by_role('button', name='Remover cópias').click()
        page.wait_for_selector('.dup-empty')
        expect('1 cópia removida' in page.locator('.toast').last.inner_text(), 'toast text: ' + page.locator('.toast').last.inner_text())
        page.locator('.toast-action').click()
        page.wait_for_selector('.dup-group')

    @step('maintenance: unused tab renders')
    def _():
        page.locator('.mt-tabs button', has_text='Parados').click()
        page.wait_for_selector('.stale-top')
        page.wait_for_timeout(800)
        shot('05-stale')

    @step('maintenance: link check finds broken and moved links')
    def _():
        page.locator('.mt-tabs button', has_text='Links quebrados').click()
        page.get_by_role('button', name='Verificar agora').click()
        page.wait_for_selector('text=Verificar de novo', timeout=60000)
        shot('06-linkcheck')
        broken = page.locator('.lc-group', has=page.locator('.lc-broken'))
        moved = page.locator('.lc-group', has=page.locator('.lc-redirect'))
        expect(broken.locator('.lc-title', has_text='Página removida').count() == 1, '404 not reported as broken')
        expect(moved.locator('.lc-title', has_text='Endereço antigo').count() == 1, 'redirect not reported as moved')
        expect(page.locator('.lc-title', has_text='Jira').count() == 0, 'working link reported')
        moved.locator('.lc-row', has_text='Endereço antigo').locator('.icon-btn[title*="novo endereço"]').click()
        page.wait_for_timeout(500)
        url = page.evaluate("async () => (await chrome.bookmarks.search({ title: 'Endereço antigo' }))[0].url")
        expect(url.endswith('/new-home'), 'redirect not applied: ' + url)
        global LINK_NOTE
        LINK_NOTE = page.locator('.lc + .st-hint, .lc p.st-hint').first.inner_text() if page.locator('.lc p.st-hint').count() else ''
        page.keyboard.press('Escape')

    @step('bulk select: range, tags, Esc')
    def _():
        page.goto(NEWTAB); page.wait_for_selector('.bm')
        cards = page.locator('.hsec .bm-grid .bm[data-id]')
        n = cards.count()
        expect(n >= 3, 'not enough cards')
        cards.nth(0).hover(); cards.nth(0).locator('.bm-check').click()
        cards.nth(2).click(modifiers=['Shift'])
        expect(page.locator('.sel-bar').is_visible(), 'selection bar hidden')
        cnt = page.locator('.sel-count').inner_text()
        expect('3' in cnt, f'expected 3 selected, got {cnt}')
        shot('07-selection')
        page.locator('.sel-btn', has_text='Tags').click()
        page.locator('#bulk-add input, .tag-input input').first.fill('lote')
        page.keyboard.press('Enter')
        page.get_by_role('button', name='Salvar').click()
        page.wait_for_timeout(300)
        expect(page.locator('.bm .tag', has_text='lote').count() == 3, 'tag not on 3 cards')
        page.keyboard.press('Escape')
        page.wait_for_selector('.sel-bar', state='detached', timeout=2000)
        shot('08-tagged')

    @step('sessions: save window and reopen')
    def _():
        extra = []
        for path in ('/s1', '/s2', '/s3'):
            pg = ctx.new_page(); pg.goto(SITE + path); extra.append(pg)
        page.bring_to_front()
        page.get_by_text('Sessões', exact=True).first.click()
        page.wait_for_selector('.sess-save')
        page.wait_for_timeout(500)
        label = page.locator('.sess-save .btn-primary').inner_text()
        page.locator('.sess-save input.input').fill('Pesquisa')
        page.locator('.sess-save .btn-primary').click()
        page.wait_for_selector('.sess-card')
        expect(page.locator('.sess-name').first.inner_text() == 'Pesquisa', 'session name')
        meta = page.locator('.sess-meta').first.inner_text()
        expect(meta.startswith('3 abas'), f'expected 3 tabs, got "{meta}" (button said "{label}")')
        page.locator('.sess-chev').first.click()
        shot('09-sessions')
        before = len(ctx.pages)
        page.locator('.sess-open').first.click()
        page.wait_for_timeout(1500)
        expect(len(ctx.pages) >= before + 3, f'pages {before} -> {len(ctx.pages)}')
        for pg in ctx.pages:
            if pg != page: pg.close()

    @step('workspaces: create, filter, Alt+0')
    def _():
        page.bring_to_front()
        page.locator('.ws-switch').click()
        page.locator('.ctx-item', has_text='Novo workspace').click()
        page.wait_for_selector('.wsd')
        page.locator('#ws-name').fill('Trabalho')
        page.locator('.wsd-folder', has_text='Trabalho').locator('input').check()
        expect(page.locator('.wsd-folder', has_text='Docs').locator('input').is_disabled(), 'subfolder not marked as included')
        shot('10-workspace-dialog')
        page.get_by_role('button', name='Usar este workspace').click()
        page.wait_for_timeout(300)
        expect('Trabalho' in page.locator('.ws-switch').inner_text(), 'switcher label')
        expect(page.locator('.sb-nav .tree-row', has_text='Pessoal').count() == 0, 'Pessoal still in sidebar')
        page.goto(NEWTAB); page.wait_for_selector('.ws-switch')
        page.locator('.search input').fill('banco')
        page.wait_for_timeout(300)
        expect(page.locator('.sr-row .sr-title, .sr-row', has_text='Banco').filter(has_not_text='Pesquisar na web').count() == 0, 'search leaked outside workspace')
        page.locator('.search input').fill('jira')
        page.wait_for_timeout(300)
        expect(page.locator('.sr-row', has_text='Jira').count() >= 1, 'search misses workspace bookmark')
        page.locator('.search input').fill('')
        shot('11-workspace-active')
        page.locator('body').click(position={'x': 700, 'y': 500})
        page.keyboard.press('Alt+0')
        page.wait_for_timeout(300)
        expect('Tudo' in page.locator('.ws-switch').inner_text(), 'Alt+0 did not switch back')

    @step('dark theme + columns layout render')
    def _():
        page.locator('.seg-mini .icon-btn').nth(1).click()
        page.locator('.theme-switch button, .theme-switch').last.click()
        page.wait_for_timeout(300)
        shot('12-dark-columns')

    @step("what's new after updating from 0.1")
    def _():
        # a 0.1 profile: has data but no seenVersion
        page.evaluate("async () => { const { meta } = await chrome.storage.local.get('meta'); delete meta.seenVersion; meta.lastFolder = '1'; await chrome.storage.local.set({ meta }) }")
        page.reload(); page.wait_for_selector('.wl-news')
        expect(page.locator('.wl-news li').count() == 6, 'news list incomplete')
        page.wait_for_timeout(400)  # let the dialog's pop-in animation finish
        shot('13-whats-new')
        page.get_by_role('button', name='Vamos lá').click()
        page.reload(); page.wait_for_selector('.brand'); page.wait_for_timeout(800)
        expect(page.locator('.wl').count() == 0, "what's new shown again")

    ctx.close()
srv.shutdown()

for status, name, info in results:
    print(f'{status:4}  {name}' + (f'\n      {info}' if info else ''))
print('link check:', globals().get('LINK_NOTE', '-'))
# the link check's own 404 requests show up as "Failed to load resource"; anything else is a real error
real = [e for e in errors if 'status of 404' not in e]
print('console errors:', len(real))
for e in real[:15]: print('  ', e[:300])
print('screenshots:', OUT)
failed = sum(1 for r in results if r[0] == 'FAIL')
sys.exit(1 if failed or real else 0)
