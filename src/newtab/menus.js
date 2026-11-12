import { t } from '../shared/i18n'
import { meta } from '../shared/settings'
import { openDialog } from './ui'
import { isVisible } from './sort'
import * as A from './actions'
import { applyTag } from './search'

export function bookmarkMenu(n) {
  const pinned = meta.pinned.includes(n.id)
  const hidden = meta.hidden.includes(n.id)
  return [
    { label: t('openNewTab'), icon: 'external', action: () => A.openUrl(n.url, 'new') },
    { label: t('openNewWindow'), icon: 'window', action: () => A.openUrl(n.url, 'window') },
    { label: t('openIncognito'), icon: 'incognito', action: () => A.openUrl(n.url, 'incognito') },
    { divider: true },
    { label: t('edit'), icon: 'pencil', action: () => openDialog('bookmark', { node: n }) },
    { label: t('editTags'), icon: 'tag', action: () => openDialog('bookmark', { node: n, focusTags: true }) },
    { label: t('copyUrl'), icon: 'copy', action: () => A.copyText(n.url) },
    { label: t('showQr'), icon: 'qr', action: () => openDialog('qr', { url: n.url, title: n.title }) },
    { divider: true },
    { label: pinned ? t('unpin') : t('pin'), icon: 'pin', action: () => A.togglePin(n.id) },
    { label: hidden ? t('unhide') : t('hide'), icon: hidden ? 'eye' : 'eye-off', action: () => A.toggleHidden(n.id) },
    { divider: true },
    { label: t('delete'), icon: 'trash', danger: true, action: () => A.deleteBookmark(n) },
  ]
}

export function folderMenu(n) {
  const isRoot = n.parentId === '0'
  const pinned = meta.pinned.includes(n.id)
  const hidden = meta.hidden.includes(n.id)
  const direct = (n.children || []).filter((c) => c.url && isVisible(c)).length
  const items = []
  if (direct) items.push({ label: t('openAll', { n: direct }), icon: 'external', action: () => A.openAll(n) }, { divider: true })
  items.push(
    { label: t('addBookmark'), icon: 'bookmark-plus', action: () => openDialog('bookmark', { parentId: n.id }) },
    { label: t('addFolder'), icon: 'folder-plus', action: () => openDialog('folder', { parentId: n.id }) },
    { label: t('linkCheckFolder'), icon: 'link-off', action: () => openDialog('maintenance', { tab: 'links', scopeId: n.id }) },
  )
  if (!isRoot) {
    items.push(
      { label: t('rename'), icon: 'pencil', action: () => openDialog('folder', { node: n }) },
      { divider: true },
      { label: pinned ? t('unpin') : t('pin'), icon: 'pin', action: () => A.togglePin(n.id) },
      { label: hidden ? t('unhide') : t('hide'), icon: hidden ? 'eye' : 'eye-off', action: () => A.toggleHidden(n.id) },
      { divider: true },
      { label: t('deleteFolder'), icon: 'trash', danger: true, action: () => A.deleteFolder(n) },
    )
  }
  return items
}

export function historyMenu(h) {
  return [
    { label: t('openNewTab'), icon: 'external', action: () => A.openUrl(h.url, 'new') },
    { label: t('openNewWindow'), icon: 'window', action: () => A.openUrl(h.url, 'window') },
    { divider: true },
    { label: t('addToBookmarks'), icon: 'bookmark-plus', action: () => openDialog('bookmark', { url: h.url, title: h.title }) },
    { label: t('copyUrl'), icon: 'copy', action: () => A.copyText(h.url) },
    { label: t('showQr'), icon: 'qr', action: () => openDialog('qr', { url: h.url, title: h.title }) },
  ]
}

export function tagMenu(name) {
  return [
    { label: t('filterByTag'), icon: 'search', action: () => applyTag(name) },
    { divider: true },
    { label: t('rename'), icon: 'pencil', action: () => openDialog('tagRename', { name }) },
    { label: t('tagColor'), icon: 'palette', action: () => openDialog('tagColor', { name }) },
    { label: t('deleteTag'), icon: 'trash', danger: true, action: () => A.deleteTagEverywhere(name) },
  ]
}
