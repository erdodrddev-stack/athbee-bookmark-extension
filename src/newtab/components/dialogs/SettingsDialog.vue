<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import Logo from '../../../components/Logo.vue'
import Toggle from '../../../components/Toggle.vue'
import Segmented from '../../../components/Segmented.vue'
import PreviewPicker from '../../../components/PreviewPicker.vue'
import { settings, ACCENTS, LOOKS, accentHex as hexOf } from '../../../shared/settings'
import { activeWs } from '../../../shared/workspaces'
import { t } from '../../../shared/i18n'
import { isExt, normHex } from '../../../shared/util'
import { downloadBackup, parseBackup, summarize, importBackup } from '../../../shared/backup'
import { toast, openDialog } from '../../ui'
import { isPro, license, lookAllowed, FREE_LOOKS } from '../../../shared/premium'
import { requirePro } from '../../pro'
import ProBadge from '../../../components/ProBadge.vue'
import { sync, setSyncEnabled } from '../../../shared/sync'
import { autoBackup, loadAutoBackup, runAutoBackup, showLatest } from '../../autobackup'

const props = defineProps({ tab: { type: String, default: 'general' } })
const emit = defineEmits(['close'])
const tab = ref(props.tab)
const version = isExt ? chrome.runtime.getManifest().version : 'dev'
const isMac = navigator.platform.toLowerCase().includes('mac')
const mod = isMac ? '⌘' : 'Ctrl'
// each option previews itself: looks drawn in the current color, colors in the current look
const accentHex = computed(() => hexOf(accent.value))
// the custom color shows as itself in its preview even before Pro is on
const customHex = computed(() => normHex(settings.customAccent) || DEFAULT_CUSTOM)
const lookOptions = computed(() =>
  LOOKS.map((l) => ({ value: l, label: t('look_' + l), pro: !FREE_LOOKS.includes(l), look: l, accent: accentHex.value })),
)
const accentOptions = computed(() => [
  ...ACCENTS.map((a) => ({ value: a.id, label: t('accent_' + a.id), look: look.value, accent: a.hex })),
  { value: 'custom', label: t('accentCustom'), look: look.value, accent: customHex.value, pro: true },
])
const DEFAULT_CUSTOM = '#8b5cf6'
const customInput = ref(settings.customAccent)
function setCustom(v) {
  customInput.value = v
  const hex = normHex(v)
  if (hex) settings.customAccent = hex
}
// previews follow the theme in effect (the "system" one included)
const mq = matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(mq.matches)
const onScheme = (e) => (systemDark.value = e.matches)
mq.addEventListener('change', onScheme)
onBeforeUnmount(() => mq.removeEventListener('change', onScheme))
const dark = computed(() => settings.theme === 'dark' || (settings.theme === 'system' && systemDark.value))
// The active workspace's own accent / look (a Pro feature) win over the global ones, so these
// pickers show and edit whatever is in effect: the workspace's value if it has one, else the global.
const wsAccent = computed(
  () => isPro.value && !!activeWs.value?.accent && (activeWs.value.accent === 'custom' || ACCENTS.some((a) => a.id === activeWs.value.accent)),
)
const wsLook = computed(() => isPro.value && !!activeWs.value?.look && LOOKS.includes(activeWs.value.look))
const accent = computed({
  get: () => {
    const a = wsAccent.value ? activeWs.value.accent : settings.accent
    return a === 'custom' && !isPro.value ? ACCENTS[0].id : a
  },
  set: (v) => {
    if (v === 'custom' && !requirePro('accentCustom', { type: 'settings', props: { tab: 'appearance' } })) return
    if (wsAccent.value) activeWs.value.accent = v
    else settings.accent = v
  },
})
const look = computed({
  get: () => {
    const l = wsLook.value ? activeWs.value.look : settings.look
    return lookAllowed(l) ? l : FREE_LOOKS[0]
  },
  set: (v) => {
    if (!lookAllowed(v) && !requirePro('looks', { type: 'settings', props: { tab: 'appearance' } })) return
    if (wsLook.value) activeWs.value.look = v
    else settings.look = v
  },
})

