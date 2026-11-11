<script setup>
import { ref, computed, onMounted } from 'vue'
import Modal from '../../../components/Modal.vue'
import TagPill from '../../../components/TagPill.vue'
import { t } from '../../../shared/i18n'
import { normTag, renameTag, allTags } from '../../../shared/tags'
import { ui } from '../../ui'

const props = defineProps({ name: { type: String, required: true } })
const emit = defineEmits(['close'])

const value = ref(props.name)
const input = ref(null)
const next = computed(() => normTag(value.value))
const merges = computed(() => next.value !== props.name && allTags.value.some((x) => x.name === next.value))

onMounted(() => {
  input.value?.focus()
  input.value?.select()
})

function save() {
  if (!next.value) return
  renameTag(props.name, next.value)
  // keep an active filter pointing at the new name
  ui.query = ui.query
    .split(/(\s+)/)
    .map((tk) => (tk.startsWith('#') && normTag(tk) === props.name ? '#' + next.value : tk))
    .join('')
  emit('close')
}
</script>

<template>
  <Modal :title="t('renameTag')" width="400px" @close="emit('close')">
    <form id="tag-form" @submit.prevent="save">
      <div class="field">
        <label for="tag-name">{{ t('tagName') }}</label>
        <input id="tag-name" ref="input" v-model="value" class="input" required spellcheck="false" />
        <span class="field-hint">
          <template v-if="next">{{ t('tagWillBe') }} <TagPill :name="next" /></template>
          <template v-if="merges"> · {{ t('tagMerge') }}</template>
        </span>
      </div>
    </form>
    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="tag-form">{{ t('save') }}</button>
    </template>
  </Modal>
</template>
