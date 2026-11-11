/**
 * Backup file: the bookmark tree with Bookdeck's own data (tags, pinned, hidden)
 * attached to each node, plus tag colors and settings.
 *
 * Bookmark ids are local to one browser profile, so nothing in the file refers
 * to them: on import, folders are matched by path and bookmarks by URL.
 */
import { settings, meta, DEFAULTS, flushPersist } from './settings'
import { setTags, normHex } from './tags'
import { normUrl, plain } from './util'
import { reloadTree } from './bookmarks'

export const BACKUP_APP = 'bookdeck'
export const BACKUP_VERSION = 1

function nodeMeta(id) {
  const m = {}
  const tags = meta.tags[id]
  if (tags?.length) m.tags = [...tags]
  if (meta.pinned.includes(id)) m.pinned = true
  if (meta.hidden.includes(id)) m.hidden = true
  return m
}

function exportNode(n) {
  const out = { title: n.title || '' }
  if (n.url) out.url = n.url
  if (n.dateAdded) out.dateAdded = n.dateAdded
  Object.assign(out, nodeMeta(n.id))
  if (!n.url) out.children = (n.children || []).filter((c) => !c.unmodifiable).map(exportNode)
  return out
}

export async function buildBackup() {
  await flushPersist()
  const [tree] = await chrome.bookmarks.getTree()
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    // top-level roots (bar, other, mobile) are matched by position on import
    roots: (tree.children || []).filter((r) => !r.unmodifiable).map(exportNode),
    tagColors: { ...meta.tagColors },
    settings: plain(settings),
  }
}

export async function downloadBackup() {
  const data = await buildBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bookdeck-backup-${data.exportedAt.slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return summarize(data)
}

/** Counts shown before importing. */
export function summarize(data) {
  const s = { bookmarks: 0, folders: 0, tagged: 0, pinned: 0, hidden: 0, tags: new Set() }
  const walk = (n) => {
    if (n.url) s.bookmarks++
    else s.folders++
    if (n.tags?.length) { s.tagged++; n.tags.forEach((tg) => s.tags.add(tg)) }
    if (n.pinned) s.pinned++
    if (n.hidden) s.hidden++
    n.children?.forEach(walk)
  }
  data.roots.forEach((r) => r.children?.forEach(walk))
  return { ...s, tags: s.tags.size, exportedAt: data.exportedAt, hasSettings: !!data.settings }
}

/** Throws an Error with `code` ('invalid' | 'newer') when the file can't be used. */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw Object.assign(new Error('not json'), { code: 'invalid' })
  }
  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.roots)) {
    throw Object.assign(new Error('not a backup'), { code: 'invalid' })
  }
  if (data.version > BACKUP_VERSION) throw Object.assign(new Error('newer version'), { code: 'newer' })
  return data
}

/**
 * Merge a backup into the current profile. Never deletes or moves anything.
 * opts: { bookmarks: create missing folders/bookmarks,
 *         meta: restore tags, pinned, hidden and tag colors,
 *         settings: restore settings }
 */
export async function importBackup(data, opts) {
  const stats = { created: 0, matched: 0, unmatched: 0 }
  const [tree] = await chrome.bookmarks.getTree()

  // Fallback when bookmarks aren't being created: find a bookmark by URL anywhere.
  const byUrl = new Map()
  const index = (n) => {
    if (n.url) { const k = normUrl(n.url); if (!byUrl.has(k)) byUrl.set(k, n.id) }
    n.children?.forEach(index)
  }
  index(tree)

  // Applied only once every bookmark exists in the reloaded tree, otherwise the
  // automatic cleanup of tags on unknown ids could drop them mid-import.
  const toApply = []
  const applyMeta = (id, src) => {
    if (opts.meta) toApply.push([id, src])
  }
  const applyNow = (id, src) => {
    if (src.tags?.length) setTags(id, [...(meta.tags[id] || []), ...src.tags])
    if (src.pinned && !meta.pinned.includes(id)) meta.pinned.push(id)
    if (src.hidden && !meta.hidden.includes(id)) meta.hidden.push(id)
  }

  /** existing: live children of the matched folder, or null when it has no match */
  async function mergeChildren(parentId, existing, srcChildren) {
    const used = new Set()
    for (const src of srcChildren || []) {
      if (src.url) {
        const key = normUrl(src.url)
        let hit = existing?.find((c) => c.url && !used.has(c.id) && normUrl(c.url) === key)
        if (!hit && !opts.bookmarks) {
          const id = byUrl.get(key)
          hit = id && { id }
        }
        if (hit) {
          used.add(hit.id)
          stats.matched++
          applyMeta(hit.id, src)
        } else if (opts.bookmarks && parentId) {
          const made = await chrome.bookmarks.create({ parentId, title: src.title, url: src.url })
          stats.created++
          applyMeta(made.id, src)
        } else {
          stats.unmatched++
        }
      } else {
        let hit = existing?.find((c) => !c.url && !used.has(c.id) && c.title === src.title)
        if (!hit && opts.bookmarks && parentId) {
          hit = await chrome.bookmarks.create({ parentId, title: src.title })
          hit.children = []
          stats.created++
        }
        if (hit) {
          used.add(hit.id)
          applyMeta(hit.id, src)
        }
        await mergeChildren(hit?.id || null, hit?.children || null, src.children)
      }
    }
  }

  const liveRoots = (tree.children || []).filter((r) => !r.unmodifiable)
  for (const [i, src] of data.roots.entries()) {
    const live = liveRoots[i] || liveRoots[1] || liveRoots[0] // unknown extra roots go to "Other bookmarks"
    if (!live) continue
    applyMeta(live.id, src)
    await mergeChildren(live.id, live.children || [], src.children)
  }

  await reloadTree()
  for (const [id, src] of toApply) applyNow(id, src)

  if (opts.meta && data.tagColors) {
    for (const [name, hex] of Object.entries(data.tagColors)) {
      const c = normHex(hex)
      if (c) meta.tagColors[name] = c
    }
  }

  if (opts.settings && data.settings) {
    for (const k of Object.keys(DEFAULTS)) {
      if (k in data.settings && typeof data.settings[k] === typeof DEFAULTS[k]) settings[k] = data.settings[k]
    }
  }

  await flushPersist()
  return stats
}
