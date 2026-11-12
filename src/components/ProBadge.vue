<script setup>
import { isPro } from '../shared/premium'
</script>

<!-- Marks a paid feature; hidden once Pro is active. -->
<template>
  <span v-if="!isPro" class="pro-badge">PRO</span>
</template>
