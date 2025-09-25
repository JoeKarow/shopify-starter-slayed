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
import liquidSnippets from './lib/vite-plugin-liquid-snippets/index.js'

import fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'
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
  let config: { root: string }

  return {
    name: 'vite-plugin-copy-public',
    apply: 'serve' as const, // Only apply this during development
    configResolved(resolvedConfig: { root: string }) {
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

/**
 * Get appropriate cache headers based on file type and environment
 */
function getCacheHeaders(fileName: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    return 'no-cache, no-store, must-revalidate'
  }

  // Production cache strategies
  if (fileName.includes('.contenthash.') || fileName.includes('.[hash].')) {
    // Files with content hashes - long-term cache
    return 'public, max-age=31536000, immutable' // 1 year
  }

  if (fileName.endsWith('.css')) {
    // CSS files - medium cache with revalidation
    return 'public, max-age=86400, must-revalidate' // 1 day
  }

  if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) {
    // JavaScript files - medium cache with revalidation
    return 'public, max-age=86400, must-revalidate' // 1 day
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'woff', 'woff2'].some(ext => fileName.endsWith(ext))) {
    // Static assets - long cache
    return 'public, max-age=604800, immutable' // 1 week
  }

  // Default cache for other files
  return 'public, max-age=3600' // 1 hour
}

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      '@lib': new URL('lib', import.meta.url).pathname,
      '@frontend': new URL('frontend', import.meta.url).pathname,
      '@components': new URL('frontend/components', import.meta.url).pathname,
      '@decorators': new URL('frontend/decorators', import.meta.url).pathname,
      '@': new URL('src', import.meta.url).pathname,
      '~': new URL('src', import.meta.url).pathname,
    },
  },
  server: {
    host: '127.0.0.1',
    https: {},
    port: 3000,
    hmr: true,
    // Configure headers for better caching during development
    headers: {
      // Cache static assets for 1 hour in development
      'Cache-Control': 'public, max-age=3600',
    }
  },
  publicDir: 'public',
  css: {
    // PostCSS configuration is loaded from postcss.config.ts
    // Includes shopify directive splitter, TailwindCSS, and optimization plugins
    postcss: {
      // This will automatically load postcss.config.ts
    },
    devSourcemap: true, // Enable sourcemaps in development for debugging
    modules: false, // Disable CSS modules since we're using TailwindCSS
  },
  build: {
    manifest: false,
    emptyOutDir: false,
    cssCodeSplit: true, // Enable CSS code splitting for better performance
    // Source map configuration for production builds
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    rollupOptions: {
      output: {
        // Content-based fingerprinting for cache busting
        entryFileNames: (_chunkInfo) => {
          // Different patterns for different environments
          const isDev = process.env.NODE_ENV === 'development'
          if (isDev) {
            return '[name].js'
          }
          // Production: use hash for better cache busting
          return 'assets/[name].[hash].min.js'
        },
        chunkFileNames: (_chunkInfo) => {
          const isDev = process.env.NODE_ENV === 'development'
          if (isDev) {
            return '[name]-chunk.js'
          }
          return 'assets/[name]-[hash].min.js'
        },
        assetFileNames: (assetInfo) => {
          const isDev = process.env.NODE_ENV === 'development'
          if (isDev) {
            return '[name][extname]'
          }

          // Organize assets by type for better CDN caching
          const info = assetInfo as { name?: string; type?: string }
          if (!info.name) {
            return 'assets/[name]-[contenthash:8][extname]'
          }

          const extType = info.name.split('.').pop()?.toLowerCase()

          // CSS files
          if (extType === 'css') {
            return 'assets/css/[name].[hash].min[extname]'
          }

          // Image files
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(extType || '')) {
            return 'assets/images/[name].[hash][extname]'
          }

          // Font files
          if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extType || '')) {
            return 'assets/fonts/[name].[hash][extname]'
          }

          // Other assets
          return 'assets/misc/[name].[hash][extname]'
        },
        // Source maps with content hashing
        sourcemapFileNames: process.env.NODE_ENV === 'development' ? '[name].js.map' : 'assets/maps/[name].[hash].js.map',
        // Ensure deterministic builds for better caching
        generatedCode: {
          constBindings: true,
        },
        // Optimize chunk splitting for better caching
        manualChunks: (id) => {
          // Only create chunks for dependencies that actually exist
          if (id.includes('node_modules')) {
            if (id.includes('alpinejs')) {
              return 'vendor-alpine'
            }
          }
          return undefined
        },
      },
      // Enable advanced optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
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
            'Critical',
            'NetworkAware',
            'Debounced',
            'DebounceQuick',
            'DebounceLeading',
            'DebounceBoth',
            'Cached',
            'CacheLong',
            'CacheShort',
            'CacheWithKey',
            // Legacy compatibility exports
            'Debounce',
            'Throttle',
            'Memoize',
            'Conditional',
          ],
        },
        // Import registry functions
        {
          '@lib/shopify-decorator-system/registry': [
            'registry',
            'ComponentRegistry',
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

    // Liquid snippets generation for CSS loading
    liquidSnippets({
      snippetsDir: 'snippets',
      splitsDir: 'frontend/entrypoints/splits',
      themeRoot: './',
      enablePreload: true,
      enablePrefetch: true,
      conditionalLoading: true,
    }),

    // Shopify theme development
    shopify({
      sourceCodeDir: 'src',
      entrypointsDir: 'frontend/entrypoints',
      additionalEntrypoints: [
        'src/js/prodify/index.ts',
        'src/entrypoints/theme.ts',
        // Include generated split CSS files from PostCSS directive splitter
        'frontend/entrypoints/splits/*.css'
      ],
      snippetFile: 'vite.liquid',
      // Handle generated CSS splits appropriately for Shopify
      themeRoot: './'
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
        return undefined
      }
    },

    // Custom plugin for CSS directive HMR
    {
      name: 'vite-plugin-css-directive-hmr',
      async handleHotUpdate(ctx) {
        // Handle CSS files with directive changes
        if (ctx.file.endsWith('.css')) {
          try {
            // Read the file content to check for Shopify directives
            const content = await fsPromises.readFile(ctx.file, 'utf-8')
            const hasDirectives = [
              '@split', '@critical', '@inline',
              '@endsplit', '@endcritical', '@endinline'
            ].some(directive => content.includes(directive))

            if (hasDirectives) {
              console.log(`🔄 CSS directive change detected in ${path.basename(ctx.file)}, triggering PostCSS re-processing`)

              // Let Vite handle the CSS update normally, but log for debugging
              // The PostCSS plugin will automatically re-process the directives
              return ctx.modules
            }
          } catch (error) {
            console.error(`Error reading CSS file for directive checking: ${error}`)
          }
        }
        return undefined
      },
      configureServer(server) {
        // Watch for changes in generated split files
        const splitsDir = path.resolve(process.cwd(), 'frontend/entrypoints/splits')
        if (fs.existsSync(splitsDir)) {
          const watcher = chokidar.watch(splitsDir, { ignoreInitial: true })

          watcher.on('change', (filePath) => {
            console.log(`🔄 Split CSS file updated: ${path.basename(filePath)}`)
            // Trigger HMR for the changed split file
            server.ws.send({
              type: 'update',
              updates: [{
                type: 'css-update',
                path: filePath,
                acceptedPath: filePath,
                timestamp: Date.now()
              }]
            })
          })

          watcher.on('add', (filePath) => {
            console.log(`➕ New split CSS file generated: ${path.basename(filePath)}`)
            // Notify that a new split was generated
            server.ws.send({
              type: 'full-reload'
            })
          })
        }
      }
    },

    // Custom plugin for CDN and caching optimization
    {
      name: 'vite-plugin-cdn-cache-optimization',
      generateBundle(_outputOptions, bundle) {
        // Add metadata for CDN optimization
        for (const [fileName, output] of Object.entries(bundle)) {
          if ('code' in output || 'source' in output) {
            // Add cache metadata as comments for reference
            const cacheHeaders = getCacheHeaders(fileName)
            const metadata = `/* Cache-Control: ${cacheHeaders} */\n`

            if ('code' in output) {
              output.code = metadata + output.code
            }
          }
        }
      },
      configureServer(server) {
        // Add middleware for development cache headers
        server.middlewares.use('/assets', (_req, res, next) => {
          // Set cache headers for assets in development
          const fileName = _req.url || ''
          const cacheHeaders = getCacheHeaders(fileName)
          res.setHeader('Cache-Control', cacheHeaders)
          res.setHeader('ETag', `"${Date.now()}"`)
          next()
        })
      }
    }
  ],
})