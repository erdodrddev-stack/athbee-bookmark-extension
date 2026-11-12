/**
 * Service worker: Athbee Bookmark Pro payments through ExtensionPay (extensionpay.com, Stripe).
 *
 * ExtPay must live here (startBackground at top level). Pages talk to it by message:
 *   { type: 'pro:pay' }   open the payment page
 *   { type: 'pro:login' } open the "I already paid" page (email magic link)
 *   { type: 'pro:check' } ask ExtensionPay whether this install has paid
 * The result is written to chrome.storage.local `license`, which every page watches.
 * Nothing is sent to extensionpay.com until the user opens the payment or login page.
 */
import ExtPay from 'extpay'
import { EXTPAY_ID, EXTPAY_PLAN } from './shared/extpay-config'

const extpay = ExtPay(EXTPAY_ID)
extpay.startBackground()

/**
 * ExtPay keeps this install's key in storage. A key made for another extension id
 * (e.g. before a rename) means nothing to the new one, so start over when the id changes.
 */
const EXTPAY_KEYS = ['extensionpay_api_key', 'extensionpay_user', 'extensionpay_installed_at']
const ready = (async () => {
  const { extpayId } = await chrome.storage.local.get('extpayId')
  if (extpayId !== EXTPAY_ID) {
    await Promise.all([chrome.storage.sync.remove(EXTPAY_KEYS), chrome.storage.local.remove(EXTPAY_KEYS)]).catch(() => {})
    await chrome.storage.local.set({ extpayId: EXTPAY_ID })
  }
  // A purchase needs this install's ExtPay key; without one (new id, or keys cleared) it
  // can't be valid. Pro switched on for testing is left alone.
  const { license } = await chrome.storage.local.get('license')
  if (license?.source !== 'extpay') return
  const synced = await chrome.storage.sync.get('extensionpay_api_key').catch(() => ({}))
  const local = await chrome.storage.local.get('extensionpay_api_key')
  if (!synced.extensionpay_api_key && !local.extensionpay_api_key) {
    await chrome.storage.local.set({ license: { pro: false, source: null, since: null, checkedAt: Date.now() } })
  }
})()

const EMPTY = { pro: false, source: null, since: null }

async function storeUser(user) {
  const { license: current = EMPTY } = await chrome.storage.local.get('license')
  let next
  if (user.paid) {
    next = { pro: true, source: 'extpay', since: user.paidAt ? new Date(user.paidAt).getTime() : Date.now(), email: user.email ?? null }
  } else if (current.source === 'extpay') {
    next = { ...EMPTY } // refunded, or the purchase was removed
  } else {
    next = { ...current } // free, or Pro switched on for testing: leave it
  }
  next.checkedAt = Date.now()
  await chrome.storage.local.set({ license: next })
  return next
}

extpay.onPaid.addListener((user) => storeUser(user))

const fromOurPages = (sender) => sender.id === chrome.runtime.id && (sender.url || '').startsWith(chrome.runtime.getURL(''))

ready.catch(() => {})

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('pro:') || !fromOurPages(sender)) return
  const run = {
    'pro:pay': () => extpay.openPaymentPage(EXTPAY_PLAN),
    'pro:login': () => extpay.openLoginPage(),
    'pro:check': () => extpay.getUser().then(storeUser),
  }[msg.type]
  if (!run) return
  ready
    .then(run)
    .then((license) => respond({ ok: true, license }), (e) => respond({ ok: false, error: String(e) }))
  return true // respond asynchronously
})
