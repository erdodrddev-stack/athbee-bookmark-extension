<script setup>
import { computed, ref } from 'vue'
import Icon from '../../../components/Icon.vue'
import { t } from '../../../shared/i18n'
import { getNode } from '../../../shared/bookmarks'
import { faviconUrl, hostOf } from '../../../shared/util'
import { toast } from '../../ui'
import { requirePro } from '../../pro'
import ProBadge from '../../../components/ProBadge.vue'
import { openUrl } from '../../actions'
import { check, targets, requestAccess, runCheck, stopCheck, dismiss, updateUrls, removeAll } from '../../linkcheck'

const props = defineProps({ scopeId: { type: String, default: null } })

const scopeName = computed(() => (props.scopeId ? getNode(props.scopeId)?.title || t('untitled') : null))
const count = computed(() => targets(props.scopeId).length)
const showResults = computed(() => check.scopeId === props.scopeId && (check.running || check.done > 0))
const pct = computed(() => (check.total ? Math.round((check.done / check.total) * 100) : 0))
const denied = ref(false)

const GROUPS = ['broken', 'redirect', 'warn']
const groups = computed(() =>
  GROUPS.map((kind) => ({ kind, items: check.results.filter((r) => r.kind === kind) })).filter((g) => g.items.length),
)

async function start() {
  denied.value = false
  // permissions.request has to be the first thing the click does
  const ok = await requestAccess().catch(() => false)
  if (!ok) { denied.value = true; return }
  runCheck(props.scopeId)
}

function reason(r) {
  if (r.code === 'offline') return t('lcOffline')
  if (r.code === 'timeout') return t('lcTimeout')
  if (r.kind === 'redirect') return hostOf(r.finalUrl) === hostOf(r.url) ? r.finalUrl.replace(/^https?:\/\/[^/]+/, '') || '/' : r.finalUrl
  const known = { 404: 'lcNotFound', 410: 'lcGone', 403: 'lcForbidden', 429: 'lcTooMany' }
  if (known[r.code]) return t(known[r.code]) + ` (${r.code})`
  if (r.code >= 500) return t('lcServerError') + ` (${r.code})`
  return `HTTP ${r.code}`
}

const confirming = ref(null) // group kind waiting for a second click to delete
async function deleteGroup(items) {
  if (!requirePro('bulkFix')) return
  if (confirming.value !== items[0].kind) { confirming.value = items[0].kind; return }
  confirming.value = null
  const undo = await removeAll(items)
  toast(t('lcDeleted', { n: items.length }), t('undo'), undo)
}
async function deleteOne(r) {
  const undo = await removeAll([r])
  toast(t('deleted'), t('undo'), undo)
}
async function fixGroup(items) {
  if (!requirePro('bulkFix')) return
  await updateUrls(items)
  toast(t('lcUpdated', { n: items.length }))
}
</script>

<template>
  <div class="lc">
      <template v-if="!showResults">
        <p class="lc-intro">
          {{ scopeName ? t('lcIntroFolder', { n: count, name: scopeName }) : t('lcIntro', { n: count }) }}
        </p>
        <p class="st-hint">{{ t('lcPrivacy') }}</p>
        <p v-if="denied" class="lc-denied">{{ t('lcDenied') }}</p>
        <p v-if="check.running" class="lc-denied">{{ t('lcBusy') }}</p>
      </template>

      <template v-else>
        <div class="lc-progress">
          <div class="lc-bar"><span :style="{ width: pct + '%' }" /></div>
          <span class="lc-count">{{ check.done }} / {{ check.total }}</span>
        </div>
        <p class="st-hint">
          <template v-if="check.running">{{ t('lcRunning') }}</template>
          <template v-else-if="!check.finishedAt">{{ t('lcStopped') }}</template>
          <template v-else-if="!check.results.length">{{ t('lcAllGood') }}</template>
          <template v-else>{{ t('lcFound', { n: check.results.length }) }}</template>
        </p>

        <section v-for="g in groups" :key="g.kind" class="lc-group">
          <header class="lc-ghead">
            <span class="lc-gtitle" :class="'lc-' + g.kind">{{ t('lcGroup_' + g.kind) }} <b>{{ g.items.length }}</b></span>
            <button v-if="g.kind === 'redirect'" class="btn btn-ghost lc-gbtn" :disabled="check.running" @click="fixGroup(g.items)">
              {{ t('lcUpdateAll') }} <ProBadge />
            </button>
            <button
              v-if="g.kind === 'broken'"
              class="btn lc-gbtn"
              :class="confirming === g.kind ? 'btn-danger' : 'btn-ghost'"
              :disabled="check.running"
              @click="deleteGroup(g.items)"
            >
              {{ confirming === g.kind ? t('lcConfirmDelete', { n: g.items.length }) : t('lcDeleteAll') }} <ProBadge />
            </button>
          </header>
          <p class="st-hint lc-ghint">{{ t('lcHint_' + g.kind) }}</p>
          <ul class="lc-list">
            <li v-for="r in g.items" :key="r.id" class="lc-row">
              <img :src="faviconUrl(r.url, 32)" alt="" width="16" height="16" />
              <span class="lc-text">
                <span class="lc-title" :title="r.url">{{ r.title || hostOf(r.url) }}</span>
                <span class="lc-sub">
                  <span v-if="r.path" class="lc-path">{{ r.path }}</span>
                  <span class="lc-reason" :title="r.finalUrl || ''">
                    <Icon v-if="r.kind === 'redirect'" name="chevron-right" :size="12" />{{ reason(r) }}
                  </span>
                </span>
              </span>
              <span class="lc-actions">
                <button class="icon-btn" :title="t('openNewTab')" @click="openUrl(r.url, 'new')"><Icon name="external" :size="15" /></button>
                <button v-if="r.kind === 'redirect'" class="icon-btn" :title="t('lcUpdate')" @click="updateUrls([r])"><Icon name="check" :size="15" /></button>
                <button class="icon-btn" :title="t('lcIgnore')" @click="dismiss(r.id)"><Icon name="eye-off" :size="15" /></button>
                <button class="icon-btn lc-del" :title="t('delete')" @click="deleteOne(r)"><Icon name="trash" :size="15" /></button>
              </span>
            </li>
          </ul>
        </section>
      </template>

    <div class="mt-actions">
      <button v-if="check.running" class="btn btn-danger" @click="stopCheck">{{ t('lcStop') }}</button>
      <button v-else class="btn btn-primary" :disabled="!count" @click="start">
        {{ showResults ? t('lcAgain') : t('lcStart') }}
      </button>
    </div>
  </div>
</template>
