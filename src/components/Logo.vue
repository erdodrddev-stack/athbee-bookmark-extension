<script setup>
defineProps({ size: { type: [Number, String], default: 24 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <linearGradient id="bd-logo-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8b5cf6" />
        <stop offset="1" stop-color="#5b3cc4" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#bd-logo-g)" />
    <path d="M33 22h34v58L50 64 33 80z" fill="#fff" />
  </svg>
</template>
