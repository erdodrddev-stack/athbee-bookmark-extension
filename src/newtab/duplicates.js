/**
 * Duplicate bookmarks: the same page saved more than once, even when the URLs
 * differ in ways that don't change the page (http/https, www, trailing slash,
 * tracking parameters, parameter order, #anchors).
 */
import { computed } from 'vue'
import { meta } from '../shared/settings'
import { allBookmarks, pathTo } from '../shared/bookmarks'
import { tagsOf, setTags } from '../shared/tags'
import { removeBookmarks } from './actions'

const TRACKING = /^(utm_\w+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|mc_cid|mc_eid|igshid|_hsenc|_hsmi|_ga|_gl|ref_src|spm|si)$/i

/** Key that two URLs share when they point to the same page. */
export function dupKey(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return url || ''
  }
  if (!/^https?:$/.test(u.protocol)) return url
  const host = u.hostname.toLowerCase().replace(/^www\./, '') + (u.port ? ':' + u.port : '')
  const path = u.pathname.replace(/\/+$/, '') || ''
  const params = [...u.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const query = params.length ? '?' + new URLSearchParams(params) : ''
  // "#/route" and "#!/route" are app routes, other #fragments are just anchors
  const hash = /^#!?\//.test(u.hash) ? u.hash : ''
  return host + path + query + hash
}

/** Which copy to keep by default: the one carrying the most of the user's work, then the oldest. */
function rank(n) {
  return (meta.pinned.includes(n.id) ? 100 : 0) + tagsOf(n.id).length * 10 - (meta.hidden.includes(n.id) ? 50 : 0)
}

/** [{ key, items: [{ node, path }] }] with the suggested keeper first */
export const duplicateGroups = computed(() => {
  const byKey = new Map()
  for (const n of allBookmarks()) {
    const k = dupKey(n.url)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(n)
  }
  const ignored = new Set(meta.dupIgnored)
  const groups = []
  for (const [key, nodes] of byKey) {
    if (nodes.length < 2 || ignored.has(key)) continue
    nodes.sort((a, b) => rank(b) - rank(a) || (a.dateAdded || 0) - (b.dateAdded || 0))
    groups.push({
      key,
      items: nodes.map((node) => ({
        node,
        path: pathTo(node.parentId).map((p) => p.title).filter(Boolean).join(' / '),
      })),
    })
  }
  return groups.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key))
})

export const extraCopies = computed(() => duplicateGroups.value.reduce((s, g) => s + g.items.length - 1, 0))

export function ignoreGroup(key) {
  if (!meta.dupIgnored.includes(key)) meta.dupIgnored.push(key)
}
export function clearIgnored() {
  meta.dupIgnored.splice(0)
}

/**
 * Keep one bookmark per group and delete the rest. The keeper inherits the
 * other copies' tags and pinned state. Returns an undo function.
 * choices: [{ keepId, removeIds }]
 */
export async function resolve(choices) {
  const before = choices.map((c) => ({
    keepId: c.keepId,
    tags: [...tagsOf(c.keepId)],
    pinned: meta.pinned.includes(c.keepId),
  }))
  for (const c of choices) {
    const tags = [...tagsOf(c.keepId), ...c.removeIds.flatMap((id) => tagsOf(id))]
    setTags(c.keepId, tags)
    if (c.removeIds.some((id) => meta.pinned.includes(id)) && !meta.pinned.includes(c.keepId)) meta.pinned.push(c.keepId)
  }
  const undoRemove = await removeBookmarks(choices.flatMap((c) => c.removeIds))
  return async () => {
    await undoRemove()
    for (const b of before) {
      setTags(b.keepId, b.tags)
      const i = meta.pinned.indexOf(b.keepId)
      if (!b.pinned && i >= 0) meta.pinned.splice(i, 1)
    }
  }
}
