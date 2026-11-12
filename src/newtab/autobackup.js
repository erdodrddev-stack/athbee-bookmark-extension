/**
 * Automatic backups (Bookdeck Pro): when a new tab opens and the last one is older than
 * a day or a week, a backup file goes to Downloads/Bookdeck/, keeping only the newest N.
 * Bookdeck is the new tab page, so it opens often enough without a background worker.
 */
import { reactive } from 'vue'
import { settings } from '../shared/settings'
import { license } from '../shared/premium'
import { buildBackup } from '../shared/backup'
import { isExt } from '../shared/util'

const KEY = 'autoBackupState'
const EVERY = { daily: 86400e3, weekly: 7 * 86400e3 }
const FOLDER = 'Bookdeck'
const FILE_RE = '(^|[\\\\/])bookdeck-auto-[^\\\\/]*\\.json$'

/** { lastRun: ms, downloadId, error: i18n key | null } */
export const autoBackup = reactive({ lastRun: 0, downloadId: null, error: null, running: false })

async function load() {
  const { [KEY]: s } = await chrome.storage.local.get(KEY)
  Object.assign(autoBackup, { lastRun: 0, downloadId: null, error: null }, s || {})
}
const save = () => {
  const { lastRun, downloadId, error } = autoBackup
  return chrome.storage.local.set({ [KEY]: { lastRun, downloadId, error } })
}

const stamp = (d) => d.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')

function finished(id) {
  return new Promise((resolve) => {
    const done = (state) => {
      chrome.downloads.onChanged.removeListener(onChange)
      clearTimeout(timer)
      resolve(state)
    }
    const onChange = (d) => {
      if (d.id === id && d.state && d.state.current !== 'in_progress') done(d.state.current)
    }
    const timer = setTimeout(() => done('timeout'), 60000)
    chrome.downloads.onChanged.addListener(onChange)
    chrome.downloads.search({ id }).then(([d]) => { if (d && d.state !== 'in_progress') done(d.state) })
  })
}

/** Delete the oldest automatic backups beyond the number to keep. */
async function prune() {
  const items = await chrome.downloads.search({ filenameRegex: FILE_RE, state: 'complete', exists: true, orderBy: ['-startTime'] })
  for (const d of items.slice(Math.max(1, settings.autoBackupKeep))) {
    await chrome.downloads.removeFile(d.id).catch(() => {})
    await chrome.downloads.erase({ id: d.id }).catch(() => {})
  }
}

/** Write a backup file now (also the "Back up now" button). */
export async function runAutoBackup() {
  if (!isExt || autoBackup.running) return
  autoBackup.running = true
  let url
  try {
    const data = await buildBackup()
    url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    // no download bubble for a file the user didn't ask for just now
    await chrome.downloads.setUiOptions?.({ enabled: false }).catch(() => {})
    const id = await chrome.downloads.download({
      url,
      filename: `${FOLDER}/bookdeck-auto-${stamp(new Date())}.json`,
      conflictAction: 'uniquify',
      saveAs: false,
    })
    const state = await finished(id)
    if (state !== 'complete') throw new Error(state)
    Object.assign(autoBackup, { lastRun: Date.now(), downloadId: id, error: null })
    await prune()
  } catch {
    // remember the attempt, so a failing backup isn't retried on every new tab
    Object.assign(autoBackup, { lastRun: Date.now(), error: 'autoBackupFailed' })
  } finally {
    await chrome.downloads.setUiOptions?.({ enabled: true }).catch(() => {})
    if (url) URL.revokeObjectURL(url)
    autoBackup.running = false
    await save()
  }
}

/** Run when due. Only one open page does it, thanks to the lock. */
export async function maybeAutoBackup() {
  if (!isExt) return
  await load()
  const every = EVERY[settings.autoBackup]
  if (!license.pro || !every) return
  await navigator.locks.request('bookdeck-auto-backup', { ifAvailable: true }, async (lock) => {
    if (!lock) return
    await load() // another page may have just done it
    if (Date.now() - autoBackup.lastRun >= every) await runAutoBackup()
  })
}

export async function loadAutoBackup() {
  if (isExt) await load()
}

/** Reveal the latest file in the system's file manager. */
export function showLatest() {
  if (autoBackup.downloadId != null) chrome.downloads.show(autoBackup.downloadId)
}
