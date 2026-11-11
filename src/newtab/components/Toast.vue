<script setup>
import { ui } from '../ui'

function act() {
  const a = ui.toast?.action
  ui.toast = null
  a?.()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="ui.toast" :key="ui.toast.id" class="toast" role="status">
        <span>{{ ui.toast.msg }}</span>
        <button v-if="ui.toast.actionLabel" class="toast-action" @click="act">{{ ui.toast.actionLabel }}</button>
      </div>
    </Transition>
  </Teleport>
</template>
