<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Icon from '../../components/Icon.vue'
import { settings } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { pathTo, byId, defaultFolderId } from '../../shared/bookmarks'
import { ui, go, openMenu, openDialog, isSearching, clearSearch, filterCount } from '../ui'
import { folderMenu } from '../menus'
import { results, runResult } from '../search'
import AdvancedSearch from './AdvancedSearch.vue'

const input = ref(null)
const wrap = ref(null)

// Close the advanced panel when clicking anywhere outside the search area
function onDocDown(e) {
  if (ui.advOpen && wrap.value && !wrap.value.contains(e.target)) ui.advOpen = false
}
onMounted(() => document.addEventListener('mousedown', onDocDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown))

const path = computed(() => {
  void byId.value
  return ui.current === 'home' ? [] : pathTo(ui.current)
})

watch(() => ui.focusSearch, () => nextTick(() => input.value?.focus()))
watch(() => [ui.query, ui.tagFilter], () => (ui.active = 0), { deep: true })

function onKey(e) {
  const n = results.value.length
  if (e.key === 'ArrowDown') { e.preventDefault(); ui.active = Math.min(n - 1, ui.active + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ui.active = Math.max(0, ui.active - 1) }
  else if (e.key === 'Enter') { e.preventDefault(); runResult(results.value[ui.active], e) }
  else if (e.key === 'Escape') { if (ui.advOpen) ui.advOpen = false; else { clearSearch(); input.value?.blur() } }
}

function sortMenu(e) {
  const s = (v) => () => (settings.sortBy = v)
  const d = (v) => () => (settings.sortDir = v)
  openMenu(e.currentTarget, [
    { header: t('sort') },
    { label: t('sortDefault'), checked: settings.sortBy === 'default', action: s('default') },
    { label: t('sortAlpha'), checked: settings.sortBy === 'alpha', action: s('alpha') },
    { label: t('sortDate'), checked: settings.sortBy === 'date', action: s('date') },
    { label: t('sortFreq'), checked: settings.sortBy === 'freq', action: s('freq') },
    { divider: true },
    { label: t('asc'), checked: settings.sortDir === 'asc', disabled: settings.sortBy === 'default', action: d('asc') },
    { label: t('desc'), checked: settings.sortDir === 'desc', disabled: settings.sortBy === 'default', action: d('desc') },
  ])
}

function addMenu(e) {
  const parentId = ui.current === 'home' ? defaultFolderId() : ui.current
  openMenu(e.currentTarget, [
    { label: t('addBookmark'), icon: 'bookmark-plus', action: () => openDialog('bookmark', { parentId }) },
    { label: t('addFolder'), icon: 'folder-plus', action: () => openDialog('folder', { parentId }) },
  ])
}
</script>

<template>
  <header class="topbar">
    <button v-if="settings.sidebarCollapsed" class="icon-btn" :title="t('expand')" @click="settings.sidebarCollapsed = false">
      <Icon name="sidebar" :size="17" />
    </button>

    <nav class="crumbs">
      <span v-if="isSearching()" class="crumb last">{{ t('searchResults') }}</span>
      <template v-else>
        <button class="crumb" :class="{ last: !path.length }" @click="go('home')">{{ t('home') }}</button>
        <template v-for="(n, i) in path" :key="n.id">
          <Icon name="chevron-right" :size="14" class="crumb-sep" />
          <button
            class="crumb"
            :class="{ last: i === path.length - 1 }"
            @click="go(n.id)"
            @contextmenu.prevent="openMenu($event, folderMenu(n))"
          >{{ n.title || t('untitled') }}</button>
        </template>
      </template>
    </nav>

    <div ref="wrap" class="search-wrap">
    <label class="search">
      <Icon name="search" :size="17" />
      <input
        ref="input"
        v-model="ui.query"
        :placeholder="t('searchPlaceholder')"
        spellcheck="false"
        autocomplete="off"
        @keydown="onKey"
      />
      <button v-if="isSearching()" class="search-clear" :title="t('clearSearch')" @click.prevent="clearSearch">
        <Icon name="x" :size="15" />
      </button>
      <kbd v-else>/</kbd>
      <button
        class="search-filter"
        :class="{ on: filterCount() > 0, open: ui.advOpen }"
        :title="t('advancedSearch')"
        :aria-expanded="ui.advOpen"
        @click.prevent="ui.advOpen = !ui.advOpen"
      >
        <Icon name="filter" :size="15" />
        <span v-if="filterCount()" class="search-filter-n">{{ filterCount() }}</span>
      </button>
    </label>
    <AdvancedSearch v-if="ui.advOpen" />
    </div>

    <div class="tb-actions">
      <button class="icon-btn" :class="{ on: settings.sortBy !== 'default' }" :title="t('sort')" @click="sortMenu">
        <Icon name="sort" :size="18" />
      </button>
      <div class="seg-mini" role="group" :aria-label="t('layout')">
        <button class="icon-btn" :class="{ on: settings.layout === 'grid' }" :title="t('grid')" @click="settings.layout = 'grid'">
          <Icon name="grid" :size="16" />
        </button>
        <button class="icon-btn" :class="{ on: settings.layout === 'columns' }" :title="t('columns')" @click="settings.layout = 'columns'">
          <Icon name="columns" :size="16" />
        </button>
      </div>
      <button class="icon-btn" :title="t('add')" @click="addMenu"><Icon name="plus" :size="19" /></button>
    </div>
  </header>
</template>
