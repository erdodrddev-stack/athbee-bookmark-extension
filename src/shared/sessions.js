/**
 * Tab sessions: a window's tabs saved under a name, to reopen later.
 * Stored in chrome.storage.local and kept in sync across open Athbee Bookmark pages.
 */
import { shallowRef } from 'vue'
import { isExt, hostOf } from './util'

const KEY = 'sessions'

/** [{ id, name, createdAt, updatedAt, tabs: [{ url, title, pinned?, group?: { title, color } }] }], newest first */
export const sessions = shallowRef([])

let loaded = null
export function loadSessions() {
  loaded ||= (async () => {
    if (!isExt) return
    const { [KEY]: list } = await chrome.storage.local.get(KEY)
    sessions.value = Array.isArray(list) ? list : []
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) sessions.value = changes[KEY].newValue || []
    })
  })()
  return loaded
}

async function write(list) {
  sessions.value = list
  if (isExt) await chrome.storage.local.set({ [KEY]: list })
}

/** Replace every session (used by sync). */
export const replaceSessions = (list) => write(Array.isArray(list) ? list : [])

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/** Tabs worth saving: real pages, not this extension or blank new tabs. */
function keep(tab) {
  const url = tab.url || tab.pendingUrl || ''
  if (!url || url === 'about:blank') return false
  if (url.startsWith(chrome.runtime.getURL(''))) return false
  return !/^(chrome|edge|brave):\/\/(newtab|new-tab-page)/.test(url)
}

/** Tabs of a window (the current one by default), with their tab groups. */
export async function captureWindow(windowId) {
  const query = windowId ? { windowId } : { currentWindow: true }
  const tabs = (await chrome.tabs.query(query)).filter(keep)
  const groups = new Map()
  if (chrome.tabGroups) {
    for (const gid of new Set(tabs.map((t) => t.groupId).filter((g) => g >= 0))) {
      try {
        const g = await chrome.tabGroups.get(gid)
        groups.set(gid, { title: g.title || '', color: g.color })
      } catch {}
    }
  }
  return tabs.map((t) => {
    const out = { url: t.url || t.pendingUrl, title: t.title || hostOf(t.url || t.pendingUrl) }
    if (t.pinned) out.pinned = true
    if (groups.has(t.groupId)) out.group = groups.get(t.groupId)
    out._id = t.id // only used to close the tabs after saving; stripped before storing
    return out
  })
}

const strip = (tabs) => tabs.map(({ _id, ...rest }) => rest)

export const defaultName = () =>
  new Date().toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Save the current window as a new session; optionally close the saved tabs (like OneTab). */
export async function saveWindow({ name, close = false, ws = null } = {}) {
  await loadSessions()
  const tabs = await captureWindow()
  if (!tabs.length) return null
  const now = Date.now()
  const s = { id: uid(), name: (name || '').trim() || defaultName(), createdAt: now, updatedAt: now, tabs: strip(tabs) }
  if (ws) s.ws = ws // shown only in that workspace
  await write([s, ...sessions.value])
  if (close) {
    try {
      await chrome.tabs.remove(tabs.map((t) => t._id).filter(Boolean))
    } catch {}
  }
  return s
}

/** Replace a session's tabs with the current window's. */
export async function updateFromWindow(id) {
  const tabs = await captureWindow()
  await write(sessions.value.map((s) => (s.id === id ? { ...s, tabs: strip(tabs), updatedAt: Date.now() } : s)))
}

export async function renameSession(id, name) {
  const n = (name || '').trim()
  if (!n) return
  await write(sessions.value.map((s) => (s.id === id ? { ...s, name: n } : s)))
}

/** Returns an undo function. */
export async function deleteSession(id) {
  const i = sessions.value.findIndex((s) => s.id === id)
  if (i < 0) return () => {}
  const removed = sessions.value[i]
  await write(sessions.value.filter((s) => s.id !== id))
  return async () => {
    const list = [...sessions.value]
    list.splice(Math.min(i, list.length), 0, removed)
    await write(list)
  }
}

export async function removeTab(id, index) {
  await write(sessions.value.map((s) => (s.id === id ? { ...s, tabs: s.tabs.filter((_, i) => i !== index), updatedAt: Date.now() } : s)))
}

/** Merge sessions from a backup, skipping ones already present. */
export async function importSessions(list) {
  await loadSessions()
  if (!Array.isArray(list)) return 0
  const have = new Set(sessions.value.map((s) => s.id))
  const fresh = list.filter((s) => s?.id && Array.isArray(s.tabs) && !have.has(s.id))
  if (fresh.length) await write([...sessions.value, ...fresh].sort((a, b) => b.createdAt - a.createdAt))
  return fresh.length
}

/** Open a session in a new window, or in the current one; restores pinned tabs and tab groups. */
export async function openSession(s, { newWindow = true } = {}) {
  const tabs = s.tabs
  if (!tabs.length) return
  let windowId
  const created = []
  if (newWindow) {
    const win = await chrome.windows.create({ url: tabs[0].url, focused: true })
    windowId = win.id
    created.push(win.tabs[0])
  } else {
    windowId = (await chrome.windows.getCurrent()).id
  }
  for (const tab of tabs.slice(created.length)) {
    try {
      created.push(await chrome.tabs.create({ windowId, url: tab.url, active: false }))
    } catch {
      created.push(null) // some URLs (e.g. chrome://) can't be opened by extensions
    }
  }
  // pinned first, then groups
  for (const [i, tab] of tabs.entries()) {
    if (tab.pinned && created[i]) await chrome.tabs.update(created[i].id, { pinned: true }).catch(() => {})
  }
  if (chrome.tabGroups) {
    const byGroup = new Map()
    for (const [i, tab] of tabs.entries()) {
      if (!tab.group || !created[i] || tab.pinned) continue
      const key = tab.group.title + '\0' + tab.group.color
      if (!byGroup.has(key)) byGroup.set(key, { info: tab.group, ids: [] })
      byGroup.get(key).ids.push(created[i].id)
    }
    for (const { info, ids } of byGroup.values()) {
      try {
        const gid = await chrome.tabs.group({ tabIds: ids, createProperties: { windowId } })
        await chrome.tabGroups.update(gid, { title: info.title, color: info.color })
      } catch {}
    }
  }
  if (!newWindow && created[0]) await chrome.tabs.update(created[0].id, { active: true }).catch(() => {})
}

/** Save a session as a bookmark folder; returns the folder id. */
export async function sessionToFolder(s, parentId) {
  const folder = await chrome.bookmarks.create({ parentId, title: s.name })
  for (const tab of s.tabs) {
    try {
      await chrome.bookmarks.create({ parentId: folder.id, title: tab.title, url: tab.url })
    } catch {}
  }
  return folder.id
}
