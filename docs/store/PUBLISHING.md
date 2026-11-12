# Publishing checklist (Chrome Web Store)

Everything in the repository is ready; the steps marked **(you)** need your accounts
or a decision.

## 1. Before uploading

- [ ] `npm run test:e2e` passes (13 steps, no console errors)
- [ ] **(you)** Load `dist/` unpacked once (`chrome://extensions` → Load unpacked) and click
      Maintenance → Broken links → Check now: the browser's site-access prompt appears,
      and after allowing it the check runs. This is the only flow the automated test
      can't click.
- [ ] **(you)** Quick look at the welcome tour in a fresh profile and at the update notice
      (it shows for people coming from 0.1)
- [ ] `npm run package` → `bookdeck-0.2.0.zip`

## 2. Privacy policy URL **(you)**

The store requires a public URL. Host `docs/privacy-policy.html` (standalone page, no
dependencies) anywhere public, for example:

- GitHub Pages, from a public repository
- Netlify Drop / Cloudflare Pages: drag the file in
- any personal site

Then update the contact line in `docs/privacy-policy.md` / `.html` (it currently says
"open an issue in the project repository") with an email or the repository link.

## 3. Developer account **(you)**

- https://chrome.google.com/webstore/devconsole: one-time US$ 5 registration fee
- Verify the contact email (required before publishing)

## 4. New item in the Developer Dashboard

1. **Upload** `bookdeck-0.2.0.zip`
2. **Store listing** (texts in `docs/store/listing.md`):
   - Description: English and Português (Brasil)
   - Category: Productivity
   - Icon: taken from the package (128×128)
   - Screenshots 1280×800: `docs/store/images/en/*.png` for English,
     `docs/store/images/pt/*.png` for Português, in order 1 to 5
   - Small promo tile 440×280: `docs/store/images/promo-small-440x280-en.png` (en) /
     `promo-small-440x280.png` (pt)
   - Marquee 1400×560 (optional, used if featured): `marquee-1400x560-en.png` / `marquee-1400x560.png`
3. **Privacy practices**: single purpose, one justification per permission and the data
   answers are in `docs/store/listing.md` → "Privacy practices tab". Remote code: No.
   Data collected: none.
4. **Distribution**: Public, all regions (or start as Unlisted to share a link with
   friends first)
5. **Submit for review**. Reviews usually take from a few days up to a couple of weeks;
   broad permissions (`history`, `tabs`, the optional `<all_urls>`) can make it longer, so
   the justifications matter.

## 5. Other stores (optional, same package)

- **Microsoft Edge Add-ons** (free account): same zip, same texts and images.
- Brave, Vivaldi, Opera GX and other Chromium browsers install from the Chrome Web Store.

## Updating later

1. Bump `version` in `public/manifest.json` and `package.json`
2. For a minor version (0.3, 0.4…), update the "what's new" list in
   `src/newtab/components/dialogs/WelcomeDialog.vue` (`NEWS`) and its texts in
   `src/shared/i18n.js` (`news*`); patch versions show nothing
3. `npm run test:e2e`, `npm run package`, upload the zip in the dashboard
4. Regenerate images if the UI changed: `npm run store:assets` (needs internet)
