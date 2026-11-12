import { isPro } from '../shared/premium'
import { ui, openDialog } from './ui'

/**
 * Gate for a paid feature: true when it may be used, otherwise opens the upgrade
 * dialog (returning to the dialog that was open, if any, when it closes).
 */
export function requirePro(feature, back = ui.dialog) {
  if (isPro.value) return true
  openDialog('upgrade', { feature, back })
  return false
}
