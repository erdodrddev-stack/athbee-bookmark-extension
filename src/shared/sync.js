/**
 * Sync (Bookdeck Pro): tags, pinned/hidden items, tag colors, workspaces, sessions and
 * settings travel between computers through chrome.storage.sync, i.e. the user's own
 * Google account. Bookmarks themselves are synced by the browser.
 *
 * Bookmark ids differ on every computer, so the shared copy (a "snapshot") names
 * bookmarks by URL ("u:<url>") and folders by their path ("f:<root index>/<titles>").
 * It is gzipped, base64'd and split into chunks to fit storage.sync's per-item limit.
 *
 * Reconciling is a three-way comparison against the last state both sides agreed on:
 * if only one side changed it wins, if both did they are merged (union).
 *
 * Entries naming a bookmark this computer doesn't have yet (the browser may still be
 * syncing it) are carried along untouched and applied once it shows up.
 */
import { reactive, watch } from 'vue'
import { settings, meta, DEFAULTS, stable } from './settings'
import { sessions, loadSessions, replaceSessions } from './sessions'
import { root, byId } from './bookmarks'
import { license } from './premium'
import { isExt, normUrl, plain } from './util'

const STATE_KEY = 'syncState' // chrome.storage.local, per computer
const HEAD = 'bdsync' // chrome.storage.sync: { hash, n, at }
const CHUNK = 'bdsync_' // chrome.storage.sync: bdsync_0 … bdsync_<n-1>
const CHUNK_SIZE = 7000 // characters, under the 8 KB per-item quota
const MAX_BYTES = 95000 // of the 100 KB total quota, leaving room for the head

/** Settings that only make sense on one computer. */
const LOCAL_SETTINGS = ['sidebarWidth', 'sidebarCollapsed', 'autoBackup', 'autoBackupKeep']

/**
 * enabled: sync is on for this computer
 * base: hash of the shared copy at the last agreement; baseLocal: hash of this computer's
 * snapshot at that moment; pending: keys that couldn't be resolved here at that moment
 */
export const sync = reactive({ enabled: false, base: null, baseLocal: null, pending: [], at: 0, error: null, busy: false })

// ---------- keys ----------

function indexTree() {
  const key = new Map() // id -> key
  const id = new Map() // key -> id (first match wins)
  const roots = (root.value?.children || []).filter((r) => !r.unmodifiable)
  roots.forEach((r, i) => {
    const walk = (n, path) => {
      const k = n.url ? 'u:' + normUrl(n.url) : 'f:' + i + '/' + path.join('/')
      key.set(n.id, k)
      if (!id.has(k)) id.set(k, n.id)
      for (const c of n.children || []) walk(c, c.url ? path : [...path, c.title])
    }
    walk(r, [])
  })
  return { key, id }
}

// ---------- snapshots ----------

function syncedSettings() {
  const out = {}
  for (const k of Object.keys(DEFAULTS)) if (!LOCAL_SETTINGS.includes(k)) out[k] = settings[k]
  return out
}

/** This computer's state as a snapshot. */
function localSnapshot(idx) {
  const tags = {}
  for (const [id, list] of Object.entries(meta.tags)) {
    const k = idx.key.get(id)
    if (k && list?.length) tags[k] = [...list].sort()
  }
  const keys = (ids) => ids.map((id) => idx.key.get(id)).filter(Boolean)
  return {
    v: 1,
    tags,
    pinned: keys(meta.pinned),
    hidden: keys(meta.hidden),
    tagColors: { ...meta.tagColors },
    workspaces: meta.workspaces.map((w) => ({
      id: w.id, name: w.name, accent: w.accent ?? null, look: w.look ?? null, folders: keys(w.folders),
    })),
    sessions: plain(sessions.value),
    settings: plain(syncedSettings()),
  }
}

const unresolved = (k, idx) => !idx.id.has(k)

/** Keep the shared copy's entries for bookmarks/folders this computer doesn't have. */
function carryOver(snap, remote, idx) {
  for (const [k, list] of Object.entries(remote.tags || {})) if (unresolved(k, idx) && !snap.tags[k]) snap.tags[k] = list
  for (const field of ['pinned', 'hidden']) {
    for (const k of remote[field] || []) if (unresolved(k, idx) && !snap[field].includes(k)) snap[field].push(k)
  }
  for (const rw of remote.workspaces || []) {
    const w = snap.workspaces.find((x) => x.id === rw.id)
    if (w) for (const k of rw.folders || []) if (unresolved(k, idx) && !w.folders.includes(k)) w.folders.push(k)
  }
  return snap
}

/** Keys of a snapshot that can't be resolved here. */
function unresolvedKeys(snap, idx) {
  const all = [...Object.keys(snap.tags || {}), ...(snap.pinned || []), ...(snap.hidden || []), ...(snap.workspaces || []).flatMap((w) => w.folders || [])]
  return [...new Set(all.filter((k) => unresolved(k, idx)))]
}

