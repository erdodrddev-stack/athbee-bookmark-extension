"""
Extension icons from the logo art (assets/logo-source.jpeg): the bookmark with the bee,
without the "ATHBEE BOOKMARKS" text and with a transparent background.

    npm run icons      (uses the same Chromium-based browser as the e2e tests)

The background is removed by flood fill from the crop's edges, so only background
connected to the outside goes transparent (the bee's dark stripes stay). Edges get a
soft alpha ramp, with the old background color taken back out of their pixels.
Output: public/icons/icon-{16,32,48,128}.png, logo-256.png and logo-512.png.
"""
import base64, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'logo-source.jpeg')
OUT = os.path.join(ROOT, 'public', 'icons')
CANDIDATES = ['/opt/brave.com/brave/brave', '/usr/bin/brave-browser', '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser']
EXE = os.environ.get('ATHBEE_BROWSER') or next((c for c in CANDIDATES if os.path.exists(c)), None)

CROP = (592, 70, 904, 534)  # x0, y0, x1, y1: the bookmark and bee, above the text
SIZES = {'icon-16': 16, 'icon-32': 32, 'icon-48': 48, 'icon-128': 128, 'logo-256': 256, 'logo-512': 512}

JS = """async ({ src, crop, sizes }) => {
  const img = new Image(); img.src = src; await img.decode()
  const [x0, y0, x1, y1] = crop, W = x1 - x0, H = y1 - y0
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d')
  g.drawImage(img, -x0, -y0)
  const data = g.getImageData(0, 0, W, H), d = data.data
  const bg = [d[0], d[1], d[2]]
  const dist = (i) => Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2])
  const LOW = 18, HIGH = 55 // below LOW: background; above HIGH: artwork

  // flood fill the background from every edge pixel
  const seen = new Uint8Array(W * H), stack = []
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x)
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1)
  while (stack.length) {
    const p = stack.pop()
    if (seen[p] || dist(p * 4) > HIGH) continue
    seen[p] = 1
    const x = p % W, y = (p - x) / W
    if (x > 0) stack.push(p - 1)
    if (x < W - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - W)
    if (y < H - 1) stack.push(p + W)
  }
  for (let p = 0; p < W * H; p++) {
    if (!seen[p]) continue
    const i = p * 4, a = Math.max(0, Math.min(1, (dist(i) - LOW) / (HIGH - LOW)))
    d[i + 3] = Math.round(a * 255)
    if (a > 0 && a < 1) for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - bg[k] * (1 - a)) / a))
  }
  g.putImageData(data, 0, 0)

  // trim to the visible artwork and center it on a square
  let tx0 = W, ty0 = H, tx1 = 0, ty1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) {
    tx0 = Math.min(tx0, x); ty0 = Math.min(ty0, y); tx1 = Math.max(tx1, x); ty1 = Math.max(ty1, y)
  }
  const tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1, side = Math.max(tw, th)
  const sq = new OffscreenCanvas(side, side)
  sq.getContext('2d').drawImage(c, tx0, ty0, tw, th, Math.round((side - tw) / 2), Math.round((side - th) / 2), tw, th)

  // downscale in halving steps for clean small sizes
  const out = {}
  for (const [name, size] of Object.entries(sizes)) {
    let cur = sq
    while (cur.width / 2 > size) {
      const half = new OffscreenCanvas(Math.round(cur.width / 2), Math.round(cur.height / 2))
      const hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high'
      hg.drawImage(cur, 0, 0, half.width, half.height); cur = half
    }
    const fin = new OffscreenCanvas(size, size), fg = fin.getContext('2d')
    fg.imageSmoothingQuality = 'high'; fg.drawImage(cur, 0, 0, size, size)
    const blob = await fin.convertToBlob({ type: 'image/png' })
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    out[name] = btoa(s)
  }
  return { out, trimmed: [tw, th], background: bg }
}"""

src = 'data:image/jpeg;base64,' + base64.b64encode(open(SRC, 'rb').read()).decode()
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EXE)
    page = browser.new_page()
    r = page.evaluate(JS, {'src': src, 'crop': list(CROP), 'sizes': SIZES})
    browser.close()
for name, b64 in r['out'].items():
    open(os.path.join(OUT, name + '.png'), 'wb').write(base64.b64decode(b64))
print('artwork', r['trimmed'], 'background', r['background'], '->', ', '.join(SIZES))
