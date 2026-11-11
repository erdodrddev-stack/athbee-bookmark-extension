<script setup>
import { computed } from 'vue'
import { flattenFolders, root } from '../shared/bookmarks'

const model = defineModel({ type: String })
const props = defineProps({ exclude: { type: String, default: null } })

const options = computed(() => {
  void root.value
  const all = flattenFolders()
  if (!props.exclude) return all
  // drop the excluded folder and its descendants
  const out = []
  let skipDepth = -1
  for (const f of all) {
    if (skipDepth >= 0 && f.depth > skipDepth) continue
    skipDepth = -1
    if (f.id === props.exclude) { skipDepth = f.depth; continue }
    out.push(f)
  }
  return out
})
const pad = (d) => '    '.repeat(d)
</script>

<template>
  <select v-model="model" class="input select">
    <option v-for="f in options" :key="f.id" :value="f.id">{{ pad(f.depth) + (f.title || '—') }}</option>
  </select>
</template>
