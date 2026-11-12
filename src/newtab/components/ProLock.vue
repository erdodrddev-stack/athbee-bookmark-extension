<script setup>
import Icon from '../../components/Icon.vue'
import { t } from '../../shared/i18n'
import { LIMITS } from '../../shared/premium'
import { requirePro } from '../pro'

/** Shown in place of a paid panel on the free plan. */
defineProps({ feature: { type: String, required: true } })
</script>

<template>
  <div class="pro-lock">
    <Icon name="sparkle" :size="22" />
    <p class="lc-intro">{{ t('proWhy_' + feature, LIMITS) }}</p>
    <button class="btn btn-primary" @click="requirePro(feature)">{{ t('proSeeBenefits') }}</button>
  </div>
</template>
