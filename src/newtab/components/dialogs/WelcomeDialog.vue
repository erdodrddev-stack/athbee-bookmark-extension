<script setup>
import { computed, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import Logo from '../../../components/Logo.vue'
import { t } from '../../../shared/i18n'
import { meta, flushPersist } from '../../../shared/settings'
import { isExt } from '../../../shared/util'

/** 'welcome' for a fresh install, 'whatsnew' after an update */
const props = defineProps({ mode: { type: String, default: 'welcome' } })
const emit = defineEmits(['close'])
const version = isExt ? chrome.runtime.getManifest().version : 'dev'

const STEPS = [
  { icon: 'bookmark-plus', key: 'Organize' },
  { icon: 'layers', key: 'Workspaces' },
  { icon: 'wrench', key: 'Maintenance' },
  { icon: 'archive', key: 'Private' },
]
const NEWS = ['IconStyle', 'Backup', 'Maintenance', 'Bulk', 'Sessions', 'Workspaces']
const NEWS_ICONS = { IconStyle: 'grid', Backup: 'archive', Maintenance: 'wrench', Bulk: 'check', Sessions: 'layers', Workspaces: 'sliders' }

const i = ref(0)
const last = computed(() => props.mode === 'whatsnew' || i.value === STEPS.length - 1)

function done() {
  meta.seenVersion = version
  flushPersist() // save now: settings writes are debounced and the tab may close right away
  emit('close')
}
</script>

<template>
  <Modal :title="mode === 'whatsnew' ? t('newsTitle', { v: version }) : t('welcomeTitle')" width="560px" @close="done">
    <div v-if="mode === 'whatsnew'" class="wl">
      <p class="wl-lead">{{ t('newsLead') }}</p>
      <ul class="wl-news">
        <li v-for="k in NEWS" :key="k">
          <span class="wl-ico"><Icon :name="NEWS_ICONS[k]" :size="18" /></span>
          <span><b>{{ t('news' + k) }}</b><span class="st-hint">{{ t('news' + k + 'Hint') }}</span></span>
        </li>
      </ul>
    </div>

    <div v-else class="wl">
      <div class="wl-step">
        <div class="wl-art">
          <Logo v-if="i === 0" :size="56" />
          <Icon v-else :name="STEPS[i].icon" :size="44" />
        </div>
        <h3 class="wl-h">{{ t('welcome' + STEPS[i].key) }}</h3>
        <p class="wl-p">{{ t('welcome' + STEPS[i].key + 'Text') }}</p>
      </div>
      <div class="wl-dots" role="tablist">
        <button
          v-for="(s, n) in STEPS"
          :key="s.key"
          role="tab"
          class="wl-dot"
          :class="{ on: n === i }"
          :aria-selected="n === i"
          :aria-label="t('welcome' + s.key)"
          @click="i = n"
        />
      </div>
    </div>

    <template #footer>
      <button v-if="mode !== 'whatsnew' && i > 0" class="btn btn-ghost" @click="i--">{{ t('back') }}</button>
      <button v-if="!last" class="btn btn-ghost" @click="done">{{ t('skip') }}</button>
      <button v-if="!last" class="btn btn-primary" @click="i++">{{ t('next') }}</button>
      <button v-else class="btn btn-primary" autofocus @click="done">{{ t('letsGo') }}</button>
    </template>
  </Modal>
</template>
