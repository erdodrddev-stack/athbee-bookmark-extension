import { reactive } from 'vue'
import { settings } from '../shared/settings'
import { t } from '../shared/i18n'
import { isDescendant } from '../shared/bookmarks'
import { toast } from './ui'
import { safeMove, createBookmark } from './actions'

/**
 * id: bookmark/folder being dragged from this page
 * payload: { title, url } when dragging a history card (creates a bookmark on drop)
 * overId / pos: drop indicator on a card ('before' | 'after')
 */
export const dnd = reactive({ id: null, payload: null, overId: null, pos: null })

export function startDrag(e, node, payload = null) {
  dnd.id = payload ? null : node.id
  dnd.payload = payload
  e.dataTransfer.effectAllowed = 'copyMove'
  if (node.url) {
    e.dataTransfer.setData('text/uri-list', node.url)
    e.dataTransfer.setData('text/plain', node.url)
  } else {
    e.dataTransfer.setData('text/plain', node.title || '')
  }
}

export function endDrag() {
  dnd.id = null
  dnd.payload = null
  dnd.overId = null
  dnd.pos = null
}

/** Whether something droppable is being dragged (internal item or an external link). */
export function canDrop(e) {
  return !!(dnd.id || dnd.payload || e.dataTransfer?.types?.includes('text/uri-list'))
}

/** Whether the dragged thing may be dropped into `folderId` (a folder can't go inside itself). */
export function canDropInto(e, folderId) {
  if (!canDrop(e)) return false
  return !(dnd.id && (dnd.id === folderId || isDescendant(folderId, dnd.id)))
}

function external(e) {
  if (dnd.payload) return dnd.payload
  const url = (e.dataTransfer.getData('text/uri-list') || '').split('\n').find((l) => l && !l.startsWith('#'))
  if (!url) return null
  return { url: url.trim(), title: '' }
}

/** Drop into a folder (appended at the end). */
export async function dropInto(e, folderId) {
  const id = dnd.id
  const payload = external(e)
  endDrag()
  if (id) {
    if (id === folderId || isDescendant(folderId, id)) return
    return safeMove(id, { parentId: folderId })
  }
  if (payload) return createBookmark({ parentId: folderId, ...payload })
}

/** Drop next to a bookmark/folder card. */
export async function dropBeside(e, target, after) {
  const id = dnd.id
  const payload = external(e)
  endDrag()
  const index = target.index + (after ? 1 : 0)
  if (id) {
    if (id === target.id) return
    if (settings.sortBy !== 'default') return toast(t('dndOnlyDefault'))
    if (isDescendant(target.parentId, id)) return
    return safeMove(id, { parentId: target.parentId, index })
  }
  if (payload) {
    return createBookmark({ parentId: target.parentId, index: settings.sortBy === 'default' ? index : undefined, ...payload })
  }
}
