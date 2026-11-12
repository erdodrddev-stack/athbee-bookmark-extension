<script setup>
import { computed, reactive, ref } from 'vue'
import Icon from '../../../components/Icon.vue'
import TagPill from '../../../components/TagPill.vue'
import { t } from '../../../shared/i18n'
import { meta } from '../../../shared/settings'
import { tagsOf } from '../../../shared/tags'
import { faviconUrl, hostOf } from '../../../shared/util'
import { toast } from '../../ui'
import { requirePro } from '../../pro'
import ProBadge from '../../../components/ProBadge.vue'
import { openUrl } from '../../actions'
import { duplicateGroups, extraCopies, ignoreGroup, clearIgnored, resolve } from '../../duplicates'

// group key -> id of the bookmark to keep; defaults to the suggested one (first)
const picked = reactive({})
const keepOf = (g) => (g.items.some((x) => x.node.id === picked[g.key]) ? picked[g.key] : g.items[0].node.id)
const choiceOf = (g) => {
  const keepId = keepOf(g)
  return { keepId, removeIds: g.items.map((x) => x.node.id).filter((id) => id !== keepId) }
}

const busy = ref(false)
const confirming = ref(false)
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString() : '')

async function run(groups) {
  busy.value = true
  try {
    const choices = groups.map(choiceOf)
    const n = choices.reduce((s, c) => s + c.removeIds.length, 0)
    const undo = await resolve(choices)
    toast(t('dupRemoved', { n }), t('undo'), undo)
  } finally {
    busy.value = false
    confirming.value = false
  }
}

function resolveAll() {
  if (!requirePro('bulkFix')) return
  if (!confirming.value) { confirming.value = true; return }
  run(duplicateGroups.value)
}

const ignoredCount = computed(() => meta.dupIgnored.length)
</script>

<template>
  <div class="dup">
      <template v-if="duplicateGroups.length">
        <p class="lc-intro">{{ t('dupIntro', { groups: duplicateGroups.length, n: extraCopies }) }}</p>
        <p class="st-hint">{{ t('dupHint') }}</p>

        <section v-for="g in duplicateGroups" :key="g.key" class="dup-group">
          <header class="dup-ghead">
            <img :src="faviconUrl(g.items[0].node.url, 32)" alt="" width="16" height="16" />
            <span class="dup-key" :title="g.key">{{ g.key }}</span>
            <button class="btn btn-ghost lc-gbtn" :disabled="busy" @click="ignoreGroup(g.key)">{{ t('dupIgnore') }}</button>
            <button class="btn btn-ghost lc-gbtn" :disabled="busy" @click="run([g])">{{ t('dupKeepOne') }}</button>
          </header>
          <ul class="lc-list">
            <li
              v-for="x in g.items"
              :key="x.node.id"
              class="lc-row dup-row"
              :class="{ keep: keepOf(g) === x.node.id }"
              @click="picked[g.key] = x.node.id"
            >
              <input type="radio" :name="'dup-' + g.key" :checked="keepOf(g) === x.node.id" :aria-label="t('dupKeepThis')" />
              <span class="lc-text">
                <span class="lc-title">
                  {{ x.node.title || hostOf(x.node.url) }}
                  <Icon v-if="meta.pinned.includes(x.node.id)" name="pin" :size="12" class="dup-pin" />
                </span>
                <span class="lc-sub">
                  <span class="lc-path">{{ x.path || '—' }}</span>
                  <span v-if="x.node.dateAdded" class="dup-date">{{ fmtDate(x.node.dateAdded) }}</span>
                </span>
                <span class="dup-url" :title="x.node.url">{{ x.node.url }}</span>
                <span v-if="tagsOf(x.node.id).length" class="dup-tags">
                  <TagPill v-for="tg in tagsOf(x.node.id)" :key="tg" :name="tg" class="bm-tag" />
                </span>
              </span>
              <span class="dup-badge">{{ keepOf(g) === x.node.id ? t('dupKeep') : t('dupRemove') }}</span>
              <span class="lc-actions">
                <button class="icon-btn" :title="t('openNewTab')" @click.stop="openUrl(x.node.url, 'new')"><Icon name="external" :size="15" /></button>
              </span>
            </li>
          </ul>
        </section>
      </template>

      <div v-else class="dup-empty">
        <Icon name="check" :size="22" />
        <p class="lc-intro">{{ t('dupNone') }}</p>
      </div>

      <p v-if="ignoredCount" class="st-hint dup-ignored">
        {{ t('dupIgnoredCount', { n: ignoredCount }) }}
        <button class="link-btn" @click="clearIgnored">{{ t('dupShowIgnored') }}</button>
      </p>

    <div v-if="duplicateGroups.length" class="mt-actions">
      <button class="btn" :class="confirming ? 'btn-danger' : 'btn-primary'" :disabled="busy" @click="resolveAll">
        {{ confirming ? t('dupConfirmAll', { n: extraCopies }) : t('dupResolveAll') }} <ProBadge />
      </button>
    </div>
  </div>
</template>
