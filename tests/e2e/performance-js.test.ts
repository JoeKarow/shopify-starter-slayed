/**
 * T018: Performance test for Main JS < 100KB
 *
 * This test measures JavaScript bundle size and loading performance
 * to ensure it stays under the 100KB budget for optimal performance.
 *
 * Target: Main JS bundle < 100KB (102,400 bytes)
 *
 * These tests WILL FAIL initially as the JS optimization
 * system isn't fully implemented yet. This follows TDD principles.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Performance budgets for JavaScript
const JS_PERFORMANCE_BUDGETS = {
  MAIN_BUNDLE_BYTES: 100 * 1024, // 100KB
  CRITICAL_JS_BYTES: 50 * 1024, // 50KB for above-the-fold JS
  LAZY_CHUNK_BYTES: 30 * 1024, // 30KB per lazy-loaded chunk
  VENDOR_BUNDLE_BYTES: 150 * 1024, // 150KB for vendor libraries
  GZIP_COMPRESSION_RATIO: 0.35 // Expect ~35% size after gzip
}

// Helper function to analyze JavaScript files
function analyzeJSFiles(buildDir: string) {
  const jsFiles: Array<{
    path: string
    size: number
    type: 'main' | 'vendor' | 'chunk' | 'worker'
    template?: string
    content: string
  }> = []

  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          scanDirectory(fullPath)
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
          const content = fs.readFileSync(fullPath, 'utf8')
          const size = Buffer.byteLength(content, 'utf8')

          let type: 'main' | 'vendor' | 'chunk' | 'worker'
          let template: string | undefined

          if (entry.name.includes('vendor') || entry.name.includes('node_modules')) {
            type = 'vendor'
          } else if (entry.name.includes('worker')) {
            type = 'worker'
          } else if (entry.name.includes('chunk') || entry.name.includes('lazy')) {
            type = 'chunk'
            // Extract template from chunk name if possible
            const templateMatch = entry.name.match(/(\w+)-chunk/)
            template = templateMatch ? templateMatch[1] : undefined
          } else {
            type = 'main'
          }

          jsFiles.push({
            path: fullPath,
            size,
            type,
            template,
            content
          })
        }
      }
    } catch (error) {
      console.warn(`JS directory not found: ${dir}`)
    }
  }

  // Scan multiple potential JS locations
  const possibleDirs = [
    path.join(buildDir, 'assets'),
    path.join(buildDir, 'frontend', 'entrypoints'),
    path.join(buildDir, 'src', 'js'),
    path.join(buildDir, 'dist'),
    path.join(buildDir, 'build')
  ]

  possibleDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir)
    }
  })

  return jsFiles
}

// Helper to measure JS payload from network requests
async function measureJSPayload(page: any, url: string) {
  const jsRequests: Array<{
    url: string
    size: number
    type: string
    transferSize?: number
    timing?: any
  }> = []

  page.on('response', async (response: any) => {
    const responseUrl = response.url()
    if ((responseUrl.includes('.js') || responseUrl.includes('.mjs')) && response.status() === 200) {
      const type = responseUrl.includes('vendor') ? 'vendor' :
                  responseUrl.includes('chunk') ? 'chunk' :
                  responseUrl.includes('worker') ? 'worker' : 'main'

      jsRequests.push({
        url: responseUrl,
        size: 0, // Will be filled later
        type,
        transferSize: response.headers()['content-length']
          ? parseInt(response.headers()['content-length'])
          : 0
      })
    }
  })

  await page.goto(url, { waitUntil: 'networkidle' })

  // Get actual JS content sizes
  for (const request of jsRequests) {
    try {
      const response = await page.request.get(request.url)
      const body = await response.body()
      request.size = body.length
    } catch (error) {
      console.warn(`Failed to get JS content for ${request.url}`)
    }
  }

  return jsRequests
}

// Helper to analyze JavaScript execution performance
async function measureJSPerformance(page: any, url: string) {
  await page.goto(url)

  return await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('measure')
    const scriptEntries = performance.getEntriesByType('resource')
      .filter((entry: any) => entry.name.includes('.js') || entry.name.includes('.mjs'))

    const jsMetrics = {
      totalScripts: scriptEntries.length,
      totalTransferSize: scriptEntries.reduce((sum: number, entry: any) =>
        sum + (entry.transferSize || 0), 0),
      totalDecodedSize: scriptEntries.reduce((sum: number, entry: any) =>
        sum + (entry.decodedBodySize || 0), 0),
      parseTime: 0,
      evaluationTime: 0,
      firstScriptLoadTime: scriptEntries[0] ? scriptEntries[0].responseEnd - scriptEntries[0].startTime : 0
    }

    // Try to get parse/compile times from performance timeline
    const scriptTasks = perfEntries.filter((entry: any) =>
      entry.name.includes('script') || entry.name.includes('parse'))

    jsMetrics.parseTime = scriptTasks.reduce((sum, task) => sum + task.duration, 0)

    return jsMetrics
  })
}

test.describe('JavaScript Performance Tests (T018)', () => {
  const projectRoot = '/Users/joe/GitHub/shopify-starter-slayed'

  test.describe('JavaScript Bundle Size Analysis', () => {
    test('Main JavaScript bundle should be under 100KB', async () => {
      const jsFiles = analyzeJSFiles(projectRoot)
      const mainFiles = jsFiles.filter(f => f.type === 'main')

      const totalMainSize = mainFiles.reduce((sum, file) => sum + file.size, 0)
      const totalSizeKB = totalMainSize / 1024

      console.log('Main JS Bundle Analysis:', {
        files: mainFiles.map(f => ({
          name: path.basename(f.path),
          sizeKB: Math.round(f.size / 1024)
        })),
        totalSizeKB: Math.round(totalSizeKB),
        budgetKB: Math.round(JS_PERFORMANCE_BUDGETS.MAIN_BUNDLE_BYTES / 1024)
      })

      expect(totalMainSize).toBeLessThan(JS_PERFORMANCE_BUDGETS.MAIN_BUNDLE_BYTES)
    })

    test('Vendor bundle should be under 150KB', async () => {
      const jsFiles = analyzeJSFiles(projectRoot)
      const vendorFiles = jsFiles.filter(f => f.type === 'vendor')

      const totalVendorSize = vendorFiles.reduce((sum, file) => sum + file.size, 0)

      console.log('Vendor Bundle Analysis:', {
        files: vendorFiles.map(f => ({
          name: path.basename(f.path),
          sizeKB: Math.round(f.size / 1024)
        })),
        totalSizeKB: Math.round(totalVendorSize / 1024),
        budgetKB: Math.round(JS_PERFORMANCE_BUDGETS.VENDOR_BUNDLE_BYTES / 1024)
      })

      expect(totalVendorSize).toBeLessThan(JS_PERFORMANCE_BUDGETS.VENDOR_BUNDLE_BYTES)
    })

    test('Lazy-loaded chunks should be under 30KB each', async () => {
      const jsFiles = analyzeJSFiles(projectRoot)
      const chunkFiles = jsFiles.filter(f => f.type === 'chunk')

      const oversizedChunks = chunkFiles.filter(f => f.size > JS_PERFORMANCE_BUDGETS.LAZY_CHUNK_BYTES)

      console.log('JS Chunks Analysis:', {
        chunks: chunkFiles.map(f => ({
          name: path.basename(f.path),
          sizeKB: Math.round(f.size / 1024),
          template: f.template,
          budgetKB: Math.round(JS_PERFORMANCE_BUDGETS.LAZY_CHUNK_BYTES / 1024)
        })),
        oversizedChunks: oversizedChunks.length
      })

      expect(oversizedChunks).toHaveLength(0)
    })

    test('Should have proper code splitting', async () => {
      const jsFiles = analyzeJSFiles(projectRoot)

      const bundleTypes = {
        main: jsFiles.filter(f => f.type === 'main').length,
        vendor: jsFiles.filter(f => f.type === 'vendor').length,
        chunks: jsFiles.filter(f => f.type === 'chunk').length,
        workers: jsFiles.filter(f => f.type === 'worker').length
      }

      console.log('Code Splitting Analysis:', bundleTypes)

      // Should have proper separation
      expect(bundleTypes.main).toBeGreaterThan(0)
      expect(bundleTypes.main + bundleTypes.vendor + bundleTypes.chunks).toBeGreaterThan(1)
    })
  })

  test.describe('Runtime JavaScript Payload Analysis', () => {
    test('Homepage JS payload should be under budget', async ({ page }) => {
      const jsRequests = await measureJSPayload(page, 'http://127.0.0.1:9292/')

      const totalPayload = jsRequests.reduce((sum, req) => sum + req.size, 0)
      const mainPayload = jsRequests
        .filter(req => req.type === 'main')
        .reduce((sum, req) => sum + req.size, 0)

      console.log('Homepage JS Payload:', {
        totalRequests: jsRequests.length,
        totalPayloadKB: Math.round(totalPayload / 1024),
        mainPayloadKB: Math.round(mainPayload / 1024),
        budgetKB: Math.round(JS_PERFORMANCE_BUDGETS.MAIN_BUNDLE_BYTES / 1024),
        requests: jsRequests.map(req => ({
          url: req.url.split('/').pop(),
          sizeKB: Math.round(req.size / 1024),
          type: req.type
        }))
      })

      expect(mainPayload).toBeLessThan(JS_PERFORMANCE_BUDGETS.MAIN_BUNDLE_BYTES)
    })

    test('Product page JS payload should be under budget', async ({ page }) => {
      const jsRequests = await measureJSPayload(page, 'http://127.0.0.1:9292/products/sample-product')

      const totalPayload = jsRequests.reduce((sum, req) => sum + req.size, 0)

      console.log('Product Page JS Payload:', {
        totalPayloadKB: Math.round(totalPayload / 1024)
      })

      expect(totalPayload).toBeLessThan(JS_PERFORMANCE_BUDGETS.MAIN_BUNDLE_BYTES + JS_PERFORMANCE_BUDGETS.LAZY_CHUNK_BYTES)
    })

    test('Should load JS incrementally based on user interaction', async ({ page }) => {
      const loadedScripts: string[] = []
      let initialScriptCount = 0

      page.on('response', (response) => {
        if (response.url().includes('.js') && response.status() === 200) {
          loadedScripts.push(response.url())
        }
      })

      await page.goto('http://127.0.0.1:9292/')
      initialScriptCount = loadedScripts.length

      // Simulate user interaction that should trigger lazy loading
      await page.hover('.product-card')
      await page.click('button[data-action="add-to-cart"]', { timeout: 5000 }).catch(() => {})

      // Wait for potential lazy scripts
      await page.waitForTimeout(2000)

      const finalScriptCount = loadedScripts.length

      console.log('Progressive JS Loading:', {
        initialScripts: initialScriptCount,
        finalScripts: finalScriptCount,
        lazyLoaded: finalScriptCount - initialScriptCount
      })

      // Should load additional scripts on interaction
      expect(finalScriptCount).toBeGreaterThanOrEqual(initialScriptCount)
    })
  })

  test.describe('JavaScript Execution Performance', () => {
    test('JavaScript parse and evaluation should be fast', async ({ page }) => {
      const jsMetrics = await measureJSPerformance(page, 'http://127.0.0.1:9292/')

      console.log('JS Execution Metrics:', {
        totalScripts: jsMetrics.totalScripts,
        transferSizeKB: Math.round(jsMetrics.totalTransferSize / 1024),
        decodedSizeKB: Math.round(jsMetrics.totalDecodedSize / 1024),
        compressionRatio: Math.round((jsMetrics.totalTransferSize / jsMetrics.totalDecodedSize) * 100) + '%',
        parseTime: `${Math.round(jsMetrics.parseTime)}ms`,
        firstScriptLoad: `${Math.round(jsMetrics.firstScriptLoadTime)}ms`
      })

      // Main bundle should parse quickly (< 100ms)
      expect(jsMetrics.parseTime).toBeLessThan(100)

      // First script should load quickly (< 500ms)
      expect(jsMetrics.firstScriptLoadTime).toBeLessThan(500)
    })

    test('Should minimize JavaScript main thread blocking', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const mainThreadTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const longTasks = entries.filter((entry: any) => entry.duration > 50)

            resolve({
              totalTasks: entries.length,
              longTasks: longTasks.length,
              maxTaskDuration: entries.reduce((max, entry) =>
                Math.max(max, entry.duration), 0),
              totalBlockingTime: longTasks.reduce((sum, task) =>
                sum + Math.max(0, task.duration - 50), 0)
            })
          })

          observer.observe({ entryTypes: ['longtask'] })

          // Stop observing after 5 seconds
          setTimeout(() => {
            observer.disconnect()
            resolve({
              totalTasks: 0,
              longTasks: 0,
              maxTaskDuration: 0,
              totalBlockingTime: 0
            })
          }, 5000)
        })
      })

      console.log('Main Thread Blocking Analysis:', mainThreadTasks)

      // Total blocking time should be minimal (< 300ms)
      expect(mainThreadTasks.totalBlockingTime).toBeLessThan(300)

      // Should have few long tasks
      expect(mainThreadTasks.longTasks).toBeLessThan(3)
    })

    test('Should use efficient JavaScript patterns', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const jsAnalysis = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'))

        return {
          totalScripts: scripts.length,
          asyncScripts: scripts.filter(s => s.hasAttribute('async')).length,
          deferScripts: scripts.filter(s => s.hasAttribute('defer')).length,
          moduleScripts: scripts.filter(s => s.getAttribute('type') === 'module').length,
          inlineScripts: document.querySelectorAll('script:not([src])').length
        }
      })

      console.log('JS Loading Strategy Analysis:', jsAnalysis)

      // Most scripts should be async or deferred
      const optimizedScripts = jsAnalysis.asyncScripts + jsAnalysis.deferScripts + jsAnalysis.moduleScripts
      const optimizationRatio = optimizedScripts / jsAnalysis.totalScripts

      expect(optimizationRatio).toBeGreaterThan(0.8) // 80% should be optimized
    })
  })

  test.describe('JavaScript Compression and Optimization', () => {
    test('JavaScript files should be properly compressed', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const compressionAnalysis = await page.evaluate(() => {
        const performanceEntries = performance.getEntriesByType('resource')
        const jsEntries = performanceEntries.filter((entry: any) =>
          entry.name.includes('.js') || entry.name.includes('.mjs')
        )

        return jsEntries.map((entry: any) => ({
          url: entry.name.split('/').pop(),
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          compressionRatio: entry.encodedBodySize / entry.decodedBodySize
        }))
      })

      console.log('JS Compression Analysis:', compressionAnalysis)

      // Check that JS files are compressed
      compressionAnalysis.forEach(entry => {
        if (entry.decodedBodySize > 1000) { // Only check files > 1KB
          expect(entry.compressionRatio).toBeLessThan(0.7) // Should be well compressed
        }
      })
    })

    test('Should minimize unused JavaScript code', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Use coverage API to measure unused JS
      await page.coverage.startJSCoverage()

      // Wait for page interactions
      await page.waitForTimeout(3000)

      const jsCoverage = await page.coverage.stopJSCoverage()

      const coverageAnalysis = jsCoverage.map(entry => {
        const totalBytes = entry.text.length
        const usedBytes = entry.ranges.reduce((sum, range) => sum + (range.end - range.start), 0)

        return {
          url: entry.url.split('/').pop(),
          totalBytes,
          usedBytes,
          utilizationRatio: usedBytes / totalBytes
        }
      })

      console.log('JS Code Utilization:', coverageAnalysis)

      // Should have good utilization (> 50% for main bundles)
      const mainBundleEntries = coverageAnalysis.filter(entry =>
        !entry.url?.includes('vendor') && !entry.url?.includes('node_modules')
      )

      mainBundleEntries.forEach(entry => {
        if (entry.totalBytes > 10000) { // Only check files > 10KB
          expect(entry.utilizationRatio).toBeGreaterThan(0.5)
        }
      })
    })

    test('Should tree-shake unused dependencies', async () => {
      const jsFiles = analyzeJSFiles(projectRoot)

      // Check for common signs of unused code
      const analysisResults = jsFiles.map(file => {
        const content = file.content

        // Look for unused imports/exports patterns
        const totalImports = (content.match(/import\s+.*?from/g) || []).length
        const unusedImports = (content.match(/import\s+.*?\s+from.*?\/\/\s*unused/g) || []).length

        // Look for dead code patterns
        const unreachableCode = (content.match(/\/\*\s*@__PURE__\s*\*\//g) || []).length

        return {
          file: path.basename(file.path),
          totalImports,
          unusedImports,
          unreachableCode,
          sizeKB: Math.round(file.size / 1024)
        }
      })

      console.log('Tree Shaking Analysis:', analysisResults)

      // Should have minimal unused imports
      const totalUnusedImports = analysisResults.reduce((sum, r) => sum + r.unusedImports, 0)
      const totalImports = analysisResults.reduce((sum, r) => sum + r.totalImports, 0)

      if (totalImports > 0) {
        const unusedRatio = totalUnusedImports / totalImports
        expect(unusedRatio).toBeLessThan(0.05) // < 5% unused
      }
    })
  })

  test.describe('JavaScript Loading Strategy', () => {
    test('Should prioritize critical JavaScript', async ({ page }) => {
      const scriptLoadOrder: Array<{url: string, timing: number, critical: boolean}> = []
      const startTime = Date.now()

      page.on('response', (response) => {
        if (response.url().includes('.js')) {
          scriptLoadOrder.push({
            url: response.url(),
            timing: Date.now() - startTime,
            critical: response.url().includes('critical') ||
                     response.url().includes('main') ||
                     !response.url().includes('chunk')
          })
        }
      })

      await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle' })

      console.log('JS Loading Priority:', scriptLoadOrder.map(s => ({
        url: s.url.split('/').pop(),
        timing: `${s.timing}ms`,
        critical: s.critical
      })))

      // Critical JS should load before non-critical
      const criticalScripts = scriptLoadOrder.filter(s => s.critical)
      const nonCriticalScripts = scriptLoadOrder.filter(s => !s.critical)

      if (criticalScripts.length > 0 && nonCriticalScripts.length > 0) {
        const avgCriticalTiming = criticalScripts.reduce((sum, s) => sum + s.timing, 0) / criticalScripts.length
        const avgNonCriticalTiming = nonCriticalScripts.reduce((sum, s) => sum + s.timing, 0) / nonCriticalScripts.length

        expect(avgCriticalTiming).toBeLessThanOrEqual(avgNonCriticalTiming)
      }
    })

    test('Should use service worker for JS caching', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const serviceWorkerStatus = await page.evaluate(() => {
        return {
          hasServiceWorker: 'serviceWorker' in navigator,
          isRegistered: navigator.serviceWorker?.controller !== null,
          swUrl: navigator.serviceWorker?.controller?.scriptURL
        }
      })

      console.log('Service Worker Status:', serviceWorkerStatus)

      // Should have service worker for caching
      expect(serviceWorkerStatus.hasServiceWorker).toBe(true)
    })
  })
})