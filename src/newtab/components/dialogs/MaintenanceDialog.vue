<script setup>
import { ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import { t } from '../../../shared/i18n'
import { extraCopies } from '../../duplicates'
import { check } from '../../linkcheck'
import StalePanel from '../maintenance/StalePanel.vue'
import DuplicatesPanel from '../maintenance/DuplicatesPanel.vue'
import LinkCheckPanel from '../maintenance/LinkCheckPanel.vue'

const props = defineProps({
  tab: { type: String, default: 'stale' }, // 'stale' | 'duplicates' | 'links'
  /** folder to limit the link check to */
  scopeId: { type: String, default: null },
})
const emit = defineEmits(['close'])
const current = ref(props.tab)
</script>

<template>
  <Modal :title="t('maintenance')" width="760px" @close="emit('close')">
    <nav class="mt-tabs" role="tablist">
      <button role="tab" :aria-selected="current === 'stale'" :class="{ on: current === 'stale' }" @click="current = 'stale'">
        <Icon name="clock" :size="15" /> {{ t('stale') }}
      </button>
      <button role="tab" :aria-selected="current === 'duplicates'" :class="{ on: current === 'duplicates' }" @click="current = 'duplicates'">
        <Icon name="copy" :size="15" /> {{ t('duplicates') }}
        <span v-if="extraCopies" class="mt-badge">{{ extraCopies }}</span>
      </button>
      <button role="tab" :aria-selected="current === 'links'" :class="{ on: current === 'links' }" @click="current = 'links'">
        <Icon name="link-off" :size="15" /> {{ t('linkCheck') }}
        <span v-if="check.running" class="mt-badge">{{ check.done }}/{{ check.total }}</span>
        <span v-else-if="check.finishedAt && check.results.length" class="mt-badge">{{ check.results.length }}</span>
      </button>
    </nav>

    <StalePanel v-if="current === 'stale'" />
    <DuplicatesPanel v-else-if="current === 'duplicates'" />
    <LinkCheckPanel v-else :scope-id="scopeId" />
  </Modal>
</template>
