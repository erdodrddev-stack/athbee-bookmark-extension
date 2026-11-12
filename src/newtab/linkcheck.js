/**
 * Broken-link checker. Runs from the new tab page and keeps its state here, so
 * closing the dialog doesn't stop a check and reopening it shows the results.
 *
 * Reading a site's HTTP status needs host access, which the extension only
 * asks for (as an optional permission) when the user starts a check.
 */
import { reactive } from 'vue'
import { allBookmarks, getNode, pathTo } from '../shared/bookmarks'
import { removeBookmarks } from './actions'
import { normUrl } from '../shared/util'

const ORIGINS = { origins: ['<all_urls>'] }
const WORKERS = 6
const PER_HOST = 2
const TIMEOUT = 12000

export const check = reactive({
  running: false,
  scopeId: null, // folder id, or null for every bookmark
  total: 0,
  done: 0,
  finishedAt: null,
  results: [], // only the problems: { id, title, url, path, kind, code, finalUrl }
})

let stopFlag = false
const controllers = new Set()

/** Must be called straight from a click: Chrome only grants permissions on a user gesture. */
export function requestAccess() {
  return chrome.permissions.request(ORIGINS)
}

const checkable = (url) => /^https?:/i.test(url || '')

function inScope(n, scopeId) {
  if (!scopeId) return true
  for (let p = getNode(n.parentId); p; p = getNode(p.parentId)) if (p.id === scopeId) return true
  return false
}

export function targets(scopeId) {
  return allBookmarks().filter((n) => checkable(n.url) && inScope(n, scopeId))
}

async function request(url, method) {
  const ctl = new AbortController()
  controllers.add(ctl)
  let timer
  // the race keeps the timeout reliable even if a fetch ignores its abort signal
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { reject(TIMED_OUT); ctl.abort() }, TIMEOUT)
  })
  try {
    const res = await Promise.race([
      fetch(url, { method, redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ctl.signal }),
      timeout,
    ])
    return { status: res.status, finalUrl: res.url || url }
  } finally {
    clearTimeout(timer)
    ctl.abort() // stop downloading the body of GET requests
    controllers.delete(ctl)
  }
}

const TIMED_OUT = new Error('timeout')

const LOGIN = /\/(login|signin|sign-in|sign_in|auth|sso|account\/login|session)s?\b|[?&](continue|returnurl|redirect_uri|next)=/i

/** Same page despite small URL differences (http→https, www, trailing slash, case of host). */
function samePage(a, b) {
  const strip = (u) => {
    try {
      const x = new URL(u)
      x.protocol = 'https:'
      x.hostname = x.hostname.replace(/^www\./, '')
      x.hash = ''
      return normUrl(x.toString()).toLowerCase()
    } catch {
      return u
    }
  }
  return strip(a) === strip(b)
}

/** -> null when fine, otherwise { kind: 'broken' | 'redirect' | 'warn', code, finalUrl } */
export async function probe(url) {
  let r
  try {
    r = await request(url, 'HEAD')
    // many servers refuse or mishandle HEAD: confirm with GET
    if (r.status >= 400) r = await request(url, 'GET')
  } catch (e) {
    if (stopFlag) return null
    if (e === TIMED_OUT) return { kind: 'warn', code: 'timeout' }
    try {
      // some servers drop HEAD requests entirely
      r = await request(url, 'GET')
    } catch (e2) {
      if (stopFlag) return null
      return e2 === TIMED_OUT ? { kind: 'warn', code: 'timeout' } : { kind: 'broken', code: 'offline' }
    }
  }
  const s = r.status
  if (s === 404 || s === 410) return { kind: 'broken', code: s }
  if (s >= 400 && s !== 401) return { kind: 'warn', code: s }
  if (r.finalUrl && !samePage(url, r.finalUrl) && !LOGIN.test(r.finalUrl)) {
    return { kind: 'redirect', code: s, finalUrl: r.finalUrl }
  }
  return null
}

const hostOf = (url) => { try { return new URL(url).hostname } catch { return '' } }

export async function runCheck(scopeId = null) {
  if (check.running) return
  const list = targets(scopeId)
  Object.assign(check, { running: true, scopeId, total: list.length, done: 0, finishedAt: null, results: [] })
  stopFlag = false

  const queue = [...list]
  const busyHosts = new Map()
  const take = () => {
    // next bookmark whose host isn't already being hit by PER_HOST requests
    const i = queue.findIndex((n) => (busyHosts.get(hostOf(n.url)) || 0) < PER_HOST)
    return i < 0 ? (queue.length ? queue.shift() : null) : queue.splice(i, 1)[0]
  }

  async function worker() {
    for (let n = take(); n && !stopFlag; n = take()) {
      const h = hostOf(n.url)
      busyHosts.set(h, (busyHosts.get(h) || 0) + 1)
      try {
        const res = await probe(n.url)
        if (res && !stopFlag) {
          const path = pathTo(n.parentId).map((p) => p.title).filter(Boolean).join(' / ')
          check.results.push({ id: n.id, title: n.title, url: n.url, path, ...res })
        }
      } finally {
        busyHosts.set(h, busyHosts.get(h) - 1)
        check.done++
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(WORKERS, list.length) }, worker))
  check.running = false
  check.finishedAt = stopFlag ? null : Date.now()
}

export function stopCheck() {
  stopFlag = true
  for (const c of controllers) c.abort()
}

export const dismiss = (id) => {
  check.results = check.results.filter((r) => r.id !== id)
}

/** Point redirected bookmarks to where they ended up. */
export async function updateUrls(items) {
  for (const r of items) {
    if (!getNode(r.id)) continue
    await chrome.bookmarks.update(r.id, { url: r.finalUrl })
    dismiss(r.id)
  }
}

/** Delete bookmarks; returns an undo function that brings them (and their results) back. */
export async function removeAll(items) {
  const undo = await removeBookmarks(items.map((r) => r.id))
  items.forEach((r) => dismiss(r.id))
  return async () => {
    const ids = await undo()
    for (const r of items) if (ids.has(r.id)) check.results.push({ ...r, id: ids.get(r.id) })
  }
}
