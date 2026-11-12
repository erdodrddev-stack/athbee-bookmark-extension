import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { build as esbuild } from 'esbuild'
import { fileURLToPath } from 'node:url'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Content scripts can't load ES module chunks, so the one on extensionpay.com is
 * bundled on its own into a single classic script after each build.
 */
const contentScript = {
  name: 'athbee-bookmark-content-script',
  async closeBundle() {
    await esbuild({
      entryPoints: [r('./src/extpay-content.js')],
      outfile: r('./dist/extpay-content.js'),
      bundle: true,
      format: 'iife',
      target: 'es2020',
      minify: true,
      legalComments: 'none',
    })
  },
}

export default defineConfig({
  plugins: [vue(), contentScript],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: {
        newtab: r('./newtab.html'),
        popup: r('./popup.html'),
        // the service worker needs a fixed path for the manifest
        background: r('./src/background.js'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
