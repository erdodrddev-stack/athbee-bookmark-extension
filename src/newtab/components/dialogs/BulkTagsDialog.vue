<script setup>
import { computed, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import TagInput from '../../../components/TagInput.vue'
import TagPill from '../../../components/TagPill.vue'
import { t } from '../../../shared/i18n'
import { toast } from '../../ui'
import { sel, selectionTags, editSelectedTags } from '../../selection'

const emit = defineEmits(['close'])
const current = selectionTags()
const add = ref([])
const remove = ref([])
const total = sel.ids.length

const toggleRemove = (name) => {
  remove.value = remove.value.includes(name) ? remove.value.filter((x) => x !== name) : [...remove.value, name]
}
const changed = computed(() => add.value.length > 0 || remove.value.length > 0)

function save() {
  if (!changed.value) return emit('close')
  const undo = editSelectedTags(add.value, remove.value)
  toast(t('bulkTagsDone', { n: total }), t('undo'), undo)
  emit('close')
}
</script>

<template>
  <Modal :title="t('bulkTagsTitle', { n: total })" width="480px" @close="emit('close')">
    <div class="field">
      <label for="bulk-add">{{ t('bulkAddTags') }}</label>
      <TagInput id="bulk-add" v-model="add" />
      <span class="field-hint">{{ t('bulkAddHint') }}</span>
    </div>
    <div v-if="current.length" class="field">
      <label>{{ t('bulkCurrentTags') }}</label>
      <div class="bulk-tags">
        <button
          v-for="tg in current"
          :key="tg.name"
          type="button"
          class="bulk-tag"
          :class="{ removing: remove.includes(tg.name) }"
          :title="remove.includes(tg.name) ? t('bulkKeepTag') : t('bulkRemoveTag')"
          @click="toggleRemove(tg.name)"
        >
          <TagPill :name="tg.name" />
          <span class="bulk-tag-n">{{ tg.count }}/{{ total }}</span>
        </button>
      </div>
      <span class="field-hint">{{ t('bulkRemoveHint') }}</span>
    </div>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" :disabled="!changed" @click="save">{{ t('save') }}</button>
    </template>
  </Modal>
</template>
