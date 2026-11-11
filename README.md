# Bookdeck

Nova guia para acessar e organizar favoritos (Chrome/Brave, Manifest V3). Vue 3 + Vite.

## Rodar localmente

```bash
npm install
npm run build        # gera dist/
npm run watch        # rebuild automático enquanto edita
```

No navegador: `brave://extensions` (ou `chrome://extensions`) → ative **Modo do desenvolvedor** →
**Carregar sem compactação** → selecione a pasta `dist/`.

Depois de cada build, clique em ↻ no cartão da extensão e abra uma nova guia.
Se outra extensão também substituir a nova guia (ex.: Markoob), desative-a enquanto testa.

## Estrutura

- `src/newtab/`: página da nova guia (barra lateral, pastas, busca, menus, diálogos)
- `src/popup/`: popup do ícone da barra (QR code, salvar/editar a página atual)
- `src/shared/`: favoritos, histórico, configurações, i18n (pt/en), cor dos favicons
- `scripts/make-icons.mjs`: gera os PNGs de `public/icons/`

Configurações, itens fixados e ocultos ficam em `chrome.storage.local`. Nenhum dado sai do navegador.
