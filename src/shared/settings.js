import { reactive, watch } from 'vue'
import { isExt, plain } from './util'
import { license, loadLicense, lookAllowed, FREE_LOOKS } from './premium'

export const ACCENTS = [
  { id: 'yellow', hex: '#f6c324' },
  { id: 'orange', hex: '#ff7a45' },
  { id: 'pink', hex: '#ff8fd1' },
  { id: 'green', hex: '#8fdc6a' },
  { id: 'blue', hex: '#74b9ff' },
]

export const LOOKS = ['brutal', 'modern', 'cyber']

export const DEFAULTS = {
  lang: 'auto',
  openIn: 'current', // 'current' | 'new'
  autoOpenLast: true,
  showRecommendations: true,
  searchHistory: true,
  hideEmpty: false,
  showHidden: false,
  theme: 'system', // 'system' | 'light' | 'dark'
  accent: 'yellow', // one of ACCENTS[].id
  look: 'modern', // one of LOOKS (brutal and cyber are Pro)
  style: 'card', // 'card' | 'compact' | 'icon'
  layout: 'grid', // 'grid' | 'columns'
  width: 240,
  fontSize: 14,
  disableAnimations: false,
  sidebarWidth: 260,
  sidebarCollapsed: false,
  sortBy: 'default', // 'default' | 'alpha' | 'date' | 'freq'
  sortDir: 'asc',
}

const META_DEFAULTS = {
  pinned: [],
  hidden: [],
  lastFolder: null,
  expanded: {},
  historyOpen: true,
  tags: {}, // bookmarkId -> ['tag', ...]
  tagColors: {}, // tag -> '#rrggbb' chosen by the user
  tagsOpen: true,
  dupIgnored: [], // duplicate groups (dupKey) the user chose to keep
  workspaces: [], // see shared/workspaces.js
  activeWs: null, // id of the active workspace, null = everything
  seenVersion: null, // last version whose welcome / what's new was shown
}

export const settings = reactive({ ...DEFAULTS })
export const meta = reactive(plain(META_DEFAULTS))

const stores = { settings, meta }

/** JSON with sorted keys: chrome.storage hands objects back with keys reordered. */
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
  }
  return JSON.stringify(v)
}

const lastSynced = {} // key -> stable JSON of what storage holds as far as we know
const pending = { settings: new Set(), meta: new Set() } // our own writes not yet echoed back
const timers = {}

function writeNow(key) {
  clearTimeout(timers[key])
  const value = plain(stores[key])
  const s = stable(value)
  if (s === lastSynced[key]) return Promise.resolve()
  lastSynced[key] = s
  pending[key].add(s)
  return chrome.storage.local.set({ [key]: value })
}

function scheduleWrite(key) {
  clearTimeout(timers[key])
  timers[key] = setTimeout(() => writeNow(key), 250)
}

/** Write any pending changes right away (e.g. before the popup closes). */
export function flushPersist() {
  if (!isExt) return Promise.resolve()
  return Promise.all(Object.keys(stores).map(writeNow))
}

export async function loadPersisted() {
  await loadLicense()
  if (isExt) {
    const data = await chrome.storage.local.get(['settings', 'meta'])
    Object.assign(settings, data.settings || {})
    Object.assign(meta, data.meta || {})
    for (const key of Object.keys(stores)) lastSynced[key] = stable(plain(stores[key]))

    // Keep other open tabs (and the popup) in sync, ignoring echoes of our own writes.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return
      for (const key of Object.keys(stores)) {
        const nv = changes[key]?.newValue
        if (!nv) continue
        const s = stable(nv)
        if (pending[key].delete(s)) continue // our own write coming back
        if (s === lastSynced[key]) continue
        lastSynced[key] = s
        Object.assign(stores[key], nv)
      }
    })
  }
  for (const key of Object.keys(stores)) {
    watch(stores[key], () => {
      if (isExt) scheduleWrite(key)
    }, { deep: true })
  }
}

export function applyTheme() {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const update = () => {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.classList.toggle('light', !dark)
    root.classList.toggle('no-anim', settings.disableAnimations)
    // the active workspace may override the accent color and the look
    const ws = license.pro ? meta.workspaces.find((w) => w.id === meta.activeWs) : null
    const accentId = ws?.accent || settings.accent
    const look = ws?.look || settings.look
    const accent = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0]
    root.style.setProperty('--accent', accent.hex)
    // paid looks fall back to the free one without Pro (the choice is kept for later)
    root.dataset.look = LOOKS.includes(look) && lookAllowed(look) ? look : FREE_LOOKS[0]
  }
  watch(
    () => [settings.theme, settings.accent, settings.look, settings.disableAnimations, meta.activeWs, meta.workspaces.map((w) => [w.accent, w.look]), license.pro],
    update,
    { immediate: true, deep: true },
  )
  mq.addEventListener('change', update)
}
