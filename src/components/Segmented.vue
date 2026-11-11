<script setup>
import Icon from './Icon.vue'

const model = defineModel({ type: [String, Number] })
defineProps({ options: { type: Array, required: true } }) // [{ value, label, icon? }]
</script>

<template>
  <div class="seg" role="radiogroup">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :class="{ on: model === o.value }"
      @click="model = o.value"
    >
      <Icon v-if="o.icon" :name="o.icon" :size="15" />
      {{ o.label }}
    </button>
  </div>
</template>