/** Entries waiting for a bookmark that has now arrived: apply them from the shared copy. */
function adoptArrived(remote, idx) {
  const arrived = new Set(sync.pending.filter((k) => idx.id.has(k)))
  if (!arrived.size) return
  for (const k of arrived) {
    const id = idx.id.get(k)
    if (remote.tags?.[k] && !meta.tags[id]?.length) meta.tags[id] = [...remote.tags[k]]
    if (remote.pinned?.includes(k) && !meta.pinned.includes(id)) meta.pinned.push(id)
    if (remote.hidden?.includes(k) && !meta.hidden.includes(id)) meta.hidden.push(id)
  }
  for (const rw of remote.workspaces || []) {
    const w = meta.workspaces.find((x) => x.id === rw.id)
    if (!w) continue
    for (const k of rw.folders || []) if (arrived.has(k) && !w.folders.includes(idx.id.get(k))) w.folders.push(idx.id.get(k))
  }
}

/** Make this computer match a snapshot. */
async function applySnapshot(snap, idx) {
  const ids = (keys) => (keys || []).map((k) => idx.id.get(k)).filter(Boolean)
  const tags = {}
  for (const [k, list] of Object.entries(snap.tags || {})) {
    const id = idx.id.get(k)
    if (id && list?.length) tags[id] = [...list]
  }
  meta.tags = tags
  meta.pinned = ids(snap.pinned)
  meta.hidden = ids(snap.hidden)
  meta.tagColors = { ...(snap.tagColors || {}) }
  meta.workspaces = (snap.workspaces || []).map((w) => ({
    id: w.id, name: w.name || '?', accent: w.accent ?? null, look: w.look ?? null, folders: ids(w.folders),
  }))
  if (meta.activeWs && !meta.workspaces.some((w) => w.id === meta.activeWs)) meta.activeWs = null
  for (const [k, v] of Object.entries(snap.settings || {})) {
    if (k in DEFAULTS && !LOCAL_SETTINGS.includes(k) && typeof v === typeof DEFAULTS[k]) settings[k] = v
  }
  if (stable(snap.sessions || []) !== stable(sessions.value)) await replaceSessions(snap.sessions || [])
}

/** Union of two snapshots; `b` wins where they disagree on a single value. */
function merge(a, b) {
  const tags = { ...a.tags }
  for (const [k, list] of Object.entries(b.tags || {})) tags[k] = [...new Set([...(tags[k] || []), ...list])].sort()
  const union = (x = [], y = []) => [...x, ...y.filter((k) => !x.includes(k))]
  const workspaces = a.workspaces.map((w) => {
    const o = (b.workspaces || []).find((x) => x.id === w.id)
    return o ? { ...o, folders: union(w.folders, o.folders) } : w
  })
  for (const w of b.workspaces || []) if (!workspaces.some((x) => x.id === w.id)) workspaces.push(w)
  const byIdS = new Map(a.sessions.map((s) => [s.id, s]))
  for (const s of b.sessions || []) {
    const mine = byIdS.get(s.id)
    if (!mine || (s.updatedAt || 0) > (mine.updatedAt || 0)) byIdS.set(s.id, s)
  }
  return {
    v: 1,
    tags,
    pinned: union(a.pinned, b.pinned),
    hidden: union(a.hidden, b.hidden),
    tagColors: { ...a.tagColors, ...b.tagColors },
    workspaces,
    sessions: [...byIdS.values()].sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)),
    settings: { ...a.settings, ...b.settings },
  }
}

async function hashOf(snap) {
  const bytes = new TextEncoder().encode(stable(snap))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- storage.sync encoding ----------

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}
function toBase64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function encode(snap) {
  return toBase64(await pipe(new TextEncoder().encode(JSON.stringify(snap)), new CompressionStream('gzip')))
}
export async function decode(text) {
  return JSON.parse(new TextDecoder().decode(await pipe(fromBase64(text), new DecompressionStream('gzip'))))
}

const INCOMPLETE = Symbol('incomplete')

/** The shared copy, null when there is none, or INCOMPLETE while its chunks are still arriving. */
async function readRemote() {
  const { [HEAD]: head } = await chrome.storage.sync.get(HEAD)
  if (!head?.n) return null
  const keys = Array.from({ length: head.n }, (_, i) => CHUNK + i)
  const parts = await chrome.storage.sync.get(keys)
  if (keys.some((k) => typeof parts[k] !== 'string')) return INCOMPLETE
  try {
    const data = await decode(keys.map((k) => parts[k]).join(''))
    return (await hashOf(data)) === head.hash ? { hash: head.hash, data } : INCOMPLETE
  } catch {
    return INCOMPLETE
  }
}

