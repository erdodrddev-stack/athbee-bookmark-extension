import { computed } from 'vue'
import { meta } from './settings'
import { collator } from './util'

/** "#Meu Projeto " -> "meu-projeto" */
export const normTag = (s) =>
  (s || '').trim().replace(/^#+/, '').replace(/[\s,]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

export const tagsOf = (id) => (id && meta.tags[id]) || []

export function setTags(id, list) {
  const clean = [...new Set((list || []).map(normTag).filter(Boolean))]
  if (clean.length) meta.tags[id] = clean
  else delete meta.tags[id]
}

/** [{ name, count }] sorted by name */
export const allTags = computed(() => {
  const counts = new Map()
  for (const list of Object.values(meta.tags)) {
    for (const tg of list) counts.set(tg, (counts.get(tg) || 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => collator.compare(a.name, b.name))
})

export function renameTag(from, to) {
  to = normTag(to)
  if (!to || to === from) return
  for (const [id, list] of Object.entries(meta.tags)) {
    if (list.includes(from)) setTags(id, list.map((tg) => (tg === from ? to : tg)))
  }
}

export function deleteTag(name) {
  for (const [id, list] of Object.entries(meta.tags)) {
    if (list.includes(name)) setTags(id, list.filter((tg) => tg !== name))
  }
}

/** Stable hue per tag name, used for the colored pills. */
export function tagHue(name) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h % 360
}

/** Drop tags of bookmarks that no longer exist (or became folders). */
export function pruneTags(getNode) {
  for (const id of Object.keys(meta.tags)) {
    const n = getNode(id)
    if (!n || !n.url) delete meta.tags[id]
  }
}
