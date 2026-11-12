/**
 * When each bookmarked page was last visited.
 *
 * The browser only keeps a few months of history, so Athbee Bookmark copies the last
 * visit of every bookmarked URL into its own storage. Over time this lets it
 * tell a bookmark unused for a year apart from one unused for three months.
 */
import { shallowRef } from 'vue'
import { isExt, normUrl } from './util'
import { allBookmarks } from './bookmarks'

const KEY = 'usage'
const REFRESH_EVERY = 6 * 3600e3

/** { since: ms when tracking started, scannedAt: ms, last: { normUrl: ms } } */
export const usage = shallowRef({ since: Date.now(), scannedAt: 0, last: {} })
/** Oldest point in time the data covers: before it, "no visit" means "unknown". */
export const coverageStart = shallowRef(Date.now())

let loaded = null
function load() {
  loaded ||= (async () => {
    if (!isExt) return
    const { [KEY]: u } = await chrome.storage.local.get(KEY)
    if (u?.last) usage.value = u
  })()
  return loaded
}

/** Merge the browser history into the stored last-visit dates. */
export async function refreshUsage({ force = false } = {}) {
  await load()
  if (!isExt || !chrome.history) return usage.value
  const u = usage.value
  if (!force && Date.now() - u.scannedAt < REFRESH_EVERY) {
    coverageStart.value = u.oldest ?? u.since
    return u
  }

  const bookmarked = new Set(allBookmarks().map((n) => normUrl(n.url)))
  const items = await chrome.history.search({ text: '', startTime: 0, maxResults: 100000 })
  const last = {}
  // keep what we knew about URLs that are still bookmarked
  for (const [k, ts] of Object.entries(u.last)) if (bookmarked.has(k)) last[k] = ts
  let oldest = Date.now()
  for (const it of items) {
    if (!it.url || !it.lastVisitTime) continue
    oldest = Math.min(oldest, it.lastVisitTime)
    const k = normUrl(it.url)
    if (bookmarked.has(k) && it.lastVisitTime > (last[k] || 0)) last[k] = it.lastVisitTime
  }
  // history reaches back to roughly its oldest entry; our own records reach back to `since`
  const next = { since: u.since, scannedAt: Date.now(), oldest: Math.min(u.since, oldest), last }
  usage.value = next
  coverageStart.value = next.oldest
  if (isExt) await chrome.storage.local.set({ [KEY]: next })
  return next
}

/** Fold last-visit dates from a backup into ours, keeping the most recent of each. */
export async function mergeUsage(src) {
  await load()
  if (!src?.last) return
  const u = usage.value
  const last = { ...u.last }
  for (const [k, ts] of Object.entries(src.last)) if (typeof ts === 'number' && ts > (last[k] || 0)) last[k] = ts
  const since = Math.min(u.since, src.since || u.since)
  const next = { ...u, since, oldest: Math.min(u.oldest ?? u.since, src.oldest ?? since), last }
  usage.value = next
  coverageStart.value = next.oldest
  if (isExt) await chrome.storage.local.set({ [KEY]: next })
}

export const lastVisit = (url) => usage.value.last[normUrl(url)] || 0
