<script setup>
import { computed, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { settings, meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { countBookmarks } from '../../shared/bookmarks'
import { go, openMenu } from '../ui'
import { folderMenu } from '../menus'
import { dnd, startDrag, endDrag, canDropInto, dropInto } from '../dnd'

const props = defineProps({ node: { type: Object, required: true } })

const count = computed(() => countBookmarks(props.node))
const pinned = computed(() => meta.pinned.includes(props.node.id))
const hidden = computed(() => meta.hidden.includes(props.node.id))
const over = ref(false)

function onDragOver(e) {
  if (!canDropInto(e, props.node.id)) return
  e.preventDefault()
  e.stopPropagation()
  over.value = true
}
function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  over.value = false
  dropInto(e, props.node.id)
}
</script>

<template>
  <button
    class="bm bm-folder"
    :title="settings.style === 'icon' ? node.title || t('untitled') : undefined"
    :class="[
      ({ compact: 'bm-compact', icon: 'bm-tile' })[settings.style] || 'bm-card',
      { over, 'is-hidden': hidden, 'is-dragging': dnd.id === node.id },
    ]"
    draggable="true"
    @click="go(node.id)"
    @contextmenu.prevent.stop="openMenu($event, folderMenu(node))"
    @dragstart="startDrag($event, node)"
    @dragend="endDrag"
    @dragover="onDragOver"
    @dragleave="over = false"
    @drop="onDrop"
  >
    <span class="bm-icon folder-ico"><Icon name="folder" :size="16" /></span>
    <span class="bm-text">
      <span class="bm-title">{{ node.title || t('untitled') }}</span>
      <span v-if="settings.style === 'card'" class="bm-url">{{ t('items', { n: count }) }}</span>
    </span>
    <Icon v-if="pinned" name="pin" :size="12" class="bm-pin" />
  </button>
</template>
