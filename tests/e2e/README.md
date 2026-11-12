# End-to-end test

Loads `dist/` into a real Chromium-based browser (headless) and goes through every
feature: icon style, backup export/import, duplicates, unused bookmarks, broken-link
check, bulk selection, sessions, workspaces and the dark theme.

## Setup (once)

```bash
python3 -m venv .venv
.venv/bin/pip install playwright
```

No `playwright install` is needed: the test uses a browser already on the machine.
It looks for Brave, Edge or Chromium; set `BOOKDECK_BROWSER=/path/to/browser` to pick
another. Branded Google Chrome 137+ ignores `--load-extension`, so it can't be used.

## Run

```bash
npm run test:e2e
```

It builds, runs the test with a throwaway profile (your own browser profile is never
touched) and exits non-zero if any step fails. Screenshots of each step and the
exported backup are written to `tests/e2e/.tmp/out/`.

The broken-link check asks for site access at runtime, and a headless browser can't
click that prompt, so the test runs on a copy of the build with the permission already
granted. Check the real prompt by hand once before a release.