// ----- sync and automatic backups (Pro) -----
const backBackup = { type: 'settings', props: { tab: 'backup' } }
const syncOn = computed({
  get: () => isPro.value && sync.enabled,
  set: (on) => {
    if (on && !requirePro('sync', backBackup)) return
    setSyncEnabled(on)
  },
})
const syncHint = computed(() => {
  if (!syncOn.value) return t('syncHint')
  if (sync.error) return t(sync.error)
  if (sync.busy || !sync.at) return t('syncRunning')
  return t('syncLast', { date: new Date(sync.at).toLocaleString() })
})
loadAutoBackup()
const autoMode = computed({
  get: () => (isPro.value ? settings.autoBackup : 'off'),
  set: (v) => {
    if (v !== 'off' && !requirePro('autoBackup', backBackup)) return
    settings.autoBackup = v
    // the first one right away, so the user sees where it goes
    if (v !== 'off' && !autoBackup.lastRun) runAutoBackup()
  },
})
const autoOptions = computed(() => [
  { value: 'off', label: t('autoBackupOff') },
  { value: 'daily', label: t('autoBackupDaily') },
  { value: 'weekly', label: t('autoBackupWeekly') },
])

// ----- backup -----
const fileInput = ref(null)
const pending = ref(null) // { data, sum, name }
const opts = reactive({ bookmarks: true, meta: true, settings: true, sessions: true })
const busy = ref(false)
const result = ref(null)
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '')

async function onExport() {
  busy.value = true
  try {
    const s = await downloadBackup()
    toast(t('exportDone', { n: s.bookmarks }))
  } catch {
    toast(t('exportFailed'))
  } finally {
    busy.value = false
  }
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  result.value = null
  try {
    const data = parseBackup(await file.text())
    pending.value = { data, sum: summarize(data), name: file.name }
    opts.settings = !!data.settings
  } catch (err) {
    pending.value = null
    toast(t(err.code === 'newer' ? 'importNewer' : 'importInvalid'))
  }
}

