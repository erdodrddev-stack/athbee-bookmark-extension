<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import { t } from '../../../shared/i18n'
import { hostOf } from '../../../shared/util'
import { copyText } from '../../actions'

const props = defineProps({ url: String, title: String })
const emit = defineEmits(['close'])
const canvas = ref(null)

onMounted(() => {
  QRCode.toCanvas(canvas.value, props.url, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
})

function download() {
  const a = document.createElement('a')
  a.href = canvas.value.toDataURL('image/png')
  a.download = `qr-${hostOf(props.url) || 'link'}.png`
  a.click()
}
</script>

<template>
  <Modal :title="t('showQr')" width="360px" @close="emit('close')">
    <div class="qr">
      <canvas ref="canvas" class="qr-canvas" />
      <div class="qr-title">{{ title || hostOf(url) }}</div>
      <div class="qr-url">{{ url }}</div>
    </div>
    <template #footer>
      <button class="btn btn-ghost" @click="copyText(url)"><Icon name="copy" :size="16" /> {{ t('copyUrl') }}</button>
      <button class="btn btn-primary" @click="download"><Icon name="download" :size="16" /> {{ t('downloadPng') }}</button>
    </template>
  </Modal>
</template>
