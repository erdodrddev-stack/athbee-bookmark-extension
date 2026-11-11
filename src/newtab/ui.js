import { reactive } from 'vue'

export const ui = reactive({
  current: 'home', // 'home' or a folder id
  query: '',
  active: 0, // highlighted search result
  menu: null, // { x, y, items }
  dialog: null, // { type, props }
  toast: null, // { id, msg, actionLabel, action }
  focusSearch: 0,
})

export function go(id) {
  ui.current = id
  ui.query = ''
}

/** Open a context menu at a mouse event, or under an element (pass the element). */
export function openMenu(at, items) {
  if (at instanceof Element) {
    const r = at.getBoundingClientRect()
    ui.menu = { x: r.left, y: r.bottom + 6, items, anchorRight: r.right }
  } else {
    ui.menu = { x: at.clientX, y: at.clientY, items }
  }
}

export function openDialog(type, props = {}) {
  ui.menu = null
  ui.dialog = { type, props }
}
export const closeDialog = () => (ui.dialog = null)

let toastTimer
export function toast(msg, actionLabel, action) {
  clearTimeout(toastTimer)
  ui.toast = { id: Date.now(), msg, actionLabel, action }
  toastTimer = setTimeout(() => (ui.toast = null), actionLabel ? 6000 : 3000)
}
