// Generates the extension PNG icons (no external deps): a rounded purple
// square with a white bookmark ribbon. Same shape as src/components/Logo.vue.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

// Shape in a 100x100 space
const inRoundRect = (x, y, r = 24) => {
  if (x < 0 || y < 0 || x > 100 || y > 100) return false
  const cx = Math.min(Math.max(x, r), 100 - r), cy = Math.min(Math.max(y, r), 100 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
const inRibbon = (x, y) =>
  x >= 33 && x <= 67 && y >= 22 && y <= 80 - 16 * (1 - Math.abs(x - 50) / 17)

const A = [0x8b, 0x5c, 0xf6], B = [0x5b, 0x3c, 0xc4]

for (const size of [16, 32, 48, 128]) {
  const buf = Buffer.alloc(size * size * 4)
  const SS = 4
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let bg = 0, rib = 0
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = ((px + (sx + 0.5) / SS) / size) * 100
      const y = ((py + (sy + 0.5) / SS) / size) * 100
      if (inRoundRect(x, y)) { bg++; if (inRibbon(x, y)) rib++ }
    }
    const n = SS * SS
    const t = (px + py) / (2 * size)
    const grad = A.map((a, i) => a + (B[i] - a) * t)
    const ribF = bg ? rib / bg : 0
    const col = grad.map((g) => Math.round(g + (255 - g) * ribF))
    const o = (py * size + px) * 4
    buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]
    buf[o + 3] = Math.round((bg / n) * 255)
  }
  writeFileSync(`${outDir}icon-${size}.png`, png(size, buf))
}
console.log('icons written to', outDir)
