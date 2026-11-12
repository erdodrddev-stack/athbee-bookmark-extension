<script setup>
import LookPreview from './LookPreview.vue'
import ProBadge from './ProBadge.vue'

/** Radio group whose options each show a LookPreview. */
const model = defineModel({ type: String })
defineProps({
  options: { type: Array, required: true }, // [{ value, label, look, accent, pro? }]
  dark: Boolean,
  label: String, // accessible name of the group
})
</script>

<template>
  <div class="pv-pick" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      class="pv-opt"
      :class="{ on: model === o.value }"
      :aria-checked="model === o.value"
      @click="model = o.value"
    >
      <LookPreview :look="o.look" :accent="o.accent" :dark="dark" />
      <span class="pv-label">{{ o.label }}<ProBadge v-if="o.pro" /></span>
    </button>
  </div>
</template>
