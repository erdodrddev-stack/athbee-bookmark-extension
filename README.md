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

## Funcionalidades

- Pastas em grade ou colunas; estilos cartões, compacto e ícones; temas claro/escuro e visuais brutal, moderno e cyberpunk
- Tags coloridas, busca (`/` ou `Ctrl+K`) por nome, endereço, `#tag` e histórico, busca avançada por tags
- **Workspaces** (`Alt+1…9`, `Alt+0` = tudo): visões com pastas, cor e visual próprios
- **Sessões**: salvar e reabrir as abas de uma janela, com grupos e abas fixadas
- **Manutenção**: links quebrados, duplicados e favoritos parados
- **Seleção em massa**: mover, marcar, ocultar e excluir vários favoritos, com desfazer
- **Backup** em `.json` (Configurações → Backup)

## Testes

```bash
python3 -m venv .venv && .venv/bin/pip install playwright   # uma vez
npm run test:e2e
```

Teste de ponta a ponta num navegador real (headless). Detalhes em `tests/e2e/README.md`.

## Publicar

```bash
npm run package      # gera bookdeck-<versão>.zip para a Chrome Web Store
```

Textos da loja e justificativa das permissões: `docs/store/listing.md`. Política de privacidade: `docs/privacy-policy.md`.

## Estrutura

- `src/newtab/`: página da nova guia (barra lateral, pastas, busca, menus, diálogos)
- `src/popup/`: popup do ícone da barra (QR code, salvar/editar a página atual)
- `src/shared/`: favoritos, histórico, configurações, i18n (pt/en), backup, sessões, workspaces, datas de uso
- `tests/e2e/`: teste de ponta a ponta com Playwright
- `docs/`: textos da loja e política de privacidade
- `scripts/make-icons.mjs`: gera os PNGs de `public/icons/`

Configurações, tags, fixados, ocultos, workspaces, sessões e datas de uso ficam em `chrome.storage.local`. Nenhum dado sai do navegador (a verificação de links só acessa os próprios endereços salvos, e só com permissão).
