<script setup>
import { ui, closeDialog } from '../ui'
import BookmarkDialog from './dialogs/BookmarkDialog.vue'
import FolderDialog from './dialogs/FolderDialog.vue'
import QrDialog from './dialogs/QrDialog.vue'
import ConfirmDialog from './dialogs/ConfirmDialog.vue'
import SettingsDialog from './dialogs/SettingsDialog.vue'
import TagRenameDialog from './dialogs/TagRenameDialog.vue'
import TagColorDialog from './dialogs/TagColorDialog.vue'
import LinkCheckDialog from './dialogs/LinkCheckDialog.vue'
import DuplicatesDialog from './dialogs/DuplicatesDialog.vue'

const MAP = {
  bookmark: BookmarkDialog,
  folder: FolderDialog,
  qr: QrDialog,
  confirm: ConfirmDialog,
  settings: SettingsDialog,
  tagRename: TagRenameDialog,
  tagColor: TagColorDialog,
  linkCheck: LinkCheckDialog,
  duplicates: DuplicatesDialog,
}
</script>

<template>
  <component :is="MAP[ui.dialog.type]" v-if="ui.dialog" v-bind="ui.dialog.props" @close="closeDialog" />
</template>
