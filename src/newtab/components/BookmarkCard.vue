<script setup>
import { computed, ref } from 'vue'
import Icon from '../../components/Icon.vue'
import { settings, meta } from '../../shared/settings'
import { faviconUrl, hostOf } from '../../shared/util'
import { tintFor, extractTint } from '../../shared/tint'
import { openMenu } from '../ui'
import { bookmarkMenu, historyMenu } from '../menus'
import { openFromEvent } from '../actions'
import { dnd, startDrag, endDrag, canDrop, dropBeside } from '../dnd'
import { tagsOf } from '../../shared/tags'
import { applyTag } from '../search'
import TagPill from '../../components/TagPill.vue'

const props = defineProps({
  node: { type: Object, required: true },
  /** a history entry rather than a real bookmark */
  history: Boolean,
  /** don't accept drops (e.g. recommendations) */
  noDrop: Boolean,
})

const host = computed(() => hostOf(props.node.url))
const icon = computed(() => faviconUrl(props.node.url, 32))
const tint = ref(tintFor(host.value))
const pinned = computed(() => !props.history && meta.pinned.includes(props.node.id))
const hidden = computed(() => !props.history && meta.hidden.includes(props.node.id))
const dropPos = computed(() => (!props.noDrop && dnd.overId === props.node.id ? dnd.pos : null))
const vertical = computed(() => settings.layout === 'columns')
const MAX_TAGS = 2
const tags = computed(() => (props.history ? [] : tagsOf(props.node.id)))
const shownTags = computed(() => tags.value.slice(0, MAX_TAGS))
const extraTags = computed(() => tags.value.length - shownTags.value.length)

function onImg(e) {
  if (!tint.value) tint.value = extractTint(e.target, host.value)
}
function onClick(e) {
  openFromEvent(e, props.node.url)
}
function onAux(e) {
  if (e.button === 1) { e.preventDefault(); openFromEvent(e, props.node.url) }
}
function onMenu(e) {
  openMenu(e, props.history ? historyMenu(props.node) : bookmarkMenu(props.node))
}
function onDragStart(e) {
  startDrag(e, props.node, props.history ? { url: props.node.url, title: props.node.title } : null)
}
function onDragOver(e) {
  if (props.noDrop || props.history || !canDrop(e) || dnd.id === props.node.id) return
  e.preventDefault()
  e.stopPropagation()
  const r = e.currentTarget.getBoundingClientRect()
  const after = vertical.value ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2
  dnd.overId = props.node.id
  dnd.pos = after ? 'after' : 'before'
}
function onDragLeave() {
  if (dnd.overId === props.node.id) dnd.overId = null
}
function onDrop(e) {
  if (props.noDrop || props.history) return
  e.preventDefault()
  e.stopPropagation()
  dropBeside(e, props.node, dnd.pos === 'after')
}
</script>

<template>
  <a
    class="bm"
    :class="[
      settings.style === 'compact' ? 'bm-compact' : 'bm-card',
      {
        'is-pinned': pinned,
        'is-hidden': hidden,
        'is-dragging': dnd.id === node.id,
        'drop-before': dropPos === 'before',
        'drop-after': dropPos === 'after',
      },
    ]"
    :href="node.url"
    :title="(node.title ? node.title + '\n' : '') + node.url + (tags.length ? '\n' + tags.map((x) => '#' + x).join(' ') : '')"
    :style="tint ? { '--tint': tint } : null"
    draggable="true"
    @click.prevent="onClick"
    @auxclick="onAux"
    @contextmenu.prevent.stop="onMenu"
    @dragstart="onDragStart"
    @dragend="endDrag"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <span class="bm-icon">
      <img :src="icon" alt="" width="20" height="20" draggable="false" @load="onImg" />
    </span>
    <span class="bm-text">
      <span class="bm-title">{{ node.title || host }}</span>
      <span v-if="settings.style !== 'compact'" class="bm-sub">
        <span class="bm-url">{{ host }}</span>
        <template v-if="tags.length">
          <TagPill v-for="tg in shownTags" :key="tg" :name="tg" clickable class="bm-tag" @select="applyTag" />
          <span v-if="extraTags" class="bm-tag-more" :title="tags.map((x) => '#' + x).join(' ')">+{{ extraTags }}</span>
        </template>
      </span>
    </span>
    <span v-if="settings.style === 'compact' && tags.length" class="bm-tags-compact" :title="tags.map((x) => '#' + x).join(' ')">
      <TagPill :name="tags[0]" clickable class="bm-tag" @select="applyTag" />
      <span v-if="tags.length > 1" class="bm-tag-more">+{{ tags.length - 1 }}</span>
    </span>
    <Icon v-if="pinned" name="pin" :size="12" class="bm-pin" />
  </a>
</template>
