<script setup>
import { computed } from 'vue'
import Icon from '../../components/Icon.vue'
import { meta } from '../../shared/settings'
import { t } from '../../shared/i18n'
import { allTags, tagStyle } from '../../shared/tags'
import { openMenu } from '../ui'
import { tagMenu } from '../menus'
import { applyTag, activeTags } from '../search'

const tags = computed(() => allTags.value)
const toggle = () => (meta.tagsOpen = !meta.tagsOpen)
</script>

<template>
  <div v-if="tags.length" class="sb-tags">
    <button class="sb-label sb-label-btn" @click="toggle">
      {{ t('tags') }}
      <Icon name="chevron-down" :size="13" class="hsec-chev" :class="{ closed: !meta.tagsOpen }" />
    </button>
    <template v-if="meta.tagsOpen">
      <button
        v-for="tg in tags"
        :key="tg.name"
        class="tree-row tag-row"
        :class="{ active: activeTags.includes(tg.name) }"
        :style="tagStyle(tg.name)"
        @click="applyTag(tg.name)"
        @contextmenu.prevent="openMenu($event, tagMenu(tg.name))"
      >
        <span class="tree-chevron is-leaf" />
        <span class="tree-ico tag-dot">#</span>
        <span class="tree-title">{{ tg.name }}</span>
        <span class="tree-count">{{ tg.count }}</span>
      </button>
    </template>
  </div>
</template>
