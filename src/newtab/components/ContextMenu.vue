<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Icon from '../../components/Icon.vue'
import { ui } from '../ui'

const el = ref(null)
const pos = ref({ x: 0, y: 0 })

watch(() => ui.menu, async (m) => {
  if (!m) return
  pos.value = { x: m.x, y: m.y }
  await nextTick()
  const r = el.value?.getBoundingClientRect()
  if (!r) return
  let x = m.anchorRight && m.x + r.width > innerWidth - 8 ? m.anchorRight - r.width : m.x
  x = Math.max(8, Math.min(x, innerWidth - r.width - 8))
  let y = m.y
  if (y + r.height > innerHeight - 8) y = Math.max(8, m.anchorRight ? m.y - r.height - 44 : m.y - r.height)
  pos.value = { x, y }
})

const close = () => (ui.menu = null)
function onDown(e) {
  if (ui.menu && el.value && !el.value.contains(e.target)) close()
}
function onKey(e) {
  if (e.key === 'Escape' && ui.menu) close()
}
function run(it) {
  if (it.disabled) return
  close()
  it.action?.()
}

onMounted(() => {
  window.addEventListener('mousedown', onDown, true)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', close)
  window.addEventListener('blur', close)
  window.addEventListener('wheel', close, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDown, true)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', close)
  window.removeEventListener('blur', close)
  window.removeEventListener('wheel', close)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.menu"
      ref="el"
      class="ctx"
      role="menu"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @contextmenu.prevent
    >
      <template v-for="(it, i) in ui.menu.items" :key="i">
        <div v-if="it.divider" class="ctx-div" />
        <div v-else-if="it.header" class="ctx-head">{{ it.header }}</div>
        <button
          v-else
          class="ctx-item"
          role="menuitem"
          :class="{ danger: it.danger, disabled: it.disabled }"
          @click="run(it)"
        >
          <span class="ctx-ico"><Icon v-if="it.icon" :name="it.icon" :size="16" /></span>
          <span class="ctx-label">{{ it.label }}</span>
          <Icon v-if="it.checked" name="check" :size="15" class="ctx-check" />
        </button>
      </template>
    </div>
  </Teleport>
</template>
