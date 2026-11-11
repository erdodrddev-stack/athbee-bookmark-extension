import { settings, meta } from '../shared/settings'
import { t } from '../shared/i18n'
import { countBookmarks } from '../shared/bookmarks'
import { hostOf } from '../shared/util'
import { toast, openDialog } from './ui'
import { isVisible } from './sort'
import { tagsOf, setTags, allTags, deleteTag } from '../shared/tags'

/** how: 'auto' | 'current' | 'new' | 'background' | 'window' | 'incognito' */
export function openUrl(url, how = 'auto') {
  if (!url) return
  if (how === 'auto') how = settings.openIn === 'new' ? 'new' : 'current'
  switch (how) {
    case 'current': return chrome.tabs.update({ url })
    case 'new': return chrome.tabs.create({ url, active: true })
    case 'background': return chrome.tabs.create({ url, active: false })
    case 'window': return chrome.windows.create({ url })
    case 'incognito': return chrome.windows.create({ url, incognito: true })
  }
}

/** Respect modifier keys like a normal link would. */
export function openFromEvent(e, url) {
  if (e.ctrlKey || e.metaKey || e.button === 1) return openUrl(url, e.shiftKey ? 'new' : 'background')
  if (e.shiftKey) return openUrl(url, 'window')
  return openUrl(url)
}

export function openAll(folder) {
  const urls = (folder.children || []).filter((n) => n.url && isVisible(n)).map((n) => n.url)
  const run = () => urls.forEach((url, i) => chrome.tabs.create({ url, active: i === 0 }))
  if (urls.length > 12) {
    openDialog('confirm', { message: t('openAllConfirm', { n: urls.length }), confirmLabel: t('open'), onConfirm: run })
  } else run()
}

export function togglePin(id) {
  const i = meta.pinned.indexOf(id)
  if (i >= 0) { meta.pinned.splice(i, 1); toast(t('unpinnedToast')) }
  else { meta.pinned.push(id); toast(t('pinnedToast')) }
}

export function toggleHidden(id) {
  const i = meta.hidden.indexOf(id)
  if (i >= 0) { meta.hidden.splice(i, 1); toast(t('unhiddenToast')) }
  else {
    meta.hidden.push(id)
    toast(t('hiddenToast'), t('undo'), () => {
      const j = meta.hidden.indexOf(id)
      if (j >= 0) meta.hidden.splice(j, 1)
    })
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast(t('copied'))
  } catch {}
}

export async function deleteBookmark(n) {
  const snap = { parentId: n.parentId, index: n.index, title: n.title, url: n.url }
  const tags = [...tagsOf(n.id)]
  await chrome.bookmarks.remove(n.id)
  toast(t('deleted'), t('undo'), async () => {
    const created = await chrome.bookmarks.create(snap)
    if (tags.length) setTags(created.id, tags)
  })
}

/** Tags of every bookmark inside a subtree, captured before deleting it. */
function collectTags(n, out = {}) {
  if (n.url && tagsOf(n.id).length) out[n.id] = [...tagsOf(n.id)]
  for (const ch of n.children || []) collectTags(ch, out)
  return out
}

async function recreate(n, parentId, index, tags = {}) {
  const created = await chrome.bookmarks.create({ parentId, index, title: n.title, url: n.url })
  if (tags[n.id]) setTags(created.id, tags[n.id])
  for (const ch of n.children || []) await recreate(ch, created.id, undefined, tags)
}

export function deleteTagEverywhere(name) {
  const n = allTags.value.find((x) => x.name === name)?.count || 0
  openDialog('confirm', {
    message: t('deleteTagConfirm', { name, n }),
    confirmLabel: t('delete'),
    danger: true,
    onConfirm: () => deleteTag(name),
  })
}

export function deleteFolder(n) {
  openDialog('confirm', {
    message: t('deleteFolderConfirm', { name: n.title, n: countBookmarks(n) }),
    confirmLabel: t('delete'),
    danger: true,
    onConfirm: async () => {
      const [snap] = await chrome.bookmarks.getSubTree(n.id)
      const tags = collectTags(snap)
      await chrome.bookmarks.removeTree(n.id)
      toast(t('deleted'), t('undo'), () => recreate(snap, snap.parentId, snap.index, tags))
    },
  })
}

export async function safeMove(id, dest) {
  try {
    await chrome.bookmarks.move(id, dest)
  } catch {
    toast(t('moveFailed'))
  }
}

export async function createBookmark({ parentId, index, title, url }) {
  try {
    await chrome.bookmarks.create({ parentId, index, title: title || hostOf(url), url })
    toast(t('added'))
  } catch {
    toast(t('moveFailed'))
  }
}
