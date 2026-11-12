/**
 * Bookdeck Pro: who has it and what the free plan is limited to.
 *
 * The license lives in chrome.storage.local under its own key, so it's never part of
 * a backup and a backup can't unlock Pro. How a license is bought and verified is
 * left to `checkout` below, to be wired to a payment provider (ExtensionPay,
 * Lemon Squeezy…). Until then, unpacked (developer) installs can switch Pro on to test.
 */
import { computed, reactive } from 'vue'
import { isExt } from './util'

const KEY = 'license'

/** { pro, source: 'dev' | provider name | null, since: ms | null } */
export const license = reactive({ pro: false, source: null, since: null })
export const isPro = computed(() => license.pro)

/** What the free plan allows. */
export const LIMITS = { workspaces: 2, sessions: 3 }
export const FREE_LOOKS = ['modern']
export const lookAllowed = (look) => license.pro || FREE_LOOKS.includes(look)

/** Every paid feature, in the order the upgrade dialog lists them. */
export const PRO_FEATURES = ['sync', 'autoBackup', 'workspaces', 'sessions', 'looks', 'accentCustom', 'wsTheme', 'advSearch', 'stale', 'linkAll', 'bulkFix']

/** Store installs carry an update_url; unpacked ones don't. */
export const devInstall = isExt && !('update_url' in chrome.runtime.getManifest())

/** Payment provider hook. Null until one is wired up; the UI shows "coming soon". */
export const checkout = null // { open: () => Promise<void> }

let loading = null
export function loadLicense() {
  if (!isExt) return Promise.resolve()
  return (loading ??= (async () => {
    const { [KEY]: saved } = await chrome.storage.local.get(KEY)
    if (saved) Object.assign(license, saved)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]) Object.assign(license, { pro: false, source: null, since: null }, changes[KEY].newValue)
    })
  })())
}

async function store(next) {
  Object.assign(license, next)
  if (isExt) await chrome.storage.local.set({ [KEY]: { ...license } })
}

/** Developer installs only: turn Pro on or off to try the paid features. */
export function setDevPro(on) {
  if (!devInstall) return
  return store(on ? { pro: true, source: 'dev', since: Date.now() } : { pro: false, source: null, since: null })
}
