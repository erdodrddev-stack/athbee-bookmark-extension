<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import BookmarkCard from './BookmarkCard.vue'
import FolderChip from './FolderChip.vue'
import FolderView from './FolderView.vue'
import { settings, meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { allBookmarks, getNode, byId, topFolders } from '../../shared/bookmarks'
import { visitMap, score } from '../../shared/history'
import { normUrl, hostOf } from '../../shared/util'
import { go, openMenu } from '../ui'
import { folderMenu } from '../menus'
import { isVisible } from '../sort'
import { activeWs, inWorkspace, wsFolders } from '../../shared/workspaces'
import { openDialog } from '../ui'

const bookmarkByUrl = computed(() => {
  void byId.value
  const m = new Map()
  for (const b of allBookmarks()) if (isVisible(b) && inWorkspace(b) && !m.has(normUrl(b.url))) m.set(normUrl(b.url), b)
  return m
})

const recs = computed(() => {
  const scored = []
  for (const [k, b] of bookmarkByUrl.value) {
    const h = visitMap.value.get(k)
    if (h) scored.push([score(h), b])
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 8).map((x) => x[1])
})

const fromHistory = computed(() => {
  const bestByHost = new Map()
  for (const [k, h] of visitMap.value) {
    if (bookmarkByUrl.value.has(k) || !/^https?:/.test(h.url)) continue
    const host = hostOf(h.url)
    const s = score(h)
    const prev = bestByHost.get(host)
    if (!prev || prev.s < s) bestByHost.set(host, { s, node: { url: h.url, title: h.title } })
  }
  return [...bestByHost.values()].sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.node)
})

const pinnedItems = computed(() => {
  void byId.value
  return meta.pinned.map(getNode).filter((n) => n && isVisible(n) && inWorkspace(n))
})

// the bookmarks bar, or every folder of the active workspace
const sections = computed(() => {
  void byId.value
  return wsFolders.value || [topFolders()[0]].filter(Boolean)
})
</script>

<template>
  <div class="home">
    <section v-if="settings.showRecommendations && (recs.length || fromHistory.length)" class="hsec">
      <h2 class="hsec-title">
        {{ t('recommendations') }}
        <Icon name="sparkle" :size="20" class="sparkle" />
      </h2>
      <div v-if="recs.length" class="bm-grid">
        <BookmarkCard v-for="b in recs" :key="'r' + b.id" :node="b" no-drop />
      </div>
      <template v-if="fromHistory.length">
        <button class="hsec-sub" @click="meta.historyOpen = !meta.historyOpen">
          {{ t('fromHistory') }}
          <Icon name="chevron-down" :size="16" class="hsec-chev" :class="{ closed: !meta.historyOpen }" />
        </button>
        <div v-show="meta.historyOpen" class="bm-grid">
          <BookmarkCard v-for="h in fromHistory" :key="h.url" :node="h" history no-drop />
        </div>
      </template>
    </section>

    <section v-if="pinnedItems.length" class="hsec">
      <h2 class="hsec-title">{{ t('pinned') }}</h2>
      <div class="bm-grid">
        <template v-for="n in pinnedItems" :key="'p' + n.id">
          <BookmarkCard v-if="n.url" :node="n" no-drop />
          <FolderChip v-else :node="n" />
        </template>
      </div>
    </section>

    <section v-for="f in sections" :key="f.id" class="hsec">
      <h2 class="hsec-title">
        <button class="hsec-link" @click="go(f.id)" @contextmenu.prevent="openMenu($event, folderMenu(f))">
          {{ f.title }}
          <Icon name="chevron-right" :size="18" />
        </button>
      </h2>
      <FolderView :folder-id="f.id" />
    </section>

    <div v-if="activeWs && !sections.length" class="empty">
      <Icon name="folder-plus" :size="18" />
      {{ t('wsNoFolders', { name: activeWs.name }) }}
      <button class="btn btn-ghost lc-gbtn" @click="openDialog('workspaces', { editId: activeWs.id })">{{ t('wsChooseFolders') }}</button>
    </div>
  </div>
</template>
