/**
 * Workspaces: named views ("Work", "Personal"…) that show only some bookmark
 * folders, with their own accent color and look. They only filter what is
 * shown; bookmarks stay where they are. No active workspace = show everything.
 */
import { computed } from 'vue'
import { meta } from './settings'
import { byId, getNode } from './bookmarks'

/** meta.workspaces: [{ id, name, folders: [folderId], accent: null | id, look: null | id }] */
export const activeWs = computed(() => meta.workspaces.find((w) => w.id === meta.activeWs) || null)

const folderSet = computed(() => new Set(activeWs.value?.folders || []))

/** Is the node inside one of the active workspace's folders (or is no workspace active)? */
export function inWorkspace(n) {
  if (!activeWs.value) return true
  const set = folderSet.value
  for (let x = n; x; x = getNode(x.parentId)) if (set.has(x.id)) return true
  return false
}

/** Folders listed at the top of the sidebar and on the home page, or null for "everything". */
export const wsFolders = computed(() => {
  void byId.value
  return activeWs.value ? activeWs.value.folders.map(getNode).filter((n) => n && !n.url) : null
})

export function switchWorkspace(id) {
  meta.activeWs = meta.workspaces.some((w) => w.id === id) ? id : null
}

/** id by keyboard position: 0 = everything, 1..9 = workspaces in order */
export function switchByIndex(i) {
  if (i === 0) return switchWorkspace(null)
  const w = meta.workspaces[i - 1]
  if (w) switchWorkspace(w.id)
}

const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

export function createWorkspace(name, folders = []) {
  const w = { id: uid(), name: name.trim() || '?', folders: [...folders], accent: null, look: null }
  meta.workspaces.push(w)
  return w
}

/** Returns an undo function. */
export function deleteWorkspace(id) {
  const i = meta.workspaces.findIndex((w) => w.id === id)
  if (i < 0) return () => {}
  const [w] = meta.workspaces.splice(i, 1)
  const wasActive = meta.activeWs === id
  if (wasActive) meta.activeWs = null
  return () => {
    meta.workspaces.splice(i, 0, w)
    if (wasActive) meta.activeWs = id
  }
}

/** Forget folders that no longer exist. */
export function pruneWorkspaces() {
  for (const w of meta.workspaces) {
    const alive = w.folders.filter((id) => getNode(id))
    if (alive.length !== w.folders.length) w.folders = alive
  }
}

// ----- backup: folder ids are per-profile, so workspaces travel with folder paths -----

/** folder id -> { root: index of the top-level root, path: [titles below it] } */
function pathOf(id, roots) {
  const titles = []
  let n = getNode(id)
  while (n && n.parentId && n.parentId !== '0') {
    titles.unshift(n.title)
    n = getNode(n.parentId)
  }
  const root = roots.findIndex((r) => r.id === n?.id)
  return root < 0 ? null : { root, path: titles }
}

export function exportWorkspaces(roots) {
  return meta.workspaces.map((w) => ({
    ...w,
    folders: undefined,
    folderPaths: w.folders.map((id) => pathOf(id, roots)).filter(Boolean),
  }))
}

/** Adds workspaces not already present; folders are found by path in the live tree. */
export function importWorkspaces(list, roots) {
  if (!Array.isArray(list)) return 0
  const resolve = ({ root, path }) => {
    let n = roots[root]
    for (const title of path || []) {
      n = (n?.children || []).find((c) => !c.url && c.title === title)
      if (!n) return null
    }
    return n?.id || null
  }
  let added = 0
  for (const w of list) {
    if (!w?.id || meta.workspaces.some((x) => x.id === w.id)) continue
    const folders = (w.folderPaths || []).map(resolve).filter(Boolean)
    meta.workspaces.push({ id: w.id, name: w.name || '?', folders, accent: w.accent ?? null, look: w.look ?? null })
    added++
  }
  return added
}
