<script setup>
import { ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import { t } from '../../../shared/i18n'
import { isPro, license, LIMITS, PRO_FEATURES, devInstall, checkout, setDevPro } from '../../../shared/premium'
import { ui, toast } from '../../ui'

const props = defineProps({
  /** the feature that was blocked (one of PRO_FEATURES), or null when opened from settings */
  feature: { type: String, default: null },
  /** dialog to return to when this one closes */
  back: { type: Object, default: null },
})
const emit = defineEmits(['close'])

function close() {
  if (props.back) ui.dialog = props.back
  else emit('close')
}

const busy = ref(false)
async function buy() {
  busy.value = true
  try {
    await checkout.open()
  } catch {
    toast(t('proCheckoutFailed'))
  } finally {
    busy.value = false
  }
}

async function restore() {
  try {
    await checkout.login()
  } catch {
    toast(t('proCheckoutFailed'))
  }
}

async function devToggle() {
  await setDevPro(!isPro.value)
  toast(isPro.value ? t('proDevOn') : t('proDevOff'))
  if (isPro.value) close()
}
</script>

<template>
  <Modal :title="isPro ? t('proActiveTitle') : t('proTitle')" width="540px" @close="close">
    <div class="pro">
      <p v-if="feature && !isPro" class="pro-why">
        <Icon name="sparkle" :size="16" />
        <span>{{ t('proWhy_' + feature, LIMITS) }}</span>
      </p>
      <p class="pro-lead">{{ isPro ? t('proActiveLead') : t('proLead') }}</p>
      <ul class="pro-list">
        <li v-for="f in PRO_FEATURES" :key="f" :class="{ on: f === feature }">
          <Icon name="check" :size="15" />
          <span>{{ t('proFeat_' + f) }}</span>
        </li>
      </ul>
      <p class="st-hint">{{ t('proPrivacy') }}</p>
      <p v-if="!isPro && checkout" class="st-hint">
        {{ t('proRestoreQ') }} <button class="link-btn" @click="restore">{{ t('proRestore') }}</button>
      </p>
      <p v-else-if="license.source === 'extpay' && license.email" class="st-hint">{{ t('proBoughtWith', { email: license.email }) }}</p>
    </div>

    <template #footer>
      <button v-if="devInstall && license.source !== 'extpay'" class="btn btn-ghost pro-btn pro-dev" :title="t('proDevHint')" @click="devToggle">
        {{ isPro ? t('proDevDisable') : t('proDevEnable') }}
      </button>
      <button class="btn btn-ghost pro-btn" @click="close">{{ isPro ? t('close') : t('proNotNow') }}</button>
      <button v-if="!isPro" class="btn btn-primary pro-btn" :disabled="!checkout || busy" @click="buy">
        {{ busy ? t('proOpening') : checkout ? t('proBuy') : t('proSoon') }}
      </button>
    </template>
  </Modal>
</template>
