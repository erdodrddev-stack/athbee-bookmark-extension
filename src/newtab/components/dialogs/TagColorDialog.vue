<script setup>
import { computed, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import { t } from '../../../shared/i18n'
import { tagColor, setTagColor, tagHue, normHex, readableOn } from '../../../shared/tags'

const props = defineProps({ name: { type: String, required: true } })
const emit = defineEmits(['close'])

/** The automatic pastel (light theme variant) as hex, to seed the picker. */
function hslHex(h, s, l) {
  s /= 100
  l /= 100
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

const auto = hslHex(tagHue(props.name), 85, 84)
const hex = ref(tagColor(props.name) || auto)
const custom = ref(!!tagColor(props.name)) // false = keep the automatic color
const valid = computed(() => normHex(hex.value))
const shown = computed(() => valid.value || auto)
const preview = computed(() =>
  custom.value && valid.value ? { '--tag-bg': valid.value, '--tag-fg': readableOn(valid.value) } : { '--h': tagHue(props.name) },
)

function set(v) {
  hex.value = v
  custom.value = true
}
function reset() {
  hex.value = auto
  custom.value = false
}
function save() {
  if (custom.value && !valid.value) return
  setTagColor(props.name, custom.value ? valid.value : null)
  emit('close')
}
</script>

<template>
  <Modal :title="t('tagColorTitle')" width="400px" @close="emit('close')">
    <form id="tag-color-form" @submit.prevent="save">
      <div class="tc-preview">
        <span class="tag" :style="preview"><span class="tag-hash">#</span>{{ name }}</span>
      </div>
      <div class="field">
        <label for="tag-hex">{{ t('tagColorHex') }}</label>
        <div class="tc-pick">
          <input
            type="color"
            class="tc-native"
            :value="shown"
            :aria-label="t('tagColorTitle')"
            @input="set($event.target.value)"
          />
          <input
            id="tag-hex"
            class="input tc-hex"
            :class="{ invalid: custom && !valid }"
            :value="hex"
            maxlength="7"
            spellcheck="false"
            autocomplete="off"
            @input="set($event.target.value)"
          />
        </div>
        <span class="field-hint">{{ custom && !valid ? t('tagColorInvalid') : t('tagColorHint') }}</span>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost tc-reset" :disabled="!custom" @click="reset">{{ t('tagColorReset') }}</button>
      <button type="button" class="btn btn-ghost" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="submit" form="tag-color-form" :disabled="custom && !valid">{{ t('save') }}</button>
    </template>
  </Modal>
</template>