async function writeRemote(snap, hash) {
  const text = await encode(snap)
  if (text.length > MAX_BYTES) throw Object.assign(new Error('too big'), { code: 'syncTooBig' })
  const n = Math.ceil(text.length / CHUNK_SIZE)
  const items = { [HEAD]: { hash, n, at: Date.now() } }
  for (let i = 0; i < n; i++) items[CHUNK + i] = text.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  const { [HEAD]: old } = await chrome.storage.sync.get(HEAD)
  await chrome.storage.sync.set(items)
  const stale = Array.from({ length: Math.max(0, (old?.n || 0) - n) }, (_, i) => CHUNK + (n + i))
  if (stale.length) await chrome.storage.sync.remove(stale)
}

// ---------- state ----------

async function loadState() {
  const { [STATE_KEY]: s } = await chrome.storage.local.get(STATE_KEY)
  Object.assign(sync, { enabled: false, base: null, baseLocal: null, pending: [], at: 0, error: null }, s || {})
}
function saveState() {
  const { enabled, base, baseLocal, pending, at, error } = sync
  return chrome.storage.local.set({ [STATE_KEY]: plain({ enabled, base, baseLocal, pending, at, error }) })
}

// ---------- reconcile ----------

let applying = false // our own writes to meta/settings shouldn't schedule another round

async function reconcileNow() {
  await loadState() // another tab may have moved things along
  if (!sync.enabled || !license.pro || !root.value) return
  sync.busy = true
  applying = true
  try {
    const remote = await readRemote()
    if (remote === INCOMPLETE) {
      schedule(5000) // try again once the rest has arrived
      return
    }
    let idx = indexTree()
    if (remote) adoptArrived(remote.data, idx)
    const mine = localSnapshot(idx)
    if (remote) carryOver(mine, remote.data, idx)
    const mineHash = await hashOf(mine)

    let agreed // the snapshot both sides hold afterwards
    if (!remote) {
      await writeRemote(mine, mineHash)
      agreed = { hash: mineHash, snap: mine }
    } else if (remote.hash === mineHash) {
      agreed = { hash: mineHash, snap: mine }
    } else {
      const localChanged = mineHash !== sync.baseLocal
      const remoteChanged = remote.hash !== sync.base
      if (!localChanged) {
        await applySnapshot(remote.data, idx)
        agreed = { hash: remote.hash, snap: remote.data }
      } else if (!remoteChanged) {
        await writeRemote(mine, mineHash)
        agreed = { hash: mineHash, snap: mine }
      } else {
        const merged = merge(mine, remote.data)
        const h = await hashOf(merged)
        await applySnapshot(merged, idx)
        await writeRemote(merged, h)
        agreed = { hash: h, snap: merged }
      }
    }
    // what this computer's snapshot looks like now that it matches the agreed one
    idx = indexTree()
    const after = carryOver(localSnapshot(idx), agreed.snap, idx)
    Object.assign(sync, {
      base: agreed.hash,
      baseLocal: await hashOf(after),
      pending: unresolvedKeys(agreed.snap, idx),
      at: Date.now(),
      error: null,
    })
  } catch (e) {
    sync.error = e?.code || 'syncFailed'
  } finally {
    await saveState()
    sync.busy = false
    setTimeout(() => (applying = false), 600) // past the settings/meta write debounce
  }
}

/** One round at a time, across every open Bookdeck page. */
export function reconcile() {
  if (!isExt) return Promise.resolve()
  return navigator.locks.request('bookdeck-sync', reconcileNow)
}

let timer
function schedule(ms) {
  clearTimeout(timer)
  timer = setTimeout(reconcile, ms)
}

/** Start syncing on this page: run once, then on local and remote changes. */
export async function startSync() {
  if (!isExt) return
  await loadState()
  await loadSessions()
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[HEAD]) schedule(800)
    if (area === 'local' && changes[STATE_KEY]) {
      const s = changes[STATE_KEY].newValue
      if (s) Object.assign(sync, s)
    }
  })
  watch(
    () => [meta.tags, meta.pinned, meta.hidden, meta.tagColors, meta.workspaces, sessions.value, syncedSettings()],
    () => { if (sync.enabled && !applying) schedule(3000) },
    { deep: true },
  )
  // bookmarks arriving from the browser's own sync may resolve pending entries
  watch(byId, () => { if (sync.enabled && sync.pending.length) schedule(1500) })
  watch(() => license.pro, (pro) => { if (pro && sync.enabled) schedule(500) })
  if (sync.enabled) await reconcile()
}

export async function setSyncEnabled(on) {
  await loadState()
  // turning it on (again) starts from scratch: what's here and what's shared are merged
  Object.assign(sync, { enabled: on, base: null, baseLocal: null, pending: [], error: null })
  await saveState()
  if (on) await reconcile()
}
