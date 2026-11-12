export const isExt = typeof chrome !== 'undefined' && !!chrome?.runtime?.id

export function faviconUrl(pageUrl, size = 32) {
  if (!isExt || !pageUrl) return ''
  const u = new URL(chrome.runtime.getURL('/_favicon/'))
  u.searchParams.set('pageUrl', pageUrl)
  u.searchParams.set('size', String(size))
  return u.toString()
}

/** A very short label for icon-only tiles: the first segment of the title
 *  ("Inbox – Gmail" → "Inbox"), or the bare site name ("github.com" → "github"). */
export function shortLabel(title, url) {
  const first = (title || '').split(/\s+[-|–—·:•]\s+/)[0].trim()
  if (first) return first
  const host = hostOf(url)
  return host.split('.').length > 1 ? host.split('.').slice(-2)[0] : host
}

export function hostOf(url) {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') || u.protocol.replace(':', '')
  } catch {
    return url || ''
  }
}

export function normUrl(url) {
  try {
    const u = new URL(url)
    u.hash = ''
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s
  } catch {
    return url || ''
  }
}

/** lowercase + strip accents, for search */
export const fold = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export const plain = (o) => JSON.parse(JSON.stringify(o))

/** "#abc" / "aabbcc" -> "#aabbcc", or null when it isn't a hex color. */
export function normHex(s) {
  let h = (s || '').trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(h)) h = h.replace(/./g, (c) => c + c)
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null
}

/** Dark or light text, whichever reads better on the given background. */
export function readableOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return lum > 0.22 ? '#191919' : '#fffff0'
}
