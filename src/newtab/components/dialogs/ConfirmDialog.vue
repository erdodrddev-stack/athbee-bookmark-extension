<script setup>
import Modal from '../../../components/Modal.vue'
import { t } from '../../../shared/i18n'

const props = defineProps({
  message: String,
  confirmLabel: String,
  danger: Boolean,
  onConfirm: Function,
})
const emit = defineEmits(['close'])

function confirm() {
  emit('close')
  props.onConfirm?.()
}
</script>

<template>
  <Modal :title="t('confirm')" width="400px" @close="emit('close')">
    <p class="confirm-msg">{{ message }}</p>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" autofocus @click="confirm">
        {{ confirmLabel || t('confirm') }}
      </button>
    </template>
  </Modal>
</template>
