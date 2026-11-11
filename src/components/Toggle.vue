<script setup>
const model = defineModel({ type: Boolean })
</script>

<template>
  <button type="button" role="switch" class="switch" :class="{ on: model }" :aria-checked="model" @click="model = !model" />
</template>
