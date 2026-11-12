<script setup>
import { computed, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import Icon from '../../../components/Icon.vue'
import Swatches from '../../../components/Swatches.vue'
import Segmented from '../../../components/Segmented.vue'
import { t } from '../../../shared/i18n'
import { settings, meta, ACCENTS, LOOKS } from '../../../shared/settings'
import { root, flattenFolders } from '../../../shared/bookmarks'
import { activeWs, createWorkspace, deleteWorkspace, switchWorkspace } from '../../../shared/workspaces'
import { toast } from '../../ui'
import ProBadge from '../../../components/ProBadge.vue'
import { LIMITS, isPro } from '../../../shared/premium'
import { requirePro } from '../../pro'

const props = defineProps({ editId: String, create: Boolean })
const emit = defineEmits(['close'])

function newOne() {
  if (meta.workspaces.length >= LIMITS.workspaces && !requirePro('workspaces', { type: 'workspaces', props: { editId: selected.value } })) return null
  const w = createWorkspace(t('wsDefaultName', { n: meta.workspaces.length + 1 }))
  selected.value = w.id
  return w
}

const selected = ref(props.editId || meta.workspaces[0]?.id || null)
if (props.create || !meta.workspaces.length) newOne()

const ws = computed(() => meta.workspaces.find((w) => w.id === selected.value) || null)

const folders = computed(() => {
  void root.value
  return flattenFolders()
})
/** ids of chosen folders and everything below them (shown as included) */
const covered = computed(() => {
  const chosen = new Set(ws.value?.folders || [])
  const out = new Set()
  let depthIn = -1
  for (const f of folders.value) {
    if (depthIn >= 0 && f.depth > depthIn) { out.add(f.id); continue }
    depthIn = -1
    if (chosen.has(f.id)) { out.add(f.id); depthIn = f.depth }
  }
  return out
})
function toggleFolder(id) {
  const list = ws.value.folders
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
}

// '' stands for "use the global setting"
// a workspace's own accent / look is a Pro feature; without it the global ones apply
const proBack = () => ({ type: 'workspaces', props: { editId: selected.value } })
const accent = computed({
  get: () => (isPro.value && ws.value?.accent) || '',
  set: (v) => { if (requirePro('wsTheme', proBack())) ws.value.accent = v || null },
})
const look = computed({
  get: () => (isPro.value && ws.value?.look) || '',
  set: (v) => { if (requirePro('wsTheme', proBack())) ws.value.look = v || null },
})
const globalHex = computed(() => (ACCENTS.find((a) => a.id === settings.accent) ?? ACCENTS[0]).hex)
const accentOptions = computed(() => [
  { value: '', color: globalHex.value, label: t('wsDefault') },
  ...ACCENTS.map((a) => ({ value: a.id, color: a.hex, label: t('accent_' + a.id) })),
])
const lookOptions = computed(() => [{ value: '', label: t('wsDefault') }, ...LOOKS.map((l) => ({ value: l, label: t('look_' + l) }))])

function remove() {
  const w = ws.value
  const undo = deleteWorkspace(w.id)
  selected.value = meta.workspaces[0]?.id || null
  toast(t('wsDeleted', { name: w.name }), t('undo'), undo)
}

const pad = (d) => ({ paddingLeft: 8 + d * 18 + 'px' })
</script>

<template>
  <Modal :title="t('workspaces')" width="760px" @close="emit('close')">
    <div class="wsd">
      <nav class="wsd-list">
        <button
          v-for="w in meta.workspaces"
          :key="w.id"
          class="wsd-item"
          :class="{ on: w.id === selected }"
          @click="selected = w.id"
        >
          <span class="wsd-dot" :style="{ background: (isPro && ACCENTS.find((a) => a.id === w.accent) || {}).hex || globalHex }" />
          <span class="wsd-item-name">{{ w.name }}</span>
          <Icon v-if="activeWs?.id === w.id" name="check" :size="14" />
        </button>
        <button class="wsd-item wsd-new" @click="newOne"><Icon name="plus" :size="15" /> {{ t('wsNew') }}</button>
        <p class="st-hint wsd-tip">{{ t('wsTip') }}</p>
      </nav>

      <div v-if="ws" class="wsd-edit">
        <div class="field">
          <label for="ws-name">{{ t('wsName') }}</label>
          <input id="ws-name" v-model="ws.name" class="input" maxlength="40" spellcheck="false" />
        </div>

        <div class="field">
          <label>{{ t('wsFolders') }}</label>
          <span class="field-hint">{{ t('wsFoldersHint') }}</span>
          <div class="wsd-folders custom-scroll">
            <label
              v-for="f in folders"
              :key="f.id"
              class="wsd-folder"
              :class="{ inherited: covered.has(f.id) && !ws.folders.includes(f.id) }"
              :style="pad(f.depth)"
            >
              <input
                type="checkbox"
                :checked="covered.has(f.id)"
                :disabled="covered.has(f.id) && !ws.folders.includes(f.id)"
                @change="toggleFolder(f.id)"
              />
              <Icon name="folder" :size="14" />
              <span>{{ f.title || t('untitled') }}</span>
            </label>
          </div>
        </div>

        <div class="st-row">
          <span class="st-label">{{ t('accentColor') }} <ProBadge /></span>
          <Swatches v-model="accent" :options="accentOptions" />
        </div>
        <div class="st-row">
          <span class="st-label">{{ t('look') }} <ProBadge /></span>
          <Segmented v-model="look" :options="lookOptions" />
        </div>
      </div>
      <div v-else class="wsd-edit empty small">{{ t('wsNone') }}</div>
    </div>

    <template #footer>
      <button v-if="ws" class="btn btn-ghost wsd-del" @click="remove"><Icon name="trash" :size="15" /> {{ t('delete') }}</button>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('close') }}</button>
      <button
        v-if="ws"
        class="btn btn-primary"
        :disabled="activeWs?.id === ws.id"
        @click="switchWorkspace(ws.id); emit('close')"
      >
        {{ activeWs?.id === ws.id ? t('wsActive') : t('wsActivate') }}
      </button>
    </template>
  </Modal>
</template>
