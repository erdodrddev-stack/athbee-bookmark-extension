/** Bookmarks that haven't been opened in a long time. */
import { meta } from '../shared/settings'
import { allBookmarks, getNode, pathTo } from '../shared/bookmarks'
import { lastVisit } from '../shared/usage'

export const PERIODS = [90, 180, 365] // days

/**
 * -> { cutoff, limited, items: [{ node, path, last }] }, least recently used first.
 * `limited` means the data doesn't reach back as far as asked, so the list is
 * really "not opened since `cutoff`" for a later cutoff than requested.
 */
export function findStale(days, coverageStart, now = Date.now()) {
  const asked = now - days * 864e5
  const cutoff = Math.max(asked, coverageStart)
  const items = []
  for (const n of allBookmarks()) {
    if (!/^https?:/i.test(n.url)) continue
    if (meta.pinned.includes(n.id) || meta.hidden.includes(n.id)) continue
    if ((n.dateAdded || 0) >= cutoff) continue // saved after the cutoff: too new to judge
    const last = lastVisit(n.url)
    if (last >= cutoff) continue
    items.push({ node: n, path: pathTo(n.parentId).map((p) => p.title).filter(Boolean).join(' / '), last })
  }
  items.sort((a, b) => a.last - b.last || (a.node.dateAdded || 0) - (b.node.dateAdded || 0))
  return { cutoff, limited: cutoff > asked + 864e5, items }
}

/** Move bookmarks into a folder; returns an undo function that puts them back. */
export async function moveAll(ids, parentId) {
  const snaps = ids
    .map((id) => getNode(id))
    .filter(Boolean)
    .map((n) => ({ id: n.id, parentId: n.parentId, index: n.index }))
  for (const s of snaps) await chrome.bookmarks.move(s.id, { parentId })
  return async () => {
    // lowest index first, so each one lands back in its original slot
    for (const s of [...snaps].sort((a, b) => a.index - b.index)) {
      await chrome.bookmarks.move(s.id, { parentId: s.parentId, index: s.index })
    }
  }
}

export function hideAll(ids) {
  const added = ids.filter((id) => !meta.hidden.includes(id))
  meta.hidden.push(...added)
  return () => {
    for (const id of added) {
      const i = meta.hidden.indexOf(id)
      if (i >= 0) meta.hidden.splice(i, 1)
    }
  }
}
