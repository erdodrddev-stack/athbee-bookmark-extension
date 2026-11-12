<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import Logo from '../../components/Logo.vue'
import FolderTreeItem from './FolderTreeItem.vue'
import SidebarTags from './SidebarTags.vue'
import { settings, meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { topFolders, getNode, byId } from '../../shared/bookmarks'
import { ui, go, openDialog, isSearching } from '../ui'
import { check } from '../linkcheck'
import { extraCopies } from '../duplicates'
import { isVisible } from '../sort'
import { sessions, loadSessions } from '../../shared/sessions'

loadSessions()

const linkIssues = computed(() => (check.finishedAt ? check.results.length : 0))
const issues = computed(() => extraCopies.value + linkIssues.value)
// open on the tab that has something to show
function openMaintenance() {
  const tab = check.running || linkIssues.value ? 'links' : extraCopies.value ? 'duplicates' : 'stale'
  openDialog('maintenance', { tab })
}

const roots = computed(() => {
  void byId.value
  return topFolders()
})
const pinnedFolders = computed(() => {
  void byId.value
  return meta.pinned.map(getNode).filter((n) => n && !n.url && isVisible(n))
})

function startResize(e) {
  e.preventDefault()
  const startX = e.clientX
  const startW = settings.sidebarWidth
  document.body.classList.add('resizing')
  const move = (ev) => {
    settings.sidebarWidth = Math.round(Math.min(440, Math.max(200, startW + ev.clientX - startX)))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    document.body.classList.remove('resizing')
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}
</script>

<template>
  <aside class="sidebar" :aria-hidden="settings.sidebarCollapsed">
    <div class="sb-head">
      <div class="brand">
        <Logo :size="26" />
        <span>Bookdeck</span>
      </div>
      <button class="icon-btn" :title="t('collapse')" @click="settings.sidebarCollapsed = true">
        <Icon name="sidebar" :size="17" />
      </button>
    </div>

    <nav class="sb-nav custom-scroll">
      <button class="tree-row" :class="{ active: ui.current === 'home' && !isSearching() }" @click="go('home')">
        <span class="tree-chevron is-leaf" />
        <span class="tree-ico"><Icon name="home" :size="17" /></span>
        <span class="tree-title">{{ t('home') }}</span>
      </button>
      <button class="tree-row" :class="{ active: ui.current === 'sessions' && !isSearching() }" @click="go('sessions')">
        <span class="tree-chevron is-leaf" />
        <span class="tree-ico"><Icon name="layers" :size="17" /></span>
        <span class="tree-title">{{ t('sessions') }}</span>
        <span v-if="sessions.length" class="tree-count">{{ sessions.length }}</span>
      </button>

      <template v-if="pinnedFolders.length">
        <div class="sb-label">{{ t('pinned') }}</div>
        <FolderTreeItem v-for="f in pinnedFolders" :key="'p' + f.id" :node="f" :depth="0" flat />
      </template>

      <div class="sb-label">{{ t('bookmarks') }}</div>
      <FolderTreeItem v-for="r in roots" :key="r.id" :node="r" :depth="0" />

      <SidebarTags />
    </nav>

    <div class="sb-foot">
      <button class="tree-row" @click="openMaintenance">
        <span class="tree-chevron is-leaf" />
        <span class="tree-ico"><Icon name="wrench" :size="17" /></span>
        <span class="tree-title">{{ t('maintenance') }}</span>
        <span v-if="check.running" class="tree-count">{{ check.done }}/{{ check.total }}</span>
        <span v-else-if="issues" class="tree-count" :title="t('maintenanceIssues', { n: issues })">{{ issues }}</span>
      </button>
      <button class="tree-row" @click="openDialog('settings')">
        <span class="tree-chevron is-leaf" />
        <span class="tree-ico"><Icon name="settings" :size="17" /></span>
        <span class="tree-title">{{ t('settings') }}</span>
      </button>
    </div>

    <div class="sb-resize" @pointerdown="startResize" />
  </aside>
</template>
