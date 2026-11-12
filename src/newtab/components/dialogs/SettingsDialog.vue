<script setup>
import { computed, reactive, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import Logo from '../../../components/Logo.vue'
import Toggle from '../../../components/Toggle.vue'
import Segmented from '../../../components/Segmented.vue'
import Swatches from '../../../components/Swatches.vue'
import { settings, ACCENTS, LOOKS } from '../../../shared/settings'
import { t } from '../../../shared/i18n'
import { isExt } from '../../../shared/util'
import { downloadBackup, parseBackup, summarize, importBackup } from '../../../shared/backup'
import { toast } from '../../ui'

const emit = defineEmits(['close'])
const tab = ref('general')
const version = isExt ? chrome.runtime.getManifest().version : 'dev'
const isMac = navigator.platform.toLowerCase().includes('mac')
const mod = isMac ? '⌘' : 'Ctrl'
const lookOptions = computed(() => LOOKS.map((l) => ({ value: l, label: t('look_' + l) })))
const accentOptions = computed(() => ACCENTS.map((a) => ({ value: a.id, color: a.hex, label: t('accent_' + a.id) })))

// ----- backup -----
const fileInput = ref(null)
const pending = ref(null) // { data, sum, name }
const opts = reactive({ bookmarks: true, meta: true, settings: true })
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
          <div class="st-row">
            <span class="st-label">{{ t('look') }}</span>
            <Segmented v-model="settings.look" :options="lookOptions" />
          </div>
          <div class="st-row">
            <span class="st-label">{{ t('accentColor') }}</span>
            <Swatches v-model="settings.accent" :options="accentOptions" />
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
            </ul>
            <label class="bk-opt">
              <span><span class="st-label">{{ t('bkOptBookmarks') }}</span><span class="st-hint">{{ t('bkOptBookmarksHint') }}</span></span>
              <Toggle v-model="opts.bookmarks" />
            </label>
            <label class="bk-opt">
              <span><span class="st-label">{{ t('bkOptMeta') }}</span><span class="st-hint">{{ t('bkOptMetaHint') }}</span></span>
              <Toggle v-model="opts.meta" />
            </label>
            <label v-if="pending.sum.hasSettings" class="bk-opt">
              <span><span class="st-label">{{ t('bkOptSettings') }}</span><span class="st-hint">{{ t('bkOptSettingsHint') }}</span></span>
              <Toggle v-model="opts.settings" />
            </label>
            <div class="bk-actions">
              <button class="btn btn-ghost" :disabled="busy" @click="pending = null">{{ t('cancel') }}</button>
              <button class="btn btn-primary" :disabled="busy || !(opts.bookmarks || opts.meta || opts.settings)" @click="onImport">
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
