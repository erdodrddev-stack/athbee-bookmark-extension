import { shallowRef } from 'vue'
import { isExt, normUrl } from './util'

/** Raw history items (most recent first) and a normalized-url → stats map. */
export const historyItems = shallowRef([])
export const visitMap = shallowRef(new Map())

export async function loadHistory() {
  if (!isExt || !chrome.history) return
  const items = await chrome.history.search({
    text: '',
    startTime: Date.now() - 90 * 864e5,
    maxResults: 5000,
  })
  const m = new Map()
  for (const it of items) {
    if (!it.url) continue
    const k = normUrl(it.url)
    const prev = m.get(k)
    if (prev) {
      prev.visitCount += it.visitCount || 0
      prev.typedCount += it.typedCount || 0
      prev.lastVisitTime = Math.max(prev.lastVisitTime, it.lastVisitTime || 0)
    } else {
      m.set(k, {
        url: it.url,
        title: it.title,
        visitCount: it.visitCount || 0,
        typedCount: it.typedCount || 0,
        lastVisitTime: it.lastVisitTime || 0,
      })
    }
  }
  historyItems.value = items
  visitMap.value = m
}

export const visitsFor = (url) => visitMap.value.get(normUrl(url))?.visitCount || 0

/** Frequency weighted by recency (a week-ish half life). */
export function score(h) {
  const days = (Date.now() - h.lastVisitTime) / 864e5
  return (h.visitCount + 2 * h.typedCount) / (1 + days / 7)
}
