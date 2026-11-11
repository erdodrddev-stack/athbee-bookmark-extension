<script setup>
import Icon from '../../components/Icon.vue'
import TagInput from '../../components/TagInput.vue'
import { t } from '../../shared/i18n'
import { ui, clearFilter, filterCount } from '../ui'
import { matchCount } from '../search'

const rows = [
  { key: 'all', label: 'tagsAll', hint: 'tagsAllHint' },
  { key: 'any', label: 'tagsAny', hint: 'tagsAnyHint' },
  { key: 'none', label: 'tagsNone', hint: 'tagsNoneHint' },
  { key: 'only', label: 'tagsOnly', hint: 'tagsOnlyHint' },
]
</script>

<template>
  <div class="adv" role="dialog" :aria-label="t('advancedSearch')" @keydown.esc.stop="ui.advOpen = false">
    <div class="adv-head">
      <span class="adv-title"><Icon name="filter" :size="16" /> {{ t('advancedSearch') }}</span>
      <button type="button" class="icon-btn" :title="t('close')" @click="ui.advOpen = false"><Icon name="x" :size="16" /></button>
    </div>

    <div class="adv-body">
      <div v-for="r in rows" :key="r.key" class="field">
        <label :for="'adv-' + r.key">{{ t(r.label) }}</label>
        <TagInput :id="'adv-' + r.key" v-model="ui.tagFilter[r.key]" />
        <span class="field-hint">{{ t(r.hint) }}</span>
      </div>
    </div>

    <div class="adv-foot">
      <span class="adv-count">
        <template v-if="filterCount()">{{ t(matchCount === 1 ? 'matchOne' : 'matchMany', { n: matchCount }) }}</template>
        <template v-else>{{ t('advEmptyHint') }}</template>
      </span>
      <button type="button" class="btn btn-ghost" :disabled="!filterCount()" @click="clearFilter">{{ t('clearFilters') }}</button>
      <button type="button" class="btn btn-primary" @click="ui.advOpen = false">{{ t('showResults') }}</button>
    </div>
  </div>
</template>
