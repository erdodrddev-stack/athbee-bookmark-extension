# Chrome Web Store listing

Texts to paste into the Developer Dashboard. The name and the short description
also live in `public/_locales/*/messages.json` (max. 132 characters).

- **Category:** Productivity
- **Languages:** Português (Brasil), English

---

## Português (Brasil)

**Nome:** Bookdeck

**Descrição curta (132):**
Nova guia para seus favoritos: tags, workspaces, sessões de abas, links quebrados e duplicados. Seus favoritos não saem do navegador.

**Descrição detalhada:**

Bookdeck transforma a nova guia num painel dos seus favoritos. Tudo o que você salvou fica à mão, organizado do seu jeito, sem criar conta e sem servidor guardando seus favoritos.

★ ORGANIZE
• Pastas em grade ou em colunas, em cartões, compacto ou só ícones
• Tags coloridas (#trabalho, #ler-depois) e busca por nome, endereço ou #tag. Aperte /
• Recomendações do que você mais usa, com base no histórico, calculadas no seu computador
• Fixe favoritos e pastas, oculte o que não quer ver, arraste para reorganizar

★ WORKSPACES E SESSÕES
• Workspaces: separe “Trabalho” e “Pessoal”, cada um com suas pastas. Troque com Alt+1, Alt+2…
• Sessões: salve todas as abas de uma janela com um nome, inclusive grupos de abas e abas fixadas, e reabra tudo depois. Pode fechar as abas ao salvar para liberar memória.

★ MANUTENÇÃO
• Links quebrados: encontra páginas que sumiram, sites fora do ar e endereços que mudaram, pasta por pasta
• Duplicados: acha a mesma página salva várias vezes, mesmo com endereços um pouco diferentes
• Seleção em massa: mova, marque, oculte ou exclua vários favoritos de uma vez, sempre com “Desfazer”

★ BOOKDECK PRO: US$ 12, PAGAMENTO ÚNICO
Tudo acima é grátis, sem prazo. O Pro libera, para sempre:
• Workspaces e sessões ilimitados (o grátis tem 2 workspaces e 3 sessões)
• Cor e visual próprios para cada workspace
• Visuais brutal e cyberpunk
• Busca avançada por tags: todas, qualquer, nenhuma ou somente estas
• Verificação de links da biblioteca inteira e correção em lote de links e duplicados
• Favoritos parados: o que você não abre há 3, 6 ou 12 meses

★ PRIVADO DE VERDADE
• Sem conta, sem anúncios, sem rastreamento
• Seus favoritos, tags e sessões ficam no armazenamento local do navegador. Só o status da licença Pro é consultado
• Backup em arquivo .json: leve favoritos, tags, sessões e configurações para outro computador

Visual moderno, tema claro e escuro, cinco cores de destaque. Funciona no Chrome, Brave e Edge.

---

## English

**Name:** Bookdeck

**Short description (132):**
A new tab for your bookmarks: tags, workspaces, tab sessions, broken links and duplicates. Your bookmarks never leave your browser.

**Detailed description:**

Bookdeck turns the new tab into a dashboard for your bookmarks. Everything you saved is at hand, organized your way, with no sign-up and no server holding your bookmarks.

★ ORGANIZE
• Folders in a grid or in columns, as cards, compact rows or icons only
• Colored tags (#work, #read-later) and search by name, address or #tag. Press /
• Suggestions of what you use most, based on your history and computed on your computer
• Pin bookmarks and folders, hide what you don't want to see, drag to rearrange

★ WORKSPACES AND SESSIONS
• Workspaces: split “Work” and “Personal”, each with its own folders. Switch with Alt+1, Alt+2…
• Sessions: save every tab of a window under a name, including tab groups and pinned tabs, and reopen them all later. Optionally close the tabs when saving to free memory.

★ MAINTENANCE
• Broken links: finds pages that are gone, sites that are down and addresses that moved, folder by folder
• Duplicates: finds the same page saved more than once, even with slightly different addresses
• Bulk selection: move, tag, hide or delete many bookmarks at once, always with Undo

★ BOOKDECK PRO: US$ 12, ONE-TIME PAYMENT
Everything above is free, with no time limit. Pro unlocks, for good:
• Unlimited workspaces and sessions (the free plan has 2 workspaces and 3 sessions)
• A color and look of its own for each workspace
• Brutal and cyberpunk looks
• Advanced tag search: all, any, none or only these
• Link checks across your whole library, and bulk fixes for links and duplicates
• Unused bookmarks: what you haven't opened in 3, 6 or 12 months

★ TRULY PRIVATE
• No sign-up, no ads, no tracking
• Your bookmarks, tags and sessions stay in the browser's local storage. Only the Pro license status is checked
• Backup to a .json file: take bookmarks, tags, sessions and settings to another computer

Modern look, light and dark themes, five accent colors. Works in Chrome, Brave and Edge.

---

## Privacy practices tab

**Single purpose:** Replace the new tab page with a page to browse, search and organize the user's bookmarks.

**Permission justifications:**

| Permission | Why it is needed |
|---|---|
| `bookmarks` | Show, create, edit, move and delete the user's bookmarks: the core of the extension. |
| `storage` | Save settings, tags, pinned/hidden items, workspaces, sessions, last-visit dates and the Pro license status locally. |
| `history` | Suggest frequently used bookmarks and pages, search history from the search box, and tell which bookmarks haven't been opened in months. Read locally only. |
| `tabs` | Open bookmarks in new tabs/windows, read the current tab in the popup to save it, and save/restore the tabs of a window as a session. |
| `tabGroups` | Keep tab group names and colors when saving and reopening a session. |
| `favicon` | Show each bookmark's site icon from the browser's own favicon cache. |
| `search` | “Search the web” from the search box using the user's default search engine. |
| Optional host access (`<all_urls>`) | Requested only when the user starts a broken-link check: one request per bookmarked URL to read its HTTP status. Without it nothing is fetched. |
| Host access `https://extensionpay.com/*` | Bookdeck Pro: open the payment page and check whether the user has paid. Only a random install identifier is sent; no browsing data. _(Added to the manifest together with the ExtensionPay integration.)_ |

**Remote code:** No. All code is bundled in the package.

**Data usage:** Bookmarks, history, tabs and settings are never collected or transmitted. The only data that leaves the browser belongs to a Bookdeck Pro purchase, handled by ExtensionPay/Stripe. Check:

- **Personally identifiable information**: the email the user enters when buying Pro (kept by ExtensionPay to restore the license).
- **Financial and payment information**: card details entered on the Stripe checkout page (Bookdeck never receives them).

Leave every other box unchecked; certify that data is not sold, not used for unrelated purposes and not used for creditworthiness.

**Pricing / in-app purchases:** the extension is free to install, with an optional one-time in-app purchase (Bookdeck Pro, US$ 12). Mention it in the description, as above.

**Privacy policy URL:** host `docs/privacy-policy.html` (standalone page) anywhere public and paste its URL.

---

## Images

All generated by `npm run store:assets` into `docs/store/images/`:

- Icon 128×128: `public/icons/icon-128.png`
- Screenshots 1280×800: `en/` and `pt/`, 1 to 5 (home, workspaces, sessions, maintenance, icons + selection)
- Small promo tile 440×280: `promo-small-440x280[-en].png`
- Marquee 1400×560: `marquee-1400x560[-en].png`

Step-by-step submission: `docs/store/PUBLISHING.md`.
