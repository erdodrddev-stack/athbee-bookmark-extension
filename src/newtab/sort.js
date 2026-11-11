import { settings, meta } from '../shared/settings'
import { visitsFor } from '../shared/history'
import { countBookmarks } from '../shared/bookmarks'
import { collator } from '../shared/util'

export const isVisible = (n) => settings.showHidden || !meta.hidden.includes(n.id)

function freq(n) {
  if (n.url) return visitsFor(n.url)
  let s = 0
  for (const ch of n.children || []) s += freq(ch)
  return s
}

const COMPARE = {
  alpha: (a, b) => collator.compare(a.title || '', b.title || ''),
  date: (a, b) => (a.dateAdded || 0) - (b.dateAdded || 0),
  freq: (a, b) => freq(a) - freq(b) || collator.compare(a.title || '', b.title || ''),
}

/** Visible children in the chosen order, pinned ones first. */
export function sortNodes(list) {
  let arr = (list || []).filter(isVisible)
  const cmp = COMPARE[settings.sortBy]
  if (cmp) {
    arr = [...arr].sort(cmp)
    if (settings.sortDir === 'desc') arr.reverse()
  }
  if (!meta.pinned.length) return arr
  const pinned = arr.filter((n) => meta.pinned.includes(n.id))
  return pinned.length ? [...pinned, ...arr.filter((n) => !meta.pinned.includes(n.id))] : arr
}

export const showFolder = (f) => !settings.hideEmpty || countBookmarks(f) > 0

/** Split a folder's children into bookmarks and (visible) sub-folders. */
export function splitChildren(folder) {
  const items = sortNodes(folder?.children)
  return {
    bookmarks: items.filter((n) => n.url),
    folders: items.filter((n) => !n.url && showFolder(n)),
  }
}
