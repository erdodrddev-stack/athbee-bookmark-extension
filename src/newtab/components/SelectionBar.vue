<script setup>
import { ref, watch } from 'vue'
import Icon from '../../components/Icon.vue'
import { t } from '../../shared/i18n'
import { openDialog } from '../ui'
import { sel, clearSelection, openSelected, toggleHiddenSelected, allHidden, deleteSelected } from '../selection'

const confirming = ref(false)
watch(() => sel.ids.length, () => (confirming.value = false))

function onDelete() {
  if (!confirming.value) { confirming.value = true; return }
  confirming.value = false
  deleteSelected()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="sel.ids.length" class="sel-bar" role="toolbar" :aria-label="t('bulkSelected', { n: sel.ids.length })">
        <span class="sel-count">{{ t('bulkSelected', { n: sel.ids.length }) }}</span>
        <button class="sel-btn" @click="openSelected"><Icon name="external" :size="15" /> {{ t('open') }}</button>
        <button class="sel-btn" @click="openDialog('bulkMove')"><Icon name="folder-open" :size="15" /> {{ t('staleMove') }}</button>
        <button class="sel-btn" @click="openDialog('bulkTags')"><Icon name="tag" :size="15" /> {{ t('bulkTags') }}</button>
        <button class="sel-btn" @click="toggleHiddenSelected">
          <Icon :name="allHidden() ? 'eye' : 'eye-off'" :size="15" /> {{ allHidden() ? t('unhide') : t('hide') }}
        </button>
        <button class="sel-btn sel-del" :class="{ confirming }" @click="onDelete">
          <Icon name="trash" :size="15" /> {{ confirming ? t('lcConfirmDelete', { n: sel.ids.length }) : t('delete') }}
        </button>
        <button class="sel-btn sel-x" :title="t('bulkClear')" @click="clearSelection"><Icon name="x" :size="16" /></button>
      </div>
    </Transition>
  </Teleport>
</template>
