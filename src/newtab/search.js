import { computed } from 'vue'
import { settings, meta } from '../shared/settings'
import { byId, allBookmarks, pathTo } from '../shared/bookmarks'
import { historyItems, visitsFor } from '../shared/history'
import { allTags, normTag, tagsOf } from '../shared/tags'
import { fold, normUrl } from '../shared/util'
import { ui, go, isSearching } from './ui'
import { isVisible } from './sort'
import { openFromEvent } from './actions'
import { inWorkspace } from '../shared/workspaces'

const visibleWithAncestors = (n) => pathTo(n.id).every(isVisible)

/**
 * Splits the query into tag filters (#tag) and free text.
 * The last #token, while still being typed (no trailing space), matches by prefix
 * and drives the tag suggestions.
 */
export const parsed = computed(() => {
  const raw = ui.query
  const toks = raw.trim().split(/\s+/).filter(Boolean)
  const typing = !/\s$/.test(raw)
  const tags = []
  const text = []
  let partial = null
  toks.forEach((tk, i) => {
    if (tk.startsWith('#')) {
      const name = normTag(tk)
      if (i === toks.length - 1 && typing) partial = name
      else if (name) tags.push(name)
    } else text.push(fold(tk))
  })
  return { tags, text, partial }
})

/** Tags currently filtering results (complete ones + the one being typed, if it matches something). */
export const activeTags = computed(() => {
  const { tags, partial } = parsed.value
  return partial ? [...tags, partial] : tags
})

function hasTags(id, tags, partial) {
  const mine = tagsOf(id)
  if (!tags.every((tg) => mine.includes(tg))) return false
  return !partial || mine.some((tg) => tg.startsWith(partial))
}

/** Advanced search: all / any / none / only (exactly these tags). */
function passesFilter(mine) {
  const { all, any, none, only } = ui.tagFilter
  if (!all.every((tg) => mine.includes(tg))) return false
  if (any.length && !any.some((tg) => mine.includes(tg))) return false
  if (none.some((tg) => mine.includes(tg))) return false
  if (only.length && (mine.length !== only.length || !only.every((tg) => mine.includes(tg)))) return false
  return true
}

/** Bookmark matches the typed query and the advanced filters. */
function bookmarkMatches(b) {
  const { tags, text, partial } = parsed.value
  if ((tags.length || partial !== null) && !hasTags(b.id, tags, partial)) return false
  const mine = tagsOf(b.id)
  if (!passesFilter(mine)) return false
  if (text.length && !text.every((tk) => (fold(b.title) + ' ' + fold(b.url) + ' ' + mine.join(' ')).includes(tk))) return false
  return inWorkspace(b) && visibleWithAncestors(b)
}

/** How many bookmarks match right now (not capped like the result list). */
export const matchCount = computed(() => {
  void byId.value
  void meta.tags
  if (!isSearching()) return 0
  return allBookmarks().filter(bookmarkMatches).length
})

export const results = computed(() => {
  if (!isSearching()) return []
  void byId.value
  void meta.tags
  const { tags, text, partial } = parsed.value
  const tagMode = tags.length > 0 || partial !== null || Object.values(ui.tagFilter).some((l) => l.length)
  const first = text[0] || ''
  const matches = (s) => text.every((tk) => s.includes(tk))

  // Tag suggestions while typing "#..."
  const tagSugg = []
  if (partial !== null) {
    for (const x of allTags.value) {
      if (tags.includes(x.name) || !x.name.includes(partial)) continue
      tagSugg.push({ kind: 'tag', name: x.name, count: x.count, rank: x.name.startsWith(partial) ? 0 : 1 })
    }
    tagSugg.sort((a, b) => a.rank - b.rank || b.count - a.count)
  }

  const folders = []
  if (!tagMode) {
    for (const n of byId.value.values()) {
      if (n.url || !n.parentId || n.parentId === '0') continue
      const ft = fold(n.title)
      if (matches(ft) && inWorkspace(n) && visibleWithAncestors(n)) folders.push({ kind: 'folder', node: n, rank: ft.startsWith(first) ? 0 : 1 })
    }
    folders.sort((a, b) => a.rank - b.rank)
  }

  const bms = []
  const bookmarked = new Set()
  for (const b of allBookmarks()) {
    bookmarked.add(normUrl(b.url))
    if (!bookmarkMatches(b)) continue
    const ft = fold(b.title)
    const myTags = tagsOf(b.id)
    const rank = !first ? 0 : ft.startsWith(first) ? 0 : ft.includes(first) ? 1 : myTags.some((tg) => tg.startsWith(first)) ? 1 : 2
    bms.push({ kind: 'bookmark', node: b, rank, visits: visitsFor(b.url) })
  }
  bms.sort((a, b) => a.rank - b.rank || b.visits - a.visits)

  const hist = []
  if (settings.searchHistory && !tagMode && text.length) {
    const seen = new Set()
    for (const h of historyItems.value) {
      if (hist.length >= 10) break
      const k = normUrl(h.url)
      if (bookmarked.has(k) || seen.has(k)) continue
      if (!matches(fold(h.title) + ' ' + fold(h.url))) continue
      seen.add(k)
      hist.push({ kind: 'history', node: { url: h.url, title: h.title } })
    }
  }

  const web = !tagMode && text.length ? [{ kind: 'web', q: ui.query.trim() }] : []

  return [...tagSugg.slice(0, 8), ...folders.slice(0, 6), ...bms.slice(0, 60), ...hist, ...web].map((r, i) => ({ ...r, i }))
})

/** Replace the tag being typed (or append) with a complete "#tag ". */
export function applyTag(name) {
  const toks = ui.query.replace(/\s+$/, '').split(/\s+/).filter(Boolean)
  if (toks.length && toks[toks.length - 1].startsWith('#') && !/\s$/.test(ui.query)) toks.pop()
  if (!toks.some((tk) => normTag(tk) === name && tk.startsWith('#'))) toks.push('#' + name)
  ui.query = toks.join(' ') + ' '
  ui.focusSearch++
}

/** Remove a tag filter from the query. */
export function removeTag(name) {
  ui.query = ui.query
    .split(/\s+/)
    .filter((tk) => !(tk.startsWith('#') && normTag(tk) === name))
    .join(' ')
    .trim()
  if (ui.query) ui.query += ' '
  ui.focusSearch++
}

export function runResult(r, e) {
  if (!r) return
  if (r.kind === 'tag') return applyTag(r.name)
  if (r.kind === 'folder') return go(r.node.id)
  if (r.kind === 'web') {
    const newTab = e.ctrlKey || e.metaKey || settings.openIn === 'new'
    return chrome.search.query({ text: r.q, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' })
  }
  return openFromEvent(e, r.node.url)
}
