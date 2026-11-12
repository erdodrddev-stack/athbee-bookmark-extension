<script setup>
import { ui, closeDialog } from '../ui'
import BookmarkDialog from './dialogs/BookmarkDialog.vue'
import FolderDialog from './dialogs/FolderDialog.vue'
import QrDialog from './dialogs/QrDialog.vue'
import ConfirmDialog from './dialogs/ConfirmDialog.vue'
import SettingsDialog from './dialogs/SettingsDialog.vue'
import TagRenameDialog from './dialogs/TagRenameDialog.vue'
import TagColorDialog from './dialogs/TagColorDialog.vue'
import MaintenanceDialog from './dialogs/MaintenanceDialog.vue'
import BulkMoveDialog from './dialogs/BulkMoveDialog.vue'
import BulkTagsDialog from './dialogs/BulkTagsDialog.vue'
import WorkspacesDialog from './dialogs/WorkspacesDialog.vue'

const MAP = {
  bookmark: BookmarkDialog,
  folder: FolderDialog,
  qr: QrDialog,
  confirm: ConfirmDialog,
  settings: SettingsDialog,
  tagRename: TagRenameDialog,
  tagColor: TagColorDialog,
  maintenance: MaintenanceDialog,
  bulkMove: BulkMoveDialog,
  bulkTags: BulkTagsDialog,
  workspaces: WorkspacesDialog,
}
</script>

<template>
  <component :is="MAP[ui.dialog.type]" v-if="ui.dialog" v-bind="ui.dialog.props" @close="closeDialog" />
</template>
