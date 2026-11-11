<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { settings, meta, loadPersisted, applyTheme } from '../shared/settings'
import { reloadTree, watchBookmarkEvents, getNode, byId } from '../shared/bookmarks'
import { loadHistory } from '../shared/history'
import { pruneTags } from '../shared/tags'
import { t } from '../shared/i18n'
import { ui, go, isSearching } from './ui'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import HomeView from './components/HomeView.vue'
import FolderView from './components/FolderView.vue'
import SearchResults from './components/SearchResults.vue'
import ContextMenu from './components/ContextMenu.vue'
import DialogHost from './components/DialogHost.vue'
import Toast from './components/Toast.vue'

const ready = ref(false)
const content = ref(null)

onMounted(async () => {
  await loadPersisted()
  applyTheme()
  await reloadTree()
  pruneTags(getNode)
  watchBookmarkEvents()
  if (settings.autoOpenLast && meta.lastFolder && getNode(meta.lastFolder)) ui.current = meta.lastFolder
  ready.value = true
  loadHistory()
})

watch(() => ui.current, (id) => {
  meta.lastFolder = id
  if (content.value) content.value.scrollTop = 0
})
// Folder deleted while open → back home; forget tags of deleted bookmarks
watch(byId, () => {
  if (ui.current !== 'home' && !getNode(ui.current)) go('home')
  pruneTags(getNode)
})

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
function onKey(e) {
  if (ui.dialog) return
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
  <div v-if="ready" class="app" :class="{ 'sidebar-collapsed': settings.sidebarCollapsed }" :style="vars">
    <Sidebar />
    <main class="main">
      <TopBar />
      <div ref="content" class="content custom-scroll">
        <SearchResults v-if="isSearching()" />
        <HomeView v-else-if="ui.current === 'home'" />
        <FolderView v-else :key="ui.current" :folder-id="ui.current" />
      </div>
    </main>
    <ContextMenu />
    <DialogHost />
    <Toast />
  </div>
</template>
