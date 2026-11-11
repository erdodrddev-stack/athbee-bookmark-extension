<script setup>
import { ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import Logo from '../../../components/Logo.vue'
import Toggle from '../../../components/Toggle.vue'
import Segmented from '../../../components/Segmented.vue'
import { settings } from '../../../shared/settings'
import { t } from '../../../shared/i18n'
import { isExt } from '../../../shared/util'

const emit = defineEmits(['close'])
const tab = ref('general')
const version = isExt ? chrome.runtime.getManifest().version : 'dev'
const isMac = navigator.platform.toLowerCase().includes('mac')
const mod = isMac ? '⌘' : 'Ctrl'
</script>

<template>
  <Modal :title="t('settings')" width="720px" @close="emit('close')">
    <div class="settings">
      <nav class="st-tabs">
        <button :class="{ on: tab === 'general' }" @click="tab = 'general'"><Icon name="sliders" :size="16" /> {{ t('general') }}</button>
        <button :class="{ on: tab === 'appearance' }" @click="tab = 'appearance'"><Icon name="palette" :size="16" /> {{ t('appearance') }}</button>
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
            <span class="st-label">{{ t('style') }}</span>
            <Segmented v-model="settings.style" :options="[{ value: 'card', label: t('card') }, { value: 'compact', label: t('compact') }]" />
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
          </ul>
          <p class="st-hint">{{ t('scDrag') }}</p>
        </div>
      </div>
    </div>
  </Modal>
</template>
