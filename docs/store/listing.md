# Chrome Web Store listing

Texts to paste into the Developer Dashboard. The name and the short description
also live in `public/_locales/*/messages.json` (max. 132 characters).

- **Category:** Productivity
- **Languages:** Português (Brasil), English

---

## Português (Brasil)

**Nome:** Bookdeck

**Descrição curta (132):**
Nova guia para seus favoritos: tags, workspaces, sessões de abas, links quebrados e duplicados. Privado: nada sai do navegador.

**Descrição detalhada:**

Bookdeck transforma a nova guia num painel dos seus favoritos. Tudo o que você salvou fica à mão, organizado do seu jeito e sem nenhuma conta ou servidor.

★ ORGANIZE
• Pastas em grade ou em colunas, em cartões, compacto ou só ícones
• Tags coloridas (#trabalho, #ler-depois) e busca por nome, endereço ou #tag. Aperte /
• Recomendações do que você mais usa, com base no histórico, calculadas no seu computador
• Fixe favoritos e pastas, oculte o que não quer ver, arraste para reorganizar

★ WORKSPACES E SESSÕES
• Workspaces: separe “Trabalho”, “Pessoal” e “Estudos”, cada um com suas pastas, cor e visual. Troque com Alt+1, Alt+2…
• Sessões: salve todas as abas de uma janela com um nome, inclusive grupos de abas e abas fixadas, e reabra tudo depois. Pode fechar as abas ao salvar para liberar memória.

★ MANUTENÇÃO
• Links quebrados: encontra páginas que sumiram, sites fora do ar e endereços que mudaram, com atualização em um clique
• Duplicados: acha a mesma página salva várias vezes, mesmo com endereços um pouco diferentes
• Parados: mostra o que você não abre há 3, 6 ou 12 meses
• Seleção em massa: mova, marque, oculte ou exclua vários favoritos de uma vez, sempre com “Desfazer”

★ PRIVADO DE VERDADE
• Sem conta, sem servidor, sem anúncios, sem rastreamento
• Seus dados ficam no armazenamento local do navegador
• Backup em arquivo .json: leve favoritos, tags, sessões e configurações para outro computador

Visuais brutal, moderno e cyberpunk, tema claro e escuro, cinco cores de destaque. Funciona no Chrome, Brave e Edge.

---

## English

**Name:** Bookdeck

**Short description (132):**
A new tab for your bookmarks: tags, workspaces, tab sessions, broken links and duplicates. Private: nothing leaves your browser.

**Detailed description:**

Bookdeck turns the new tab into a dashboard for your bookmarks. Everything you saved is at hand, organized your way, with no account and no server.

★ ORGANIZE
• Folders in a grid or in columns, as cards, compact rows or icons only
• Colored tags (#work, #read-later) and search by name, address or #tag. Press /
• Suggestions of what you use most, based on your history and computed on your computer
• Pin bookmarks and folders, hide what you don't want to see, drag to rearrange

★ WORKSPACES AND SESSIONS
• Workspaces: split “Work”, “Personal” and “Study”, each with its own folders, color and look. Switch with Alt+1, Alt+2…
• Sessions: save every tab of a window under a name, including tab groups and pinned tabs, and reopen them all later. Optionally close the tabs when saving to free memory.

★ MAINTENANCE
• Broken links: finds pages that are gone, sites that are down and addresses that moved, with one-click updates
• Duplicates: finds the same page saved more than once, even with slightly different addresses
• Unused: shows what you haven't opened in 3, 6 or 12 months
• Bulk selection: move, tag, hide or delete many bookmarks at once, always with Undo

★ TRULY PRIVATE
• No account, no server, no ads, no tracking
• Your data stays in the browser's local storage
• Backup to a .json file: take bookmarks, tags, sessions and settings to another computer

Brutal, modern and cyberpunk looks, light and dark themes, five accent colors. Works in Chrome, Brave and Edge.

---

## Privacy practices tab

**Single purpose:** Replace the new tab page with a page to browse, search and organize the user's bookmarks.

**Permission justifications:**

| Permission | Why it is needed |
|---|---|
| `bookmarks` | Show, create, edit, move and delete the user's bookmarks: the core of the extension. |
| `storage` | Save settings, tags, pinned/hidden items, workspaces, sessions and last-visit dates locally. |
| `history` | Suggest frequently used bookmarks and pages, search history from the search box, and tell which bookmarks haven't been opened in months. Read locally only. |
| `tabs` | Open bookmarks in new tabs/windows, read the current tab in the popup to save it, and save/restore the tabs of a window as a session. |
| `tabGroups` | Keep tab group names and colors when saving and reopening a session. |
| `favicon` | Show each bookmark's site icon from the browser's own favicon cache. |
| `search` | “Search the web” from the search box using the user's default search engine. |
| Optional host access (`<all_urls>`) | Requested only when the user starts a broken-link check: one request per bookmarked URL to read its HTTP status. Without it nothing is fetched. |

**Remote code:** No. All code is bundled in the package.

**Data usage:** The extension does not collect or transmit any user data. Check none of the data-type boxes; certify that data is not sold, not used for unrelated purposes and not used for creditworthiness.

**Privacy policy URL:** host `docs/privacy-policy.md` (e.g. GitHub Pages or the repository file) and paste its public URL.

---

## Assets still needed

- Icon 128×128: `public/icons/icon-128.png` ✓
- Screenshots 1280×800 (1–5): can be produced from the e2e run (`tests/e2e/.tmp/out/`) at a 1280×800 viewport with real-looking bookmarks
- Small promo tile 440×280 (optional but recommended)
