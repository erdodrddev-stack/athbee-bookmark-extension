<script setup>
import Icon from './Icon.vue'

const model = defineModel({ type: String })
defineProps({ options: { type: Array, required: true } }) // [{ value, color, label }]
</script>

<template>
  <div class="swatches" role="radiogroup">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      class="swatch"
      :class="{ on: model === o.value }"
      :style="{ background: o.color }"
      :aria-checked="model === o.value"
      :aria-label="o.label"
      :title="o.label"
      @click="model = o.value"
    >
      <Icon v-if="model === o.value" name="check" :size="16" />
    </button>
  </div>
</template>
