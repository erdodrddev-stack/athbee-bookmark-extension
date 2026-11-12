<script setup>
import { ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import FolderSelect from '../../../components/FolderSelect.vue'
import { t } from '../../../shared/i18n'
import { getNode, defaultFolderId } from '../../../shared/bookmarks'
import { ui, inFolder } from '../../ui'
import { sel, moveSelected } from '../../selection'

const emit = defineEmits(['close'])
// suggest the folder being viewed, else the parent of the first selected bookmark
const dest = ref(inFolder() ? ui.current : getNode(sel.ids[0])?.parentId || defaultFolderId())

async function save() {
  await moveSelected(dest.value)
  emit('close')
}
</script>

<template>
  <Modal :title="t('bulkMoveTitle', { n: sel.ids.length })" width="420px" @close="emit('close')">
    <form id="bulk-move" @submit.prevent="save">
      <div class="field">
        <label for="bulk-dest">{{ t('folder') }}</label>
        <FolderSelect id="bulk-dest" v-model="dest" />
      </div>
    </form>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="bulk-move">{{ t('staleMove') }}</button>
    </template>
  </Modal>
</template>
