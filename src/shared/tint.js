// Picks a representative color from a favicon so each card gets a soft tint.
const KEY = 'bd-tints'
let cache = new Map()
try {
  cache = new Map(Object.entries(JSON.parse(localStorage.getItem(KEY) || '{}')))
} catch {}

let saveTimer
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cache)))
    } catch {}
  }, 500)
}

export const tintFor = (host) => cache.get(host) || null

const NEUTRAL = '140, 146, 160'

export function extractTint(img, host) {
  if (cache.has(host)) return cache.get(host)
  let result = NEUTRAL
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, 16, 16)
    const d = ctx.getImageData(0, 0, 16, 16).data
    let r = 0, g = 0, b = 0, w = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue
      const max = Math.max(d[i], d[i + 1], d[i + 2])
      const min = Math.min(d[i], d[i + 1], d[i + 2])
      const sat = max ? (max - min) / max : 0
      const wt = sat * sat + 0.015
      r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt
    }
    if (w > 0.6) result = `${Math.round(r / w)}, ${Math.round(g / w)}, ${Math.round(b / w)}`
  } catch {}
  cache.set(host, result)
  persist()
  return result
}
