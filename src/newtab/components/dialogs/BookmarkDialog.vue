<script setup>
import { ref, onMounted } from 'vue'
import Modal from '../../../components/Modal.vue'
import FolderSelect from '../../../components/FolderSelect.vue'
import TagInput from '../../../components/TagInput.vue'
import { tagsOf, setTags } from '../../../shared/tags'
import { t } from '../../../shared/i18n'
import { defaultFolderId } from '../../../shared/bookmarks'
import { hostOf } from '../../../shared/util'
import { toast } from '../../ui'

const props = defineProps({
  node: Object, // editing an existing bookmark
  parentId: String,
  url: String,
  title: String,
  focusTags: Boolean,
})
const emit = defineEmits(['close'])

const title = ref(props.node?.title ?? props.title ?? '')
const url = ref(props.node?.url ?? props.url ?? '')
const folder = ref(props.node?.parentId ?? props.parentId ?? defaultFolderId())
const tags = ref([...tagsOf(props.node?.id)])
const first = ref(null)

onMounted(() => {
  if (props.focusTags) document.getElementById('bm-tags')?.focus()
  else first.value?.focus()
})

async function save() {
  let u = url.value.trim()
  if (!u) return
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u
  const tt = title.value.trim() || hostOf(u)
  try {
    if (props.node) {
      await chrome.bookmarks.update(props.node.id, { title: tt, url: u })
      if (folder.value !== props.node.parentId) await chrome.bookmarks.move(props.node.id, { parentId: folder.value })
      setTags(props.node.id, tags.value)
    } else {
      const created = await chrome.bookmarks.create({ parentId: folder.value, title: tt, url: u })
      setTags(created.id, tags.value)
      toast(t('added'))
    }
    emit('close')
  } catch (e) {
    toast(String(e?.message || e))
  }
}
</script>

<template>
  <Modal :title="node ? t('editBookmark') : t('addBookmark')" @close="emit('close')">
    <form id="bm-form" @submit.prevent="save">
      <div class="field">
        <label for="bm-title">{{ t('title') }}</label>
        <input id="bm-title" ref="first" v-model="title" class="input" />
      </div>
      <div class="field">
        <label for="bm-url">{{ t('url') }}</label>
        <input id="bm-url" v-model="url" class="input" required spellcheck="false" placeholder="https://" />
      </div>
      <div class="field">
        <label for="bm-folder">{{ t('folder') }}</label>
        <FolderSelect id="bm-folder" v-model="folder" />
      </div>
      <div class="field">
        <label for="bm-tags">{{ t('tags') }}</label>
        <TagInput id="bm-tags" v-model="tags" />
        <span class="field-hint">{{ t('tagsHint') }}</span>
      </div>
    </form>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="bm-form">{{ t('save') }}</button>
    </template>
  </Modal>
</template>
