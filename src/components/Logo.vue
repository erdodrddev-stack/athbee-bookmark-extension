<script setup>
defineProps({ size: { type: [Number, String], default: 24 } })
// the bee on a bookmark (public/icons, built by scripts/make-icons.py)
const src = 'icons/logo-256.png'
</script>

<template>
  <img class="logo" :src="src" :width="size" :height="size" alt="" draggable="false" />
</template>
