<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import { settings, meta } from '../../shared/settings'
import { faviconUrl, hostOf, shortLabel } from '../../shared/util'
import { openMenu } from '../ui'
import { bookmarkMenu, historyMenu } from '../menus'
import { openFromEvent } from '../actions'
import { dnd, startDrag, endDrag, canDrop, dropBeside } from '../dnd'
import { tagsOf } from '../../shared/tags'
import { applyTag } from '../search'
import TagPill from '../../components/TagPill.vue'
import { t } from '../../shared/i18n'
import { sel, isSelected, toggleSelect, selectRange } from '../selection'

const props = defineProps({
  node: { type: Object, required: true },
  /** a history entry rather than a real bookmark */
  history: Boolean,
  /** don't accept drops (e.g. recommendations) */
  noDrop: Boolean,
})

const host = computed(() => hostOf(props.node.url))
const icon = computed(() => faviconUrl(props.node.url, 32))
const pinned = computed(() => !props.history && meta.pinned.includes(props.node.id))
const hidden = computed(() => !props.history && meta.hidden.includes(props.node.id))
const dropPos = computed(() => (!props.noDrop && dnd.overId === props.node.id ? dnd.pos : null))
const isIcon = computed(() => settings.style === 'icon')
const styleClass = computed(() => ({ compact: 'bm-compact', icon: 'bm-tile' })[settings.style] || 'bm-card')
const label = computed(() => (isIcon.value ? shortLabel(props.node.title, props.node.url) : props.node.title || host.value))
// icon tiles flow left-to-right even inside a column
const vertical = computed(() => settings.layout === 'columns' && !isIcon.value)
const MAX_TAGS = 2
const tags = computed(() => (props.history ? [] : tagsOf(props.node.id)))
const shownTags = computed(() => tags.value.slice(0, MAX_TAGS))
const extraTags = computed(() => tags.value.length - shownTags.value.length)

const selectable = computed(() => !props.history)
const selected = computed(() => selectable.value && isSelected(props.node.id))

function onClick(e) {
  if (selectable.value && sel.ids.length) {
    if (e.shiftKey) selectRange(props.node.id)
    else toggleSelect(props.node.id)
    return
  }
  openFromEvent(e, props.node.url)
}
function onCheck(e) {
  if (e.shiftKey && sel.ids.length) selectRange(props.node.id)
  else toggleSelect(props.node.id)
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
      styleClass,
      {
        'is-pinned': pinned,
        'is-selected': selected,
        'is-hidden': hidden,
        'is-dragging': dnd.id === node.id,
        'drop-before': dropPos === 'before',
        'drop-after': dropPos === 'after',
      },
    ]"
    :href="node.url"
    :data-id="selectable ? node.id : null"
    :title="(node.title ? node.title + '\n' : '') + node.url + (tags.length ? '\n' + tags.map((x) => '#' + x).join(' ') : '')"
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
    <span
      v-if="selectable"
      class="bm-check"
      role="checkbox"
      :aria-checked="selected"
      :title="t('select')"
      @click.stop.prevent="onCheck"
    ><Icon name="check" :size="12" /></span>
    <span class="bm-icon">
      <img :src="icon" alt="" width="20" height="20" draggable="false" />
    </span>
    <span class="bm-text">
      <span class="bm-title">{{ label }}</span>
      <span v-if="settings.style === 'card'" class="bm-sub">
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
