export const isExt = typeof chrome !== 'undefined' && !!chrome?.runtime?.id

export function faviconUrl(pageUrl, size = 32) {
  if (!isExt || !pageUrl) return ''
  const u = new URL(chrome.runtime.getURL('/_favicon/'))
  u.searchParams.set('pageUrl', pageUrl)
  u.searchParams.set('size', String(size))
  return u.toString()
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
