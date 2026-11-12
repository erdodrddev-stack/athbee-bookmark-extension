"""
Builds the privacy policy pages from docs/privacy-policy.md (English, then "---", then Portuguese):

  - docs/privacy-policy.html: standalone page, both languages (keeps its own <head> and styles)
  - <site>/privacy.html: the site's page, one language at a time, when the site repo is given

    python3 scripts/privacy-pages.py [../bookdeck-site]

Only the Markdown subset the policy uses is supported: # and ## headings, paragraphs,
"- " lists, **bold**, _italic_ / *italic*, `code`, and bare https:// links and emails.
"""
import html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = os.path.join(ROOT, 'docs', 'privacy-policy.md')
DOC_HTML = os.path.join(ROOT, 'docs', 'privacy-policy.html')
SOURCE = 'https://github.com/erdodrddev-stack/athbee-bookmark-extension'
EMAIL = 'eduardorosa.drd@gmail.com'


def inline(t, emails=False):
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])_(.+?)_(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'(?<![*\w])\*(?!\*)(.+?)\*(?!\*)', r'<em>\1</em>', t)
    t = re.sub(r'(https://[^\s<]+?)([.,]?)(?=\s|$)', r'<a href="\1">\1</a>\2', t)
    if emails:
        t = re.sub(r'([\w.+-]+@[\w-]+\.[\w.]+?)([.,]?)(?=\s|$|<)', r'<a href="mailto:\1">\1</a>\2', t)
    return t


def convert(text, emails=False):
    out, in_list = [], False
    for line in text.splitlines():
        if line.startswith('- '):
            if not in_list:
                out.append('<ul>')
                in_list = True
            out.append(f'<li>{inline(line[2:], emails)}</li>')
            continue
        if in_list:
            out.append('</ul>')
            in_list = False
        if not line.strip():
            continue
        if line.startswith('# '):
            out.append(f'<h1>{inline(line[2:], emails)}</h1>')
        elif line.startswith('## '):
            out.append(f'<h2>{inline(line[3:], emails)}</h2>')
        elif line.strip() == '---':
            out.append('<hr>')
        else:
            out.append(f'<p>{inline(line, emails)}</p>')
    if in_list:
        out.append('</ul>')
    return '\n'.join(out)


def doc_page(md):
    old = open(DOC_HTML).read()
    head = old[:old.index('<main>') + len('<main>')]
    tail = old[old.index('</main>'):]
    open(DOC_HTML, 'w').write(head + '\n' + convert(md) + '\n' + tail)


def site_page(md, site):
    en, pt = md.split('\n---\n')
    page = f'''<!doctype html>
<html lang="en" data-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Athbee Bookmark – Privacy policy</title>
<link rel="icon" href="img/icon-128.png">
<link rel="stylesheet" href="style.css">
<script src="lang.js"></script>
</head>
<body>
<header class="wrap top">
  <a class="brand" href="./"><img src="img/icon-128.png" alt="">Athbee Bookmark</a>
  <nav class="nav">
    <a href="./#pricing"><span lang="en">Pricing</span><span lang="pt">Preços</span></a>
    <span class="lang"><button data-set-lang="en">EN</button><button data-set-lang="pt">PT</button></span>
  </nav>
</header>
<main class="wrap">
<article class="doc" lang="en">
{convert(en, emails=True)}
</article>
<article class="doc" lang="pt">
{convert(pt, emails=True)}
</article>
</main>
<footer>
  <div class="wrap">
    <span>© 2026 Athbee Bookmark</span>
    <nav>
      <a href="./">Athbee Bookmark</a>
      <a href="terms.html"><span lang="en">Terms &amp; refunds</span><span lang="pt">Termos e reembolso</span></a>
      <a href="{SOURCE}"><span lang="en">Source code</span><span lang="pt">Código-fonte</span></a>
      <a href="mailto:{EMAIL}">{EMAIL}</a>
    </nav>
  </div>
</footer>
</body>
</html>
'''
    open(os.path.join(site, 'privacy.html'), 'w').write(page)


md = open(MD).read()
doc_page(md)
print('wrote', os.path.relpath(DOC_HTML, ROOT))
if len(sys.argv) > 1:
    site_page(md, sys.argv[1])
    print('wrote', os.path.join(sys.argv[1], 'privacy.html'))
