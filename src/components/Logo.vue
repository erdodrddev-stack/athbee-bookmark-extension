<script setup>
defineProps({ size: { type: [Number, String], default: 24 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" rx="24" fill="#191919" />
    <path d="M33 22h34v58L50 64 33 80z" fill="#f6c324" />
  </svg>
</template>
