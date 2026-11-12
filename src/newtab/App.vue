<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { settings, meta, loadPersisted, applyTheme } from '../shared/settings'
import { reloadTree, watchBookmarkEvents, getNode, byId } from '../shared/bookmarks'
import { loadHistory } from '../shared/history'
import { refreshUsage } from '../shared/usage'
import { pruneTags } from '../shared/tags'
import { t } from '../shared/i18n'
import { isExt } from '../shared/util'
import { ui, go, isSearching, inFolder, openDialog } from './ui'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import HomeView from './components/HomeView.vue'
import FolderView from './components/FolderView.vue'
import SessionsView from './components/SessionsView.vue'
import SearchResults from './components/SearchResults.vue'
import ContextMenu from './components/ContextMenu.vue'
import DialogHost from './components/DialogHost.vue'
import Toast from './components/Toast.vue'
import SelectionBar from './components/SelectionBar.vue'
import { sel, clearSelection } from './selection'
import { inWorkspace, switchByIndex, pruneWorkspaces } from '../shared/workspaces'
import { startSync } from '../shared/sync'
import { maybeAutoBackup } from './autobackup'

const ready = ref(false)
const content = ref(null)

onMounted(async () => {
  await loadPersisted()
  applyTheme()
  await reloadTree()
  pruneTags(getNode)
  watchBookmarkEvents()
  if (settings.autoOpenLast && meta.lastFolder && (meta.lastFolder === 'sessions' || getNode(meta.lastFolder))) ui.current = meta.lastFolder
  ready.value = true
  greet()
  loadHistory()
  // keep last-visit dates growing past the browser's history window (throttled inside)
  setTimeout(() => refreshUsage().catch(() => {}), 3000)
  startSync().catch(() => {})
  setTimeout(() => maybeAutoBackup().catch(() => {}), 5000)
})

watch(() => ui.current, (id) => {
  meta.lastFolder = id
  if (content.value) content.value.scrollTop = 0
})
/** Welcome on a fresh install, "what's new" when the minor version changes. */
function greet() {
  const v = isExt ? chrome.runtime.getManifest().version : null
  if (!v || meta.seenVersion === v) return
  const minor = (x) => (x || '').split('.').slice(0, 2).join('.')
  if (!meta.seenVersion) {
    // 0.1 didn't record seenVersion: people with data already are upgrading, not new
    const upgrading = meta.lastFolder || meta.pinned.length || Object.keys(meta.tags).length
    openDialog('welcome', { mode: upgrading ? 'whatsnew' : 'welcome' })
  } else if (minor(meta.seenVersion) !== minor(v)) {
    openDialog('welcome', { mode: 'whatsnew' })
  } else {
    meta.seenVersion = v // patch release: nothing to announce
  }
}

// Switching workspace away from the open folder → back home
watch(() => meta.activeWs, () => {
  if (inFolder() && !inWorkspace(getNode(ui.current))) go('home')
})
// Folder deleted while open → back home; forget tags of deleted bookmarks
watch(byId, () => {
  if (inFolder() && !getNode(ui.current)) go('home')
  pruneWorkspaces()
  pruneTags(getNode)
})

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
function onKey(e) {
  if (ui.dialog) return
  if (e.key === 'Escape' && sel.ids.length && !isTyping(document.activeElement)) {
    clearSelection()
    return
  }
  // Alt+0 = everything, Alt+1..9 = workspaces (e.code, since Option+digit types symbols on macOS)
  if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit\d$/.test(e.code) && !isTyping(document.activeElement)) {
    e.preventDefault()
    switchByIndex(Number(e.code.slice(5)))
    return
  }
  const k = e.key.toLowerCase()
  if ((k === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isTyping(document.activeElement))) {
    e.preventDefault()
    ui.focusSearch++
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const vars = computed(() => ({
  '--sidebar-w': settings.sidebarWidth + 'px',
  '--bm-w': settings.width + 'px',
  '--bm-font': settings.fontSize + 'px',
}))

watch(() => t('newTab'), (s) => (document.title = s), { immediate: true })
</script>

<template>
  <div v-if="ready" class="app" :class="{ 'sidebar-collapsed': settings.sidebarCollapsed, 'style-icon': settings.style === 'icon', selecting: sel.ids.length > 0 }" :style="vars">
    <Sidebar />
    <main class="main">
      <TopBar />
      <div ref="content" class="content custom-scroll">
        <SearchResults v-if="isSearching()" />
        <HomeView v-else-if="ui.current === 'home'" />
        <SessionsView v-else-if="ui.current === 'sessions'" />
        <FolderView v-else :key="ui.current" :folder-id="ui.current" />
      </div>
    </main>
    <ContextMenu />
    <DialogHost />
    <SelectionBar />
    <Toast />
  </div>
</template>
