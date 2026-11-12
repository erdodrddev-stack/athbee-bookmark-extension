<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import Logo from '../../components/Logo.vue'
import FolderTreeItem from './FolderTreeItem.vue'
import SidebarTags from './SidebarTags.vue'
import { settings, meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { topFolders, getNode, byId } from '../../shared/bookmarks'
import { ui, go, openDialog, openMenu, isSearching } from '../ui'
import { check } from '../linkcheck'
import { extraCopies } from '../duplicates'
import { isVisible } from '../sort'
import { sessions, loadSessions } from '../../shared/sessions'
import { activeWs, inWorkspace, wsFolders, switchWorkspace } from '../../shared/workspaces'
import { LIMITS, isPro } from '../../shared/premium'
import { requirePro } from '../pro'

loadSessions()

const linkIssues = computed(() => (check.finishedAt ? check.results.length : 0))
const issues = computed(() => extraCopies.value + linkIssues.value)
// open on the tab that has something to show
function openMaintenance() {
  // (stale bookmarks are Pro, so the free plan starts on duplicates instead)
  const tab = check.running || linkIssues.value ? 'links' : extraCopies.value || !isPro.value ? 'duplicates' : 'stale'
  openDialog('maintenance', { tab })
}

const roots = computed(() => {
  void byId.value
  return wsFolders.value || topFolders()
})
const pinnedFolders = computed(() => {
  void byId.value
  return meta.pinned.map(getNode).filter((n) => n && !n.url && isVisible(n) && inWorkspace(n))
})
const wsSessions = computed(() => (activeWs.value ? sessions.value.filter((s) => s.ws === activeWs.value.id) : sessions.value))

const isMac = navigator.platform.toLowerCase().includes('mac')
const alt = isMac ? '⌥' : 'Alt+'
function wsMenu(e) {
  openMenu(e.currentTarget, [
    { header: t('workspaces') },
    { label: t('wsAll'), checked: !activeWs.value, hint: alt + '0', action: () => switchWorkspace(null) },
    ...meta.workspaces.map((w, i) => ({
      label: w.name,
      checked: activeWs.value?.id === w.id,
      hint: i < 9 ? alt + (i + 1) : '',
      action: () => switchWorkspace(w.id),
    })),
    { divider: true },
    {
      label: t('wsNew'),
      icon: 'plus',
      action: () => (meta.workspaces.length < LIMITS.workspaces || requirePro('workspaces')) && openDialog('workspaces', { create: true }),
    },
    { label: t('wsManage'), icon: 'settings', action: () => openDialog('workspaces', { editId: activeWs.value?.id }) },
  ])
}

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
        <Logo :size="32" />
        <span>Athbee Bookmark</span>
      </div>
      <button class="icon-btn" :title="t('collapse')" @click="settings.sidebarCollapsed = true">
        <Icon name="sidebar" :size="17" />
      </button>
    </div>

    <button class="ws-switch" :class="{ on: activeWs }" :title="t('wsSwitch')" @click="wsMenu">
      <Icon name="layers" :size="15" />
      <span class="ws-name">{{ activeWs ? activeWs.name : t('wsAll') }}</span>
      <Icon name="chevron-down" :size="15" />
    </button>

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
        <span v-if="wsSessions.length" class="tree-count">{{ wsSessions.length }}</span>
      </button>

      <template v-if="pinnedFolders.length">
        <div class="sb-label">{{ t('pinned') }}</div>
        <FolderTreeItem v-for="f in pinnedFolders" :key="'p' + f.id" :node="f" :depth="0" flat />
      </template>

      <div class="sb-label">{{ activeWs ? activeWs.name : t('bookmarks') }}</div>
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
