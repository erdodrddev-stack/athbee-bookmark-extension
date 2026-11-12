/**
 * Athbee Bookmark Pro: who has it and what the free plan is limited to.
 *
 * The license lives in chrome.storage.local under its own key, so it's never part of
 * a backup and a backup can't unlock Pro. Buying and checking it goes through
 * ExtensionPay in the service worker (src/background.js), which writes the result there;
 * keeping it locally means Pro keeps working offline. Unpacked (developer) installs can
 * also switch Pro on to test.
 */
import { computed, reactive } from 'vue'
import { isExt } from './util'

const KEY = 'license'

/** { pro, source: 'dev' | 'extpay' | null, since: ms | null, email?, checkedAt? } */
const EMPTY = { pro: false, source: null, since: null, email: null, checkedAt: 0 }
export const license = reactive({ ...EMPTY })
export const isPro = computed(() => license.pro)

/** What the free plan allows. */
export const LIMITS = { workspaces: 2, sessions: 3 }
export const FREE_LOOKS = ['modern']
export const lookAllowed = (look) => license.pro || FREE_LOOKS.includes(look)

/** Every paid feature, in the order the upgrade dialog lists them. */
export const PRO_FEATURES = ['sync', 'autoBackup', 'workspaces', 'sessions', 'looks', 'accentCustom', 'wsTheme', 'advSearch', 'stale', 'linkAll', 'bulkFix']

/** Store installs carry an update_url; unpacked ones don't. */
export const devInstall = isExt && !('update_url' in chrome.runtime.getManifest())

async function ask(type) {
  const r = await chrome.runtime.sendMessage({ type })
  if (!r?.ok) throw new Error(r?.error || 'no answer')
  return r
}

/** Payment pages (ExtensionPay), opened by the service worker. */
export const checkout = isExt
  ? {
      open: () => ask('pro:pay'), // buy
      login: () => ask('pro:login'), // "I already paid": email link, on another computer too
    }
  : null

const RECHECK = 12 * 3600e3

/** Ask ExtensionPay whether this install has paid (throttled unless forced). Never throws. */
export async function refreshLicense({ force = false } = {}) {
  if (!isExt || (!force && Date.now() - (license.checkedAt || 0) < RECHECK)) return
  try {
    await ask('pro:check')
  } catch {
    // offline or ExtensionPay down: keep the last known state
  }
}

let loading = null
export function loadLicense() {
  if (!isExt) return Promise.resolve()
  return (loading ??= (async () => {
    const { [KEY]: saved } = await chrome.storage.local.get(KEY)
    if (saved) Object.assign(license, saved)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) Object.assign(license, EMPTY, changes[KEY].newValue)
    })
  })())
}

async function store(next) {
  Object.assign(license, next)
  if (isExt) await chrome.storage.local.set({ [KEY]: { ...license } })
}

/** Developer installs only: turn Pro on or off to try the paid features. */
export function setDevPro(on) {
  if (!devInstall || license.source === 'extpay') return // never touch a real purchase
  return store(on ? { ...EMPTY, pro: true, source: 'dev', since: Date.now() } : { ...EMPTY })
}