async function onImport() {
  busy.value = true
  try {
    result.value = await importBackup(pending.value.data, { ...opts })
    pending.value = null
  } catch {
    toast(t('importFailed'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Modal :title="t('settings')" width="720px" @close="emit('close')">
    <div class="settings">
      <nav class="st-tabs">
        <button :class="{ on: tab === 'general' }" @click="tab = 'general'"><Icon name="sliders" :size="16" /> {{ t('general') }}</button>
        <button :class="{ on: tab === 'appearance' }" @click="tab = 'appearance'"><Icon name="palette" :size="16" /> {{ t('appearance') }}</button>
        <button :class="{ on: tab === 'backup' }" @click="tab = 'backup'"><Icon name="archive" :size="16" /> {{ t('backup') }}</button>
        <button :class="{ on: tab === 'about' }" @click="tab = 'about'"><Icon name="info" :size="16" /> {{ t('about') }}</button>
      </nav>

      <div class="st-panel">
        <template v-if="tab === 'general'">
          <div class="st-row">
            <span class="st-label">{{ t('language') }}</span>
            <select v-model="settings.lang" class="input select st-select">
              <option value="auto">{{ t('auto') }}</option>
              <option value="pt">Português (Brasil)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div class="st-row">
            <span class="st-label">{{ t('openBookmarksIn') }}</span>
            <Segmented
              v-model="settings.openIn"
              :options="[{ value: 'current', label: t('currentTab') }, { value: 'new', label: t('newTabOpt') }]"
            />
          </div>
          <div class="st-row"><span class="st-label">{{ t('autoOpenLast') }}</span><Toggle v-model="settings.autoOpenLast" /></div>
          <div class="st-row"><span class="st-label">{{ t('showRecs') }}</span><Toggle v-model="settings.showRecommendations" /></div>
          <div class="st-row"><span class="st-label">{{ t('searchHistory') }}</span><Toggle v-model="settings.searchHistory" /></div>
          <div class="st-row"><span class="st-label">{{ t('hideEmpty') }}</span><Toggle v-model="settings.hideEmpty" /></div>
          <div class="st-row"><span class="st-label">{{ t('showHidden') }}</span><Toggle v-model="settings.showHidden" /></div>
        </template>

        <template v-else-if="tab === 'appearance'">
          <div class="st-row">
            <span class="st-label">{{ t('theme') }}</span>
            <Segmented
              v-model="settings.theme"
              :options="[
                { value: 'system', label: t('system'), icon: 'monitor' },
                { value: 'light', label: t('light'), icon: 'sun' },
                { value: 'dark', label: t('dark'), icon: 'moon' },
              ]"
            />
          </div>
          <div class="st-row st-stack">
            <span>
              <span class="st-label">{{ t('look') }}</span>
              <span v-if="wsLook" class="st-hint">{{ t('wsOwnSetting', { name: activeWs.name }) }}</span>
            </span>
            <PreviewPicker v-model="look" :options="lookOptions" :dark="dark" :label="t('look')" />
          </div>
          <div class="st-row st-stack">
            <span>
              <span class="st-label">{{ t('accentColor') }}</span>
              <span v-if="wsAccent" class="st-hint">{{ t('wsOwnSetting', { name: activeWs.name }) }}</span>
            </span>
            <PreviewPicker v-model="accent" :options="accentOptions" :dark="dark" :label="t('accentColor')" />
            <div v-if="accent === 'custom'" class="tc-pick st-custom">
              <input
                type="color"
                class="tc-native"
                :value="customHex"
                :aria-label="t('accentCustom')"
                @input="setCustom($event.target.value)"
              />
              <input
                class="input tc-hex"
                :class="{ invalid: !normHex(customInput) }"
                :value="customInput"
                :aria-label="t('tagColorHex')"
                maxlength="7"
                spellcheck="false"
                autocomplete="off"
                @input="setCustom($event.target.value)"
              />
            </div>
          </div>
          <div class="st-row">
            <span class="st-label">{{ t('style') }}</span>
            <Segmented v-model="settings.style" :options="[{ value: 'card', label: t('card') }, { value: 'compact', label: t('compact') }, { value: 'icon', label: t('iconOnly') }]" />
          </div>
          <div class="st-row">
            <span class="st-label">{{ t('layout') }}</span>
            <Segmented
              v-model="settings.layout"
              :options="[{ value: 'grid', label: t('grid'), icon: 'grid' }, { value: 'columns', label: t('columns'), icon: 'columns' }]"
            />
          </div>
          <div class="st-row">
            <span class="st-label">{{ t('width') }}</span>
            <span class="st-range">
              <input v-model.number="settings.width" type="range" min="160" max="380" step="10" />
              <output>{{ settings.width }}px</output>
            </span>
          </div>
          <div class="st-row">
            <span>
              <span class="st-label">{{ t('fontSize') }}</span>
              <span class="st-hint">{{ t('fontSizeHint') }}</span>
            </span>
            <span class="st-range">
              <input v-model.number="settings.fontSize" type="range" min="12" max="18" step="1" />
              <output>{{ settings.fontSize }}px</output>
            </span>
          </div>
          <div class="st-row"><span class="st-label">{{ t('disableAnimations') }}</span><Toggle v-model="settings.disableAnimations" /></div>
        </template>

        <template v-else-if="tab === 'backup'">
          <div class="st-row">
            <span>
              <span class="st-label">{{ t('syncTitle') }} <ProBadge /></span>
              <span class="st-hint" :class="{ 'st-error': syncOn && sync.error }">{{ syncHint }}</span>
            </span>
            <Toggle v-model="syncOn" :aria-label="t('syncTitle')" />
          </div>
          <div class="st-row">
            <span>
              <span class="st-label">{{ t('autoBackupTitle') }} <ProBadge /></span>
              <span v-if="autoMode !== 'off' && autoBackup.error" class="st-hint st-error">{{ t(autoBackup.error) }}</span>
              <span v-else-if="autoMode !== 'off' && autoBackup.lastRun" class="st-hint">
                {{ t('autoBackupLast', { date: new Date(autoBackup.lastRun).toLocaleString() }) }}
                <button class="link-btn" @click="showLatest">{{ t('autoBackupShow') }}</button>
              </span>
              <span v-else class="st-hint">{{ t('autoBackupHint') }}</span>
            </span>
            <Segmented v-model="autoMode" :options="autoOptions" />
          </div>
          <div v-if="autoMode !== 'off'" class="st-row">
            <span class="st-label">{{ t('autoBackupKeep') }}</span>
            <span class="st-inline">
              <select v-model.number="settings.autoBackupKeep" class="input select st-select-sm">
                <option v-for="n in [5, 10, 30]" :key="n" :value="n">{{ t('autoBackupKeepN', { n }) }}</option>
              </select>
              <button class="btn" :disabled="autoBackup.running" @click="runAutoBackup">
                <Icon name="download" :size="16" /> {{ autoBackup.running ? t('autoBackupRunning') : t('autoBackupNow') }}
              </button>
            </span>
          </div>
          <div class="st-row">
            <span>
              <span class="st-label">{{ t('exportTitle') }}</span>
              <span class="st-hint">{{ t('exportHint') }}</span>
            </span>
            <button class="btn" :disabled="busy" @click="onExport"><Icon name="download" :size="16" /> {{ t('exportBtn') }}</button>
          </div>
          <div class="st-row">
            <span>
              <span class="st-label">{{ t('importTitle') }}</span>
              <span class="st-hint">{{ t('importHint') }}</span>
            </span>
            <button class="btn" :disabled="busy" @click="fileInput.click()"><Icon name="upload" :size="16" /> {{ t('importChoose') }}</button>
            <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile" />
          </div>

          <div v-if="pending" class="bk-box">
            <div class="bk-file">{{ pending.name }}</div>
            <div class="st-hint">{{ t('importFrom', { date: fmtDate(pending.sum.exportedAt) }) }}</div>
            <ul class="bk-sum">
              <li><b>{{ pending.sum.bookmarks }}</b> {{ t('bkBookmarks') }}</li>
              <li><b>{{ pending.sum.folders }}</b> {{ t('bkFolders') }}</li>
              <li><b>{{ pending.sum.tags }}</b> {{ t('bkTags') }}</li>
              <li><b>{{ pending.sum.pinned + pending.sum.hidden }}</b> {{ t('bkPinnedHidden') }}</li>
              <li v-if="pending.sum.sessions"><b>{{ pending.sum.sessions }}</b> {{ t('bkSessions') }}</li>
            </ul>
            <label class="bk-opt">
              <span><span class="st-label">{{ t('bkOptBookmarks') }}</span><span class="st-hint">{{ t('bkOptBookmarksHint') }}</span></span>
              <Toggle v-model="opts.bookmarks" />
            </label>
            <label class="bk-opt">
              <span><span class="st-label">{{ t('bkOptMeta') }}</span><span class="st-hint">{{ t('bkOptMetaHint') }}</span></span>
              <Toggle v-model="opts.meta" />
            </label>
            <label v-if="pending.sum.sessions" class="bk-opt">
              <span><span class="st-label">{{ t('sessions') }}</span><span class="st-hint">{{ t('bkOptSessionsHint') }}</span></span>
              <Toggle v-model="opts.sessions" />
            </label>
            <label v-if="pending.sum.hasSettings" class="bk-opt">
              <span><span class="st-label">{{ t('bkOptSettings') }}</span><span class="st-hint">{{ t('bkOptSettingsHint') }}</span></span>
              <Toggle v-model="opts.settings" />
            </label>
            <div class="bk-actions">
              <button class="btn btn-ghost" :disabled="busy" @click="pending = null">{{ t('cancel') }}</button>
              <button class="btn btn-primary" :disabled="busy || !(opts.bookmarks || opts.meta || opts.settings || (opts.sessions && pending.sum.sessions))" @click="onImport">
                {{ busy ? t('importing') : t('importBtn') }}
              </button>
            </div>
          </div>

          <div v-if="result" class="bk-box bk-done">
            <Icon name="check" :size="18" />
            <span>{{ t('importDone', { created: result.created, matched: result.matched }) }}<template v-if="result.unmatched"> {{ t('importUnmatched', { n: result.unmatched }) }}</template></span>
          </div>
        </template>

        <div v-else class="st-about">
          <Logo :size="56" />
          <div class="st-about-name">Bookdeck</div>
          <div class="st-hint">{{ t('version', { v: version }) }}</div>
          <button class="pro-plan" @click="openDialog('upgrade', { back: { type: 'settings', props: { tab: 'about' } } })">
            <span class="st-label">{{ t('proPlan') }}: {{ isPro ? t('proPlanPro') : t('proPlanFree') }}</span>
            <span v-if="license.source === 'dev'" class="st-hint">dev</span>
            <span class="link-btn">{{ t('proSeeBenefits') }}</span>
          </button>
          <p>{{ t('aboutText') }}</p>
          <div class="st-sc-title">{{ t('shortcuts') }}</div>
          <ul class="st-sc">
            <li><span><kbd>/</kbd> <kbd>{{ mod }}</kbd>+<kbd>K</kbd></span>{{ t('scSearch') }}</li>
            <li><span><kbd>{{ mod }}</kbd>+clique</span>{{ t('scBackground') }}</li>
            <li><span><kbd>Shift</kbd>+clique</span>{{ t('scWindow') }}</li>
            <li><span><kbd>↑</kbd> <kbd>↓</kbd> <kbd>↵</kbd></span>{{ t('searchResults') }}</li>
            <li><span><Icon name="check" :size="12" /> {{ t('select').toLowerCase() }}</span>{{ t('scSelect') }}</li>
          </ul>
          <p class="st-hint">{{ t('scDrag') }}</p>
        </div>
      </div>
    </div>
  </Modal>
</template>
