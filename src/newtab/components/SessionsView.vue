<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { t } from '../../shared/i18n'
import { faviconUrl, hostOf } from '../../shared/util'
import { topFolders } from '../../shared/bookmarks'
import {
  sessions, loadSessions, captureWindow, saveWindow, updateFromWindow, renameSession,
  deleteSession, removeTab, openSession, sessionToFolder, defaultName,
} from '../../shared/sessions'
import { toast, openMenu, openDialog, go } from '../ui'
import { openUrl } from '../actions'

const name = ref('')
const close = ref(false)
const tabCount = ref(0)
const saving = ref(false)
const expanded = ref(new Set())
const renaming = ref(null) // session id being renamed
const renameText = ref('')
const placeholder = ref(defaultName())

// keep the "N tabs in this window" count fresh while the page is open
async function recount() {
  tabCount.value = (await captureWindow().catch(() => [])).length
}
const events = ['onCreated', 'onRemoved', 'onUpdated', 'onAttached', 'onDetached']
onMounted(() => {
  loadSessions()
  recount()
  for (const ev of events) chrome.tabs[ev].addListener(recount)
})
onBeforeUnmount(() => {
  for (const ev of events) chrome.tabs[ev].removeListener(recount)
})

async function save() {
  saving.value = true
  try {
    const s = await saveWindow({ name: name.value, close: close.value })
    if (s) {
      toast(t('sessSaved', { n: s.tabs.length }))
      name.value = ''
      placeholder.value = defaultName()
    }
  } finally {
    saving.value = false
  }
}

function toggle(id) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

function startRename(s) {
  renaming.value = s.id
  renameText.value = s.name
}
async function commitRename() {
  if (renaming.value) await renameSession(renaming.value, renameText.value)
  renaming.value = null
}

async function remove(s) {
  toast(t('sessDeleted'), t('undo'), await deleteSession(s.id))
}

function menu(e, s) {
  openMenu(e.currentTarget, [
    { label: t('sessOpenNew'), icon: 'window', action: () => openSession(s, { newWindow: true }) },
    { label: t('sessOpenHere'), icon: 'external', action: () => openSession(s, { newWindow: false }) },
    { divider: true },
    { label: t('sessUpdate'), icon: 'download', action: () => openDialog('confirm', {
      message: t('sessUpdateConfirm', { name: s.name, n: tabCount.value }),
      confirmLabel: t('sessUpdate'),
      onConfirm: async () => { await updateFromWindow(s.id); toast(t('sessUpdated')) },
    }) },
    { label: t('sessToFolder'), icon: 'folder-plus', action: async () => {
      const id = await sessionToFolder(s, topFolders()[1]?.id || topFolders()[0]?.id)
      toast(t('sessFolderMade', { name: s.name }), t('sessGoFolder'), () => go(id))
    } },
    { label: t('rename'), icon: 'pencil', action: () => startRename(s) },
    { divider: true },
    { label: t('delete'), icon: 'trash', danger: true, action: () => remove(s) },
  ])
}

const fmtDate = (ms) => new Date(ms).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const vFocus = { mounted: (el) => { el.focus(); el.select() } }
</script>

<template>
  <section class="hsec sess">
    <h2 class="hsec-title"><Icon name="layers" :size="26" /> {{ t('sessions') }}</h2>

    <form class="sess-save" @submit.prevent="save">
      <div class="sess-save-main">
        <input v-model="name" class="input" :placeholder="placeholder" :aria-label="t('sessName')" maxlength="80" />
        <button class="btn btn-primary" type="submit" :disabled="saving || !tabCount">
          <Icon name="download" :size="16" /> {{ t('sessSaveWindow', { n: tabCount }) }}
        </button>
      </div>
      <label class="sess-close">
        <input v-model="close" type="checkbox" />
        {{ t('sessCloseAfter') }}
      </label>
    </form>

    <div v-if="!sessions.length" class="empty">
      <Icon name="layers" :size="18" /> {{ t('sessEmpty') }}
    </div>

    <div class="sess-list">
      <article v-for="s in sessions" :key="s.id" class="sess-card">
        <header class="sess-head">
          <button class="icon-btn sess-chev" :aria-expanded="expanded.has(s.id)" :title="t('sessShowTabs')" @click="toggle(s.id)">
            <Icon name="chevron-down" :size="16" class="hsec-chev" :class="{ closed: !expanded.has(s.id) }" />
          </button>
          <div class="sess-info">
            <input
              v-if="renaming === s.id"
              v-model="renameText"
              v-focus
              class="input sess-rename"
              maxlength="80"
              @keydown.enter.prevent="commitRename"
              @keydown.esc.stop.prevent="renaming = null"
              @blur="commitRename"
            />
            <button v-else class="sess-name" :title="t('rename')" @dblclick="startRename(s)" @click="toggle(s.id)">{{ s.name }}</button>
            <span class="sess-meta">{{ t('sessMeta', { n: s.tabs.length, date: fmtDate(s.updatedAt) }) }}</span>
          </div>
          <span class="sess-icons" aria-hidden="true">
            <img v-for="(tab, i) in s.tabs.slice(0, 10)" :key="i" :src="faviconUrl(tab.url, 32)" alt="" width="16" height="16" />
            <span v-if="s.tabs.length > 10" class="sess-more">+{{ s.tabs.length - 10 }}</span>
          </span>
          <button class="btn btn-ghost sess-open" @click="openSession(s)"><Icon name="window" :size="15" /> {{ t('open') }}</button>
          <button class="icon-btn" :title="t('more')" @click="menu($event, s)"><Icon name="dots" :size="17" /></button>
        </header>

        <ul v-if="expanded.has(s.id)" class="sess-tabs">
          <li v-for="(tab, i) in s.tabs" :key="i" class="sess-tab">
            <span v-if="tab.group" class="sess-group" :class="'g-' + tab.group.color" :title="tab.group.title" />
            <img :src="faviconUrl(tab.url, 32)" alt="" width="16" height="16" />
            <button class="sess-tab-title" :title="tab.url" @click="openUrl(tab.url, 'new')">{{ tab.title || hostOf(tab.url) }}</button>
            <Icon v-if="tab.pinned" name="pin" :size="12" class="sess-pin" />
            <span class="sess-host">{{ hostOf(tab.url) }}</span>
            <button class="icon-btn sess-x" :title="t('sessRemoveTab')" @click="removeTab(s.id, i)"><Icon name="x" :size="14" /></button>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
