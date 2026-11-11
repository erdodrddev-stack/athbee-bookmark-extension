<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import Icon from './Icon.vue'
import { settings } from '../shared/settings'
import { t } from '../shared/i18n'

const mq = matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(mq.matches)
const onMq = () => (systemDark.value = mq.matches)
mq.addEventListener('change', onMq)
onBeforeUnmount(() => mq.removeEventListener('change', onMq))

const dark = computed(() => settings.theme === 'dark' || (settings.theme === 'system' && systemDark.value))
const toggle = () => (settings.theme = dark.value ? 'light' : 'dark')
</script>

<template>
  <button
    type="button"
    role="switch"
    class="theme-switch"
    :class="{ on: dark }"
    :aria-checked="dark"
    :aria-label="t('darkMode')"
    :title="dark ? t('light') : t('dark')"
    @click="toggle"
  >
    <Icon name="sun" :size="13" class="ts-ico ts-sun" />
    <Icon name="moon" :size="13" class="ts-ico ts-moon" />
    <span class="ts-knob"><Icon :name="dark ? 'moon' : 'sun'" :size="13" /></span>
  </button>
</template>
