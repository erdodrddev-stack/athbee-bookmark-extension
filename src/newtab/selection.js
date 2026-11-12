/**
 * Multi-select of bookmarks for bulk actions. While anything is selected,
 * clicking a bookmark toggles it instead of opening it (Shift+click selects
 * a range in on-screen order).
 */
import { reactive, watch } from 'vue'
import { meta } from '../shared/settings'
import { byId, getNode } from '../shared/bookmarks'
import { tagsOf, setTags } from '../shared/tags'
import { t } from '../shared/i18n'
import { toast, openDialog } from './ui'
import { removeBookmarks } from './actions'
import { moveAll, hideAll } from './stale'

export const sel = reactive({ ids: [], anchor: null })

export const isSelected = (id) => sel.ids.includes(id)
export const selecting = () => sel.ids.length > 0

export function toggleSelect(id) {
  const i = sel.ids.indexOf(id)
  if (i >= 0) sel.ids.splice(i, 1)
  else sel.ids.push(id)
  sel.anchor = id
}

/** Select every bookmark between the last clicked one and `id`, as laid out on screen. */
export function selectRange(id) {
  const order = [...new Set([...document.querySelectorAll('.bm[data-id]')].map((el) => el.dataset.id))]
  const a = order.indexOf(sel.anchor)
  const b = order.indexOf(id)
  if (a < 0 || b < 0) return toggleSelect(id)
  for (const x of order.slice(Math.min(a, b), Math.max(a, b) + 1)) if (!sel.ids.includes(x)) sel.ids.push(x)
  sel.anchor = id
}

export function clearSelection() {
  sel.ids.splice(0)
  sel.anchor = null
}

// forget bookmarks that were deleted elsewhere
watch(byId, () => {
  const alive = sel.ids.filter((id) => getNode(id)?.url)
  if (alive.length !== sel.ids.length) sel.ids.splice(0, sel.ids.length, ...alive)
})

const selectedNodes = () => sel.ids.map(getNode).filter((n) => n?.url)

// ----- bulk actions -----

export function openSelected() {
  const urls = selectedNodes().map((n) => n.url)
  const run = () => urls.forEach((url, i) => chrome.tabs.create({ url, active: i === 0 }))
  if (urls.length > 12) openDialog('confirm', { message: t('openAllConfirm', { n: urls.length }), confirmLabel: t('open'), onConfirm: run })
  else run()
}

export async function moveSelected(parentId) {
  const ids = [...sel.ids]
  const undo = await moveAll(ids, parentId)
  toast(t('staleMoved', { n: ids.length }), t('undo'), undo)
}

export const allHidden = () => sel.ids.length > 0 && sel.ids.every((id) => meta.hidden.includes(id))

export function toggleHiddenSelected() {
  const ids = [...sel.ids]
  if (allHidden()) {
    for (const id of ids) meta.hidden.splice(meta.hidden.indexOf(id), 1)
    toast(t('bulkShown', { n: ids.length }), t('undo'), () => meta.hidden.push(...ids))
  } else {
    toast(t('staleHidden', { n: ids.length }), t('undo'), hideAll(ids))
  }
}

export async function deleteSelected() {
  const ids = [...sel.ids]
  const undo = await removeBookmarks(ids)
  clearSelection()
  toast(t('staleDeleted', { n: ids.length }), t('undo'), undo)
}

/** [{ name, count }] of the tags on the selection, most used first */
export function selectionTags() {
  const counts = new Map()
  for (const id of sel.ids) for (const tg of tagsOf(id)) counts.set(tg, (counts.get(tg) || 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Add and remove tags across the selection; returns an undo function. */
export function editSelectedTags(add, remove) {
  const before = sel.ids.map((id) => [id, [...tagsOf(id)]])
  for (const [id, tags] of before) setTags(id, [...tags.filter((tg) => !remove.includes(tg)), ...add])
  return () => {
    for (const [id, tags] of before) setTags(id, tags)
  }
}
