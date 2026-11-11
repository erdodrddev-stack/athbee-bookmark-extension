<script setup>
import { ref, computed } from 'vue'
import TagPill from './TagPill.vue'
import { allTags, normTag } from '../shared/tags'
import { t } from '../shared/i18n'

const model = defineModel({ type: Array, default: () => [] })
defineProps({ id: String })

const text = ref('')
const focused = ref(false)
const active = ref(0)
const input = ref(null)

const suggestions = computed(() => {
  const q = normTag(text.value)
  return allTags.value
    .filter((x) => !model.value.includes(x.name) && (!q || x.name.includes(q)))
    .sort((a, b) => (b.name.startsWith(q) ? 1 : 0) - (a.name.startsWith(q) ? 1 : 0) || b.count - a.count)
    .slice(0, 6)
})
const open = computed(() => focused.value && suggestions.value.length > 0 && (text.value || model.value.length < 50))

function add(name) {
  const n = normTag(name)
  if (n && !model.value.includes(n)) model.value = [...model.value, n]
  text.value = ''
  active.value = 0
}
function remove(name) {
  model.value = model.value.filter((x) => x !== name)
}

function onKey(e) {
  if (e.key === 'ArrowDown' && open.value) {
    e.preventDefault()
    active.value = (active.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp' && open.value) {
    e.preventDefault()
    active.value = (active.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && text.value)) {
    // empty input + Enter → let the surrounding form submit
    if (!text.value.trim() && e.key === 'Enter') return
    e.preventDefault()
    const pick = open.value && text.value && suggestions.value[active.value]
    add(pick && pick.name.startsWith(normTag(text.value)) ? pick.name : text.value)
  } else if (e.key === 'Backspace' && !text.value && model.value.length) {
    model.value = model.value.slice(0, -1)
  } else if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    focused.value = false
  }
}
function onBlur() {
  focused.value = false
  if (text.value.trim()) add(text.value)
}
</script>

<template>
  <div class="tag-input" :class="{ focused }" @mousedown.self.prevent="input?.focus()">
    <TagPill v-for="tg in model" :key="tg" :name="tg" removable @remove="remove" />
    <input
      :id="id"
      ref="input"
      v-model="text"
      class="tag-input-field"
      :placeholder="model.length ? '' : t('addTagPlaceholder')"
      spellcheck="false"
      autocomplete="off"
      @keydown="onKey"
      @focus="focused = true"
      @blur="onBlur"
      @input="active = 0"
    />
    <div v-if="open" class="tag-suggest" @mousedown.prevent>
      <button
        v-for="(s, i) in suggestions"
        :key="s.name"
        type="button"
        class="tag-suggest-item"
        :class="{ active: i === active }"
        @mouseenter="active = i"
        @click="add(s.name)"
      >
        <TagPill :name="s.name" />
        <span class="tag-suggest-count">{{ s.count }}</span>
      </button>
    </div>
  </div>
</template>
