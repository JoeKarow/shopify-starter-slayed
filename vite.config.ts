/**
 * Vite Configuration
 *
 * Configuration for Vite build tool with Shopify integration, TypeScript
 * auto-imports for decorators, performance monitoring, and development features.
 */

import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'
import cleanup from '@by-association-only/vite-plugin-shopify-clean'
import pageReload from 'vite-plugin-page-reload'
import basicSsl from '@vitejs/plugin-basic-ssl'
import AutoImport from 'unplugin-auto-import/vite'
import performanceBudget from './lib/vite-plugin-performance-budget/index.js'

import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function removeFile(dest: string): void {
  if (fs.existsSync(dest)) {
    try {
      fs.unlinkSync(dest)
    } catch (err) {
      console.error(`Failed to remove file: ${dest}`)
    }
  }
}

function copyPublicToAssetsPlugin() {
  let config: any

  return {
    name: 'vite-plugin-copy-public',
    apply: 'serve' as const, // Only apply this during development
    configResolved(resolvedConfig: any) {
      config = resolvedConfig
    },
    buildStart() {
      const publicDir = path.resolve(config.root, 'public')
      const assetsDir = path.resolve(config.root, 'assets')

      const watcher = chokidar.watch(publicDir, { ignoreInitial: true })

      watcher.on('add', (filePath) => {
        const relativePath = path.relative(publicDir, filePath)
        const destPath = path.resolve(assetsDir, relativePath)
        console.log(`Copying new file: ${relativePath}`)
        copyFile(filePath, destPath)
      })

      watcher.on('change', (filePath) => {
        const relativePath = path.relative(publicDir, filePath)
        const destPath = path.resolve(assetsDir, relativePath)
        console.log(`Updating file: ${relativePath}`)
        copyFile(filePath, destPath)
      })

      watcher.on('unlink', (filePath) => {
        const relativePath = path.relative(publicDir, filePath)
        const destPath = path.resolve(assetsDir, relativePath)
        console.log(`Removing file: ${relativePath}`)
        removeFile(destPath)
      })
    },
  }
}

export default defineConfig({
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    https: true,
    port: 3000,
    hmr: true
  },
  publicDir: 'public',
  build: {
    manifest: false,
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].min.js',
        chunkFileNames: '[name].[hash].min.js',
        assetFileNames: '[name].[hash].min[extname]',
      },
    }
  },
  plugins: [
    // Basic SSL for HTTPS development
    basicSsl(),

    // Clean up old assets
    cleanup(),

    // Copy public files to assets during development
    copyPublicToAssetsPlugin(),

    // Auto-import decorators globally
    AutoImport({
      imports: [
        // Import all decorators from shopify-decorator-system
        {
          '@lib/shopify-decorator-system': [
            'Template',
            'ExcludeTemplate',
            'GlobalTemplate',
            'LazyLoad',
            'LoadOnIdle',
            'LoadOnInteraction',
            'LoadOnViewport',
            'Critical',
            'AboveTheFold',
            'InlineCritical',
            'NetworkAware',
            'FastConnectionOnly',
            'RespectSaveData',
            'Conditional',
            'MediaQuery',
            'FeatureDetection',
            'TouchOnly',
            'DesktopOnly',
            'MinWidth',
            'MaxWidth',
            'Debounce',
            'DebounceLeading',
            'DebounceTrailing',
            'Throttle',
            'ThrottleLeading',
            'ThrottleTrailing',
            'Memoize',
            'MemoizeTTL',
          ],
        },
        // Import registry functions
        {
          '@lib/shopify-decorator-system/registry': [
            'registerComponent',
            'getComponent',
            'getComponentsByTemplate',
            'initializeComponents',
          ],
        },
      ],
      dts: true, // Generate type declarations
      dirs: [
        // Auto-import from component directories
        'frontend/components',
        'frontend/decorators',
        'src/js/alpine/components',
        'src/js/alpine/stores',
        'src/js/alpine/directives',
      ],
    }),

    // Performance budget monitoring
    performanceBudget({
      css: {
        critical: 14 * 1024,  // 14KB
        template: 30 * 1024,  // 30KB
        total: 250 * 1024,    // 250KB
      },
      js: {
        main: 100 * 1024,     // 100KB
        chunk: 50 * 1024,     // 50KB
        total: 200 * 1024,    // 200KB
      },
      behavior: {
        failOnExceeded: process.env.NODE_ENV === 'production',
        warn: true,
        report: true,
        reportDir: 'dist/reports',
      },
    }),

    // Shopify theme development
    shopify({
      sourceCodeDir: 'src',
      entrypointsDir: 'src/entrypoints',
      additionalEntrypoints: [
        'src/js/prodify/index.ts',
        'frontend/entrypoints/theme.ts'
      ],
      snippetFile: 'vite.liquid',
    }),

    // Page reload on theme changes
    pageReload('/tmp/theme.update', {
      delay: 2000
    }),

    // Custom plugin for Liquid file hot reload without full refresh
    {
      name: 'vite-plugin-liquid-tailwind-refresh',
      handleHotUpdate(ctx) {
        if (ctx.file.endsWith('.liquid')) {
          // Filter out the liquid module to prevent a full refresh
          return [...ctx.modules[0]?.importers ?? [], ...ctx.modules.slice(1)]
        }
      }
    }
  ],
})