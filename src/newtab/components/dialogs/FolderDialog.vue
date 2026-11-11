<script setup>
import { ref, onMounted } from 'vue'
import Modal from '../../../components/Modal.vue'
import FolderSelect from '../../../components/FolderSelect.vue'
import { t } from '../../../shared/i18n'
import { defaultFolderId } from '../../../shared/bookmarks'
import { toast } from '../../ui'

const props = defineProps({
  node: Object, // renaming
  parentId: String,
})
const emit = defineEmits(['close'])

const name = ref(props.node?.title ?? '')
const parent = ref(props.node?.parentId ?? props.parentId ?? defaultFolderId())
const first = ref(null)

onMounted(() => {
  first.value?.focus()
  first.value?.select()
})

async function save() {
  const title = name.value.trim()
  if (!title) return
  try {
    if (props.node) {
      await chrome.bookmarks.update(props.node.id, { title })
      if (parent.value !== props.node.parentId) await chrome.bookmarks.move(props.node.id, { parentId: parent.value })
    } else {
      await chrome.bookmarks.create({ parentId: parent.value, title })
    }
    emit('close')
  } catch (e) {
    toast(String(e?.message || e))
  }
}
</script>

<template>
  <Modal :title="node ? t('renameFolder') : t('addFolder')" @close="emit('close')">
    <form id="folder-form" @submit.prevent="save">
      <div class="field">
        <label for="f-name">{{ t('folderName') }}</label>
        <input id="f-name" ref="first" v-model="name" class="input" required />
      </div>
      <div class="field">
        <label for="f-parent">{{ t('parentFolder') }}</label>
        <FolderSelect id="f-parent" v-model="parent" :exclude="node?.id" />
      </div>
    </form>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="folder-form">{{ t('save') }}</button>
    </template>
  </Modal>
</template>
