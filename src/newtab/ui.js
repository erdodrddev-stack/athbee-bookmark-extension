import { reactive } from 'vue'

export const ui = reactive({
  current: 'home', // 'home' or a folder id
  query: '',
  tagFilter: { all: [], any: [], none: [], only: [] }, // advanced tag search
  advOpen: false, // advanced search panel
  active: 0, // highlighted search result
  menu: null, // { x, y, items }
  dialog: null, // { type, props }
  toast: null, // { id, msg, actionLabel, action }
  focusSearch: 0,
})

const emptyFilter = () => ({ all: [], any: [], none: [], only: [] })

/** Number of tags set in the advanced search. */
export const filterCount = () => Object.values(ui.tagFilter).reduce((n, list) => n + list.length, 0)

/** True while showing search results (typed query or advanced tag filters). */
export const isSearching = () => !!ui.query.trim() || filterCount() > 0

export function clearFilter() {
  ui.tagFilter = emptyFilter()
}

export function clearSearch() {
  ui.query = ''
  clearFilter()
  ui.advOpen = false
}

export function go(id) {
  ui.current = id
  clearSearch()
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
