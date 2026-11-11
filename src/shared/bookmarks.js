import { shallowRef } from 'vue'
import { isExt } from './util'

/** Full bookmark tree (plain objects, replaced wholesale on every change). */
export const root = shallowRef(null)
export const byId = shallowRef(new Map())

export async function reloadTree() {
  if (!isExt) return
  const [tree] = await chrome.bookmarks.getTree()
  const m = new Map()
  const walk = (n) => {
    m.set(n.id, n)
    n.children?.forEach(walk)
  }
  walk(tree)
  byId.value = m
  root.value = tree
}

let timer
export function watchBookmarkEvents() {
  if (!isExt) return
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(reloadTree, 60)
  }
  for (const ev of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered', 'onImportEnded']) {
    chrome.bookmarks[ev]?.addListener(schedule)
  }
}

export const getNode = (id) => byId.value.get(id)
export const isFolder = (n) => !!n && !n.url

/** Top-level folders (Bookmarks bar, Other bookmarks, Mobile…), hiding empty extra roots. */
export function topFolders() {
  return (root.value?.children || []).filter((n, i) => i < 2 || n.children?.length)
}

export const defaultFolderId = () => topFolders()[0]?.id || '1'

export function allBookmarks() {
  const out = []
  for (const n of byId.value.values()) if (n.url) out.push(n)
  return out
}

export function countBookmarks(n) {
  let c = 0
  for (const ch of n?.children || []) c += ch.url ? 1 : countBookmarks(ch)
  return c
}

/** Path from a top-level folder down to the node (inclusive). */
export function pathTo(id) {
  const p = []
  let n = getNode(id)
  while (n && n.parentId !== undefined) {
    p.unshift(n)
    n = getNode(n.parentId)
  }
  return p
}

export function isDescendant(id, ancestorId) {
  let n = getNode(id)
  while (n) {
    if (n.id === ancestorId) return true
    n = getNode(n.parentId)
  }
  return false
}

export function flattenFolders() {
  const out = []
  const walk = (n, depth) => {
    for (const ch of n.children || []) {
      if (ch.url) continue
      out.push({ id: ch.id, title: ch.title, depth })
      walk(ch, depth + 1)
    }
  }
  if (root.value) walk(root.value, 0)
  return out
}
