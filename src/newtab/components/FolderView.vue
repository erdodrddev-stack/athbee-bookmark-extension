<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import BookmarkCard from './BookmarkCard.vue'
import FolderChip from './FolderChip.vue'
import { settings, meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { getNode, countBookmarks } from '../../shared/bookmarks'
import { go, openMenu } from '../ui'
import { folderMenu } from '../menus'
import { splitChildren } from '../sort'
import { canDrop, dropInto } from '../dnd'

const props = defineProps({ folderId: { type: String, required: true } })

const node = computed(() => getNode(props.folderId))
const own = computed(() => splitChildren(node.value))
const sections = computed(() =>
  own.value.folders.map((f) => ({ f, ...splitChildren(f), hidden: meta.hidden.includes(f.id) })),
)
const isEmpty = computed(() => !own.value.bookmarks.length && !own.value.folders.length)

function zoneOver(e) {
  if (!canDrop(e)) return
  e.preventDefault()
}
function zoneDrop(e, folderId) {
  if (!canDrop(e)) return
  e.preventDefault()
  dropInto(e, folderId)
}
</script>

<template>
  <div v-if="node" class="folder-view">
    <div v-if="isEmpty" class="empty" @dragover="zoneOver" @drop="zoneDrop($event, node.id)">
      <Icon name="folder-open" :size="22" />
      <span>{{ t('emptyFolder') }}</span>
    </div>

    <!-- Rows: loose bookmarks first, then one section per sub-folder -->
    <template v-else-if="settings.layout === 'grid'">
      <div
        v-if="own.bookmarks.length"
        class="bm-grid"
        @dragover="zoneOver"
        @drop="zoneDrop($event, node.id)"
      >
        <BookmarkCard v-for="b in own.bookmarks" :key="b.id" :node="b" />
      </div>

      <section v-for="s in sections" :key="s.f.id" class="fsec" :class="{ 'is-hidden': s.hidden }">
        <header class="fsec-head">
          <button
            class="fsec-title"
            @click="go(s.f.id)"
            @contextmenu.prevent="openMenu($event, folderMenu(s.f))"
            @dragover="zoneOver"
            @drop="zoneDrop($event, s.f.id)"
          >
            <Icon name="folder" :size="17" class="fsec-ico" />
            <span>{{ s.f.title || t('untitled') }}</span>
            <span class="fsec-count">{{ countBookmarks(s.f) }}</span>
            <Icon name="chevron-right" :size="15" class="fsec-go" />
          </button>
        </header>
        <div class="bm-grid" @dragover="zoneOver" @drop="zoneDrop($event, s.f.id)">
          <FolderChip v-for="d in s.folders" :key="d.id" :node="d" />
          <BookmarkCard v-for="b in s.bookmarks" :key="b.id" :node="b" />
          <div v-if="!s.folders.length && !s.bookmarks.length" class="empty small">{{ t('emptyFolder') }}</div>
        </div>
      </section>
    </template>

    <!-- Columns: each folder is a column (masonry) -->
    <div v-else class="cols">
      <div v-if="own.bookmarks.length" class="col">
        <div class="col-head static">
          <Icon name="folder" :size="16" class="fsec-ico" />
          <span class="col-title">{{ node.title || t('untitled') }}</span>
          <span class="fsec-count">{{ own.bookmarks.length }}</span>
        </div>
        <div class="col-list" @dragover="zoneOver" @drop="zoneDrop($event, node.id)">
          <BookmarkCard v-for="b in own.bookmarks" :key="b.id" :node="b" />
        </div>
      </div>
      <div v-for="s in sections" :key="s.f.id" class="col" :class="{ 'is-hidden': s.hidden }">
        <button
          class="col-head"
          @click="go(s.f.id)"
          @contextmenu.prevent="openMenu($event, folderMenu(s.f))"
          @dragover="zoneOver"
          @drop="zoneDrop($event, s.f.id)"
        >
          <Icon name="folder" :size="16" class="fsec-ico" />
          <span class="col-title">{{ s.f.title || t('untitled') }}</span>
          <span class="fsec-count">{{ countBookmarks(s.f) }}</span>
          <Icon name="chevron-right" :size="14" class="fsec-go" />
        </button>
        <div class="col-list" @dragover="zoneOver" @drop="zoneDrop($event, s.f.id)">
          <FolderChip v-for="d in s.folders" :key="d.id" :node="d" />
          <BookmarkCard v-for="b in s.bookmarks" :key="b.id" :node="b" />
          <div v-if="!s.folders.length && !s.bookmarks.length" class="empty small">{{ t('emptyFolder') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
