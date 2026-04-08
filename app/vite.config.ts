import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import serveStatic from 'vite-plugin-serve-static'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import dotenv from 'dotenv';
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the parent sdk directory
dotenv.config({ path: path.resolve(__dirname, '../sdk/.env') });

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: "globalThis",
    "process.env": {
      ADMIN_PRIVATE_KEY: JSON.stringify(process.env.ADMIN_PRIVATE_KEY),
      ADMIN_CONTRACT_ADDRESS: JSON.stringify(process.env.ADMIN_CONTRACT_ADDRESS),
      REGISTRY_ADDRESS: JSON.stringify(process.env.REGISTRY_ADDRESS),
      VERIFIER_ADDRESS: JSON.stringify(process.env.VERIFIER_ADDRESS),
      SEPOLIA_RPC: JSON.stringify(process.env.SEPOLIA_RPC),
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: false,
        global: false,
        process: false,
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
      '@aztec/bb.js': path.resolve(__dirname, 'node_modules/@aztec/bb.js'),
      'noah-starknet': path.resolve(__dirname, '../sdk/src/index.ts'),
      'starknet': path.resolve(__dirname, 'node_modules/starknet'),
      'eventemitter3': path.resolve(__dirname, 'node_modules/eventemitter3'),
      'garaga': path.resolve(__dirname, 'node_modules/garaga'),
      'tesseract.js': path.resolve(__dirname, 'node_modules/tesseract.js'),
      '@noir-lang/noir_js': path.resolve(__dirname, 'node_modules/@noir-lang/noir_js'),
      '@noir-lang/types': path.resolve(__dirname, 'node_modules/@noir-lang/types'),
    },
  },
  optimizeDeps: {
    include: ['pino'],
    exclude: ['@noir-lang/acvm_js', '@noir-lang/noirc_abi', '@noir-lang/noir_js', '@aztec/bb.js']
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
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
