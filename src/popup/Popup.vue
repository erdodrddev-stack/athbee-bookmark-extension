<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import QRCode from 'qrcode'
import Icon from '../components/Icon.vue'
import Logo from '../components/Logo.vue'
import FolderSelect from '../components/FolderSelect.vue'
import TagInput from '../components/TagInput.vue'
import { loadPersisted, applyTheme, flushPersist } from '../shared/settings'
import { tagsOf, setTags } from '../shared/tags'
import { reloadTree, getNode, defaultFolderId } from '../shared/bookmarks'
import { t } from '../shared/i18n'
import { hostOf } from '../shared/util'

const ready = ref(false)
const url = ref('')
const pageTitle = ref('')
const title = ref('')
const folder = ref('')
const existing = ref(null)
const tags = ref([])
const status = ref('') // '' | 'saved' | 'copied'
const canvas = ref(null)

const canSave = computed(() => !!url.value)
const titleDiffers = computed(() => pageTitle.value && title.value !== pageTitle.value)

onMounted(async () => {
  await loadPersisted()
  applyTheme()
  await reloadTree()
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  url.value = tab?.url || tab?.pendingUrl || ''
  pageTitle.value = tab?.title || hostOf(url.value)
  title.value = pageTitle.value

  const { popupFolder } = await chrome.storage.local.get('popupFolder')
  folder.value = popupFolder && getNode(popupFolder) ? popupFolder : defaultFolderId()

  if (url.value) {
    try {
      const [found] = await chrome.bookmarks.search({ url: url.value })
      if (found) {
        existing.value = found
        title.value = found.title
        folder.value = found.parentId
        tags.value = [...tagsOf(found.id)]
      }
    } catch {}
  }
  ready.value = true
  await nextTick()
  if (url.value && canvas.value) {
    QRCode.toCanvas(canvas.value, url.value, { width: 168, margin: 0, errorCorrectionLevel: 'M' }).catch(() => {})
  }
})

async function save() {
  if (!canSave.value) return
  const tt = title.value.trim() || hostOf(url.value)
  if (existing.value) {
    await chrome.bookmarks.update(existing.value.id, { title: tt })
    if (folder.value !== existing.value.parentId) await chrome.bookmarks.move(existing.value.id, { parentId: folder.value })
  } else {
    existing.value = await chrome.bookmarks.create({ parentId: folder.value, title: tt, url: url.value })
  }
  setTags(existing.value.id, tags.value)
  await Promise.all([flushPersist(), chrome.storage.local.set({ popupFolder: folder.value })])
  status.value = 'saved'
  setTimeout(() => window.close(), 700)
}

async function remove() {
  if (!existing.value) return
  await chrome.bookmarks.remove(existing.value.id)
  setTags(existing.value.id, [])
  await flushPersist()
  existing.value = null
  tags.value = []
  title.value = pageTitle.value
}

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    status.value = 'copied'
    setTimeout(() => (status.value = ''), 1200)
  } catch {}
}

function openApp() {
  chrome.tabs.create({})
  window.close()
}
</script>

<template>
  <div v-if="ready" class="pp">
    <header class="pp-head">
      <button class="pp-brand" :title="t('openApp')" @click="openApp">
        <Logo :size="24" />
        <span>Bookdeck</span>
        <Icon name="chevron-right" :size="16" class="pp-chev" />
      </button>
      <button class="icon-btn" :title="t('copyUrl')" :disabled="!url" @click="copy">
        <Icon :name="status === 'copied' ? 'check' : 'link'" :size="17" />
      </button>
    </header>

    <div class="pp-qr">
      <canvas v-if="url" ref="canvas" />
    </div>

    <form class="pp-form" @submit.prevent="save">
      <div class="field">
        <label for="pp-title">{{ t('title') }}</label>
        <div class="input-wrap">
          <Icon name="type" :size="17" class="input-ico" />
          <input id="pp-title" v-model="title" class="input with-ico" :placeholder="t('title')" />
          <button
            v-if="titleDiffers"
            type="button"
            class="input-action"
            :title="t('useCurrentTitle')"
            @click="title = pageTitle"
          >↺</button>
        </div>
      </div>
      <div class="field">
        <label for="pp-folder">{{ t('folder') }}</label>
        <div class="input-wrap">
          <Icon name="folder" :size="17" class="input-ico" />
          <FolderSelect id="pp-folder" v-model="folder" class="with-ico" />
        </div>
      </div>
      <div class="field">
        <label for="pp-tags">{{ t('tags') }}</label>
        <TagInput id="pp-tags" v-model="tags" />
      </div>

      <button class="btn btn-primary pp-submit" type="submit" :disabled="!canSave">
        <template v-if="status === 'saved'"><Icon name="check" :size="17" /> {{ t('saved') }}</template>
        <template v-else>{{ existing ? t('saveChanges') : t('bookmarkThisPage') }}</template>
      </button>
      <button v-if="existing" type="button" class="btn btn-ghost pp-remove" @click="remove">
        <Icon name="trash" :size="15" /> {{ t('removeBookmark') }}
      </button>
    </form>
  </div>
</template>
