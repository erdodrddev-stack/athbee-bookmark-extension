<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../../../components/Icon.vue'
import Segmented from '../../../components/Segmented.vue'
import FolderSelect from '../../../components/FolderSelect.vue'
import { t } from '../../../shared/i18n'
import { root, topFolders } from '../../../shared/bookmarks'
import { usage, coverageStart, refreshUsage } from '../../../shared/usage'
import { faviconUrl, hostOf } from '../../../shared/util'
import { toast } from '../../ui'
import { openUrl, removeBookmarks } from '../../actions'
import { PERIODS, findStale, moveAll, hideAll } from '../../stale'

const days = ref(365)
const loading = ref(true)
const busy = ref(false)
const selected = ref(new Set())
const dest = ref(topFolders()[1]?.id || topFolders()[0]?.id || '2')
const confirmingDelete = ref(false)

onMounted(async () => {
  try {
    // re-read history when the data is more than a minute old (switching tabs shouldn't rescan)
    await refreshUsage({ force: Date.now() - usage.value.scannedAt > 60e3 })
  } finally {
    loading.value = false
  }
})

const result = computed(() => {
  void root.value
  void usage.value
  return findStale(days.value, coverageStart.value)
})
const items = computed(() => result.value.items)

// start with everything selected; drop ids that disappear from the list
watch(items, (list, old) => {
  const ids = new Set(list.map((x) => x.node.id))
  if (!old || old.length === 0) selected.value = ids
  else selected.value = new Set([...selected.value].filter((id) => ids.has(id)))
  confirmingDelete.value = false
}, { immediate: true })
watch(days, () => (selected.value = new Set(items.value.map((x) => x.node.id))))

const allOn = computed(() => items.value.length > 0 && selected.value.size === items.value.length)
function toggleAll() {
  selected.value = allOn.value ? new Set() : new Set(items.value.map((x) => x.node.id))
}
function toggle(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}

const periodOptions = computed(() => PERIODS.map((d) => ({ value: d, label: t('staleMonths', { n: Math.round(d / 30) }) })))
const fmtDate = (ms) => new Date(ms).toLocaleDateString()
const ago = (ms) => {
  const d = Math.floor((Date.now() - ms) / 864e5)
  return d >= 60 ? t('monthsAgo', { n: Math.floor(d / 30) }) : t('daysAgo', { n: d })
}

async function act(kind) {
  const ids = [...selected.value]
  if (!ids.length) return
  if (kind === 'delete' && !confirmingDelete.value) { confirmingDelete.value = true; return }
  confirmingDelete.value = false
  busy.value = true
  try {
    if (kind === 'hide') toast(t('staleHidden', { n: ids.length }), t('undo'), hideAll(ids))
    else if (kind === 'move') toast(t('staleMoved', { n: ids.length }), t('undo'), await moveAll(ids, dest.value))
    else toast(t('staleDeleted', { n: ids.length }), t('undo'), await removeBookmarks(ids))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="stale">
      <div class="stale-top">
        <span class="st-label">{{ t('staleUnused') }}</span>
        <Segmented v-model="days" :options="periodOptions" />
      </div>
      <p class="st-hint">
        {{ t('staleIntro') }}
        <template v-if="result.limited"> {{ t('staleLimited', { date: fmtDate(result.cutoff) }) }}</template>
      </p>

      <p v-if="loading" class="st-hint stale-loading">{{ t('staleLoading') }}</p>

      <template v-else-if="items.length">
        <div class="stale-bar">
          <label class="stale-all">
            <input type="checkbox" :checked="allOn" :indeterminate="selected.size > 0 && !allOn" @change="toggleAll" />
            {{ t('staleSelected', { n: selected.size, total: items.length }) }}
          </label>
          <span class="stale-acts">
            <button class="btn btn-ghost lc-gbtn" :disabled="busy || !selected.size" @click="act('hide')">
              <Icon name="eye-off" :size="14" /> {{ t('hide') }}
            </button>
            <span class="stale-move">
              <FolderSelect v-model="dest" class="stale-dest" :aria-label="t('folder')" />
              <button class="btn btn-ghost lc-gbtn" :disabled="busy || !selected.size" @click="act('move')">{{ t('staleMove') }}</button>
            </span>
            <button
              class="btn lc-gbtn"
              :class="confirmingDelete ? 'btn-danger' : 'btn-ghost'"
              :disabled="busy || !selected.size"
              @click="act('delete')"
            >
              <Icon name="trash" :size="14" />
              {{ confirmingDelete ? t('lcConfirmDelete', { n: selected.size }) : t('delete') }}
            </button>
          </span>
        </div>

        <ul class="lc-list">
          <li v-for="x in items" :key="x.node.id" class="lc-row stale-row" @click="toggle(x.node.id)">
            <input type="checkbox" :checked="selected.has(x.node.id)" @click.stop="toggle(x.node.id)" />
            <img :src="faviconUrl(x.node.url, 32)" alt="" width="16" height="16" />
            <span class="lc-text">
              <span class="lc-title" :title="x.node.url">{{ x.node.title || hostOf(x.node.url) }}</span>
              <span class="lc-sub">
                <span class="lc-path">{{ x.path || '—' }}</span>
              </span>
            </span>
            <span class="stale-when" :title="x.node.dateAdded ? t('staleSaved', { date: fmtDate(x.node.dateAdded) }) : ''">
              {{ x.last ? t('staleLast', { when: ago(x.last) }) : t('staleNever') }}
            </span>
            <span class="lc-actions">
              <button class="icon-btn" :title="t('openNewTab')" @click.stop="openUrl(x.node.url, 'new')"><Icon name="external" :size="15" /></button>
            </span>
          </li>
        </ul>
      </template>

      <div v-else class="dup-empty">
        <Icon name="check" :size="22" />
        <p class="lc-intro">{{ t('staleNone') }}</p>
      </div>
  </div>
</template>
