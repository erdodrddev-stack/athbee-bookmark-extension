<script setup>
import { computed } from 'vue'
import { tagStyle } from '../shared/tags'

const props = defineProps({
  name: { type: String, required: true },
  removable: Boolean,
  clickable: Boolean,
})
const emit = defineEmits(['remove', 'select'])
const style = computed(() => tagStyle(props.name))

function onClick(e) {
  if (!props.clickable) return
  e.preventDefault()
  e.stopPropagation()
  emit('select', props.name)
}
</script>

<template>
  <span class="tag" :class="{ clickable }" :style="style" :title="'#' + name" @click="onClick">
    <span class="tag-hash">#</span>{{ name }}
    <button
      v-if="removable"
      type="button"
      class="tag-x"
      :aria-label="'Remover ' + name"
      @click.stop.prevent="emit('remove', name)"
    >×</button>
  </span>
</template>
