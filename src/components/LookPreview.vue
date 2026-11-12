<script>
let uid = 0
</script>

<script setup>
import { computed } from 'vue'

/**
 * A tiny drawing of the new tab (sidebar, a card, a button) in a given look, accent
 * and theme, mirroring the tokens in base.css / looks.css.
 */
const props = defineProps({
  look: { type: String, default: 'modern' }, // 'brutal' | 'modern' | 'cyber'
  accent: { type: String, required: true }, // hex
  dark: Boolean,
})

const id = 'lp' + ++uid

const p = computed(() => {
  const d = props.dark
  const ink = d ? '#fffff0' : '#191919'
  const base = {
    bg: d ? '#191919' : '#f3f2e4',
    card: d ? '#222220' : '#fffff0',
    ink,
    muted: d ? '#93928a' : '#75736a',
    dots: d ? 'rgba(255,255,240,0.16)' : 'rgba(25,25,25,0.2)',
  }
  if (props.look === 'modern') {
    return { ...base, r: 3, edge: d ? 'rgba(255,255,240,0.2)' : 'rgba(25,25,25,0.16)', dots: null, btnEdge: 'none', shadow: 'soft' }
  }
  if (props.look === 'cyber') {
    return { ...base, r: 3, card: d ? '#191919' : '#fffff0', edge: ink, btnEdge: ink, shadow: 'glow' }
  }
  // brutal: square corners, ink borders, hard offset shadow (the accent's, in dark mode)
  return { ...base, r: 0, edge: ink, btnEdge: ink, shadow: 'hard', hard: d ? props.accent : ink }
})
const filter = computed(() => (p.value.shadow === 'hard' ? null : `url(#${id}-fx)`))
</script>

<template>
  <svg class="look-preview" viewBox="0 0 64 44" width="64" height="44" aria-hidden="true">
    <defs>
      <pattern v-if="p.dots" :id="id + '-dots'" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.5" :fill="p.dots" />
      </pattern>
      <filter :id="id + '-fx'" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow
          v-if="p.shadow === 'soft'"
          dx="0" dy="1" stdDeviation="1.2"
          :flood-color="dark ? '#000' : '#191919'" :flood-opacity="dark ? 0.5 : 0.16"
        />
        <feDropShadow v-else dx="0" dy="0" stdDeviation="1.6" :flood-color="accent" flood-opacity="0.9" />
      </filter>
    </defs>

    <!-- page and sidebar -->
    <rect width="64" height="44" :fill="p.bg" />
    <rect v-if="p.dots" x="17" width="47" height="44" :fill="`url(#${id}-dots)`" />
    <rect width="17" height="44" :fill="p.bg" />
    <line x1="17" y1="0" x2="17" y2="44" :stroke="p.edge" stroke-width="0.6" />
    <rect x="3" y="6" width="11" height="4" :rx="p.r" :fill="accent" :stroke="p.btnEdge" stroke-width="0.6" />
    <rect x="4" y="14" width="9" height="1.6" rx="0.8" :fill="p.muted" opacity="0.6" />
    <rect x="4" y="19" width="7" height="1.6" rx="0.8" :fill="p.muted" opacity="0.6" />

    <!-- a bookmark card -->
    <rect v-if="p.shadow === 'hard'" x="24" y="8" width="35" height="14" :fill="p.hard" />
    <rect x="22" y="6" width="35" height="14" :rx="p.r" :fill="p.card" :stroke="p.edge" stroke-width="0.8" :filter="filter" />
    <rect x="25" y="9.5" width="4" height="4" :rx="p.r ? 1 : 0" :fill="p.muted" opacity="0.7" />
    <rect x="31" y="9.5" width="17" height="2" rx="1" :fill="p.ink" />
    <rect x="31" y="14" width="11" height="1.6" rx="0.8" :fill="p.muted" />

    <!-- a primary button -->
    <rect v-if="p.shadow === 'hard'" x="24" y="29" width="20" height="8" :fill="p.hard" />
    <rect x="22" y="27" width="20" height="8" :rx="p.r" :fill="accent" :stroke="p.btnEdge" stroke-width="0.8" :filter="filter" />
    <rect x="26" y="30.2" width="12" height="1.6" rx="0.8" fill="#191919" opacity="0.75" />
  </svg>
</template>
