<script setup>
import { computed, watch, nextTick, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import TagPill from '../../components/TagPill.vue'
import { t } from '../../shared/i18n'
import { pathTo } from '../../shared/bookmarks'
import { tagsOf, tagStyle } from '../../shared/tags'
import { faviconUrl } from '../../shared/util'
import { ui, openMenu, filterCount } from '../ui'
import { bookmarkMenu, folderMenu, historyMenu } from '../menus'
import { results, runResult, activeTags, parsed, applyTag, removeTag } from '../search'

const el = ref(null)

// Chips summarizing every active tag criterion; typed #tags count as "all"
const criteria = computed(() => {
  const f = ui.tagFilter
  const del = (key) => (name) => (f[key] = f[key].filter((x) => x !== name))
  const pills = (key) => f[key].map((name) => ({ name, remove: del(key) }))
  const typed = activeTags.value.filter((name) => !f.all.includes(name)).map((name) => ({ name, remove: removeTag }))
  return [
    { key: 'all', label: t('chipAll'), tags: [...typed, ...pills('all')] },
    { key: 'any', label: t('chipAny'), tags: pills('any') },
    { key: 'none', label: t('chipNone'), tags: pills('none') },
    { key: 'only', label: t('chipOnly'), tags: pills('only') },
  ].filter((c) => c.tags.length)
})
const filtering = computed(() => criteria.value.length > 0)

const groups = computed(() => {
  const g = { tag: [], folder: [], bookmark: [], history: [], web: [] }
  for (const r of results.value) g[r.kind].push(r)
  return [
    { key: 'tag', label: t('tags'), items: g.tag },
    { key: 'folder', label: t('folders'), items: g.folder },
    { key: 'bookmark', label: t('bookmarks'), items: g.bookmark },
    { key: 'history', label: t('history'), items: g.history },
    { key: 'web', label: t('web'), items: g.web },
  ].filter((x) => x.items.length)
})
const noBookmarks = computed(() => !results.value.some((r) => r.kind === 'bookmark' || r.kind === 'folder' || r.kind === 'history'))
const typingTagOnly = computed(() => parsed.value.partial !== null && !parsed.value.tags.length && !parsed.value.text.length)

const crumbs = (n) => pathTo(n.parentId).map((p) => p.title).join(' / ')
const prettyUrl = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

function menuFor(r) {
  if (r.kind === 'bookmark') return bookmarkMenu(r.node)
  if (r.kind === 'folder') return folderMenu(r.node)
  if (r.kind === 'history') return historyMenu(r.node)
  return null
}
function onMenu(e, r) {
  const items = menuFor(r)
  if (items) openMenu(e, items)
}

watch(() => ui.active, () =>
  nextTick(() => el.value?.querySelector('.sr-row.active')?.scrollIntoView({ block: 'nearest' })),
)
</script>

<template>
  <div ref="el" class="sr">
    <div v-if="filtering" class="sr-filters">
      <span class="sr-filters-label">{{ t('filteringBy') }}</span>
      <span v-for="c in criteria" :key="c.key" class="sr-crit">
        <span class="sr-crit-label">{{ c.label }}</span>
        <TagPill v-for="tg in c.tags" :key="tg.name" :name="tg.name" removable @remove="tg.remove" />
      </span>
      <button v-if="filterCount()" type="button" class="sr-edit" @click="ui.advOpen = true">{{ t('editFilters') }}</button>
    </div>

    <div v-if="noBookmarks && !(typingTagOnly && groups.length)" class="sr-empty">
      {{ filtering ? t('noTagged') : t('noResults') }}
    </div>

    <template v-for="g in groups" :key="g.key">
      <div v-if="g.key !== 'web'" class="sr-group">{{ g.label }}</div>
      <div v-else class="sr-sep" />
      <button
        v-for="r in g.items"
        :key="r.i"
        class="sr-row"
        :class="{ active: ui.active === r.i }"
        @mouseenter="ui.active = r.i"
        @click="runResult(r, $event)"
        @auxclick.prevent="(r.kind === 'bookmark' || r.kind === 'history') && runResult(r, $event)"
        @contextmenu.prevent="onMenu($event, r)"
      >
        <span v-if="r.kind === 'tag'" class="sr-ico tag-ico" :style="tagStyle(r.name)">#</span>
        <span v-else class="sr-ico" :class="r.kind">
          <Icon v-if="r.kind === 'folder'" name="folder" :size="17" />
          <Icon v-else-if="r.kind === 'web'" name="search" :size="17" />
          <img v-else :src="faviconUrl(r.node.url, 32)" alt="" width="18" height="18" />
        </span>

        <span class="sr-main">
          <span class="sr-title">
            <template v-if="r.kind === 'web'">{{ t('searchWeb', { q: r.q }) }}</template>
            <template v-else-if="r.kind === 'tag'">#{{ r.name }}</template>
            <template v-else>{{ r.node.title || prettyUrl(r.node.url || '') }}</template>
          </span>
          <span v-if="r.kind === 'bookmark' || r.kind === 'history'" class="sr-sub">{{ prettyUrl(r.node.url) }}</span>
          <span v-else-if="r.kind === 'folder'" class="sr-sub">{{ crumbs(r.node) }}</span>
          <span v-else-if="r.kind === 'tag'" class="sr-sub">{{ t('taggedCount', { n: r.count }) }}</span>
        </span>

        <span v-if="r.kind === 'bookmark' && tagsOf(r.node.id).length" class="sr-tags">
          <TagPill v-for="tg in tagsOf(r.node.id)" :key="tg" :name="tg" clickable @select="applyTag" />
        </span>
        <span v-if="r.kind === 'bookmark'" class="sr-tag">{{ crumbs(r.node) }}</span>
        <span v-else-if="r.kind === 'history'" class="sr-tag"><Icon name="clock" :size="12" /> {{ t('history') }}</span>
        <kbd v-if="ui.active === r.i" class="sr-enter">↵</kbd>
      </button>
    </template>
  </div>
</template>
