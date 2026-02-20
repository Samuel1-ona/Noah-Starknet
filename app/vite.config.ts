import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import serveStatic from 'vite-plugin-serve-static'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: "globalThis",
    "process.env": "{}",
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    wasm(),
    topLevelAwait(),
    {
      // Workaround for https://github.com/keep-starknet-strange/scaffold-garaga/issues/5
      ...serveStatic([
        {
          pattern: /acvm_js_bg.wasm/,
          resolve: path.resolve(__dirname, '../sdk/node_modules/@noir-lang/acvm_js/web/acvm_js_bg.wasm')
        },
        {
          pattern: /noirc_abi_wasm_bg.wasm/,
          resolve: path.resolve(__dirname, '../sdk/node_modules/@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm')
        }
      ]),
      apply: 'serve', // Only apply in dev mode
    }
  ],
  resolve: {
    alias: {
      pino: path.resolve(__dirname, 'node_modules/pino/browser.js'),
      buffer: path.resolve(__dirname, 'node_modules/buffer/index.js'),
      'vite-plugin-node-polyfills/shims/buffer': path.resolve(__dirname, 'node_modules/buffer/index.js'),
      process: path.resolve(__dirname, 'node_modules/process/index.js'),
      'vite-plugin-node-polyfills/shims/process': path.resolve(__dirname, 'node_modules/process/index.js'),
      '@aztec/bb.js': path.resolve(__dirname, 'node_modules/@aztec/bb.js'),
    },
  },
  optimizeDeps: {
    include: ['pino', 'buffer', 'process', 'vite-plugin-node-polyfills/shims/buffer', 'vite-plugin-node-polyfills/shims/process'],
    exclude: ['@noir-lang/acvm_js', '@noir-lang/noirc_abi', '@noir-lang/noir_js', '@aztec/bb.js']
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../sdk'),
        path.resolve(__dirname, 'node_modules'),
      ]
    }
  }
})
