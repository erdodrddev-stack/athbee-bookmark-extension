<script setup>
import { computed, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { ui, go, openMenu, isSearching } from '../ui'
import { folderMenu } from '../menus'
import { isVisible, showFolder } from '../sort'
import { canDrop, dropInto } from '../dnd'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  flat: Boolean,
})

const subfolders = computed(() =>
  (props.node.children || []).filter((n) => !n.url && isVisible(n) && showFolder(n)),
)
const count = computed(() => (props.node.children || []).filter((n) => n.url && isVisible(n)).length)
const expanded = computed(() => !!meta.expanded[props.node.id])
const active = computed(() => ui.current === props.node.id && !isSearching())
const hidden = computed(() => meta.hidden.includes(props.node.id))
const over = ref(false)

function toggle() {
  if (expanded.value) delete meta.expanded[props.node.id]
  else meta.expanded[props.node.id] = true
}
function onClick() {
  go(props.node.id)
  if (!props.flat && subfolders.value.length && !expanded.value) meta.expanded[props.node.id] = true
}
function onDragOver(e) {
  if (!canDrop(e)) return
  e.preventDefault()
  over.value = true
}
function onDrop(e) {
  e.preventDefault()
  over.value = false
  dropInto(e, props.node.id)
}
</script>

<template>
  <div class="tree-item">
    <button
      class="tree-row"
      :class="{ active, over, 'is-hidden': hidden }"
      :style="{ paddingLeft: 8 + depth * 14 + 'px' }"
      @click="onClick"
      @contextmenu.prevent="openMenu($event, folderMenu(node))"
      @dragover="onDragOver"
      @dragleave="over = false"
      @drop="onDrop"
    >
      <span
        class="tree-chevron"
        :class="{ open: expanded, 'is-leaf': flat || !subfolders.length }"
        @click.stop="toggle"
      >
        <Icon name="chevron-right" :size="14" />
      </span>
      <span class="tree-ico"><Icon :name="active ? 'folder-open' : 'folder'" :size="17" /></span>
      <span class="tree-title">{{ node.title || t('untitled') }}</span>
      <span v-if="count" class="tree-count">{{ count }}</span>
    </button>
    <div v-if="!flat && expanded && subfolders.length" class="tree-children">
      <FolderTreeItem v-for="f in subfolders" :key="f.id" :node="f" :depth="depth + 1" />
    </div>
  </div>
</template>
