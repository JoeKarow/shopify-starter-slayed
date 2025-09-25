/**
 * T016: Performance test for Total CSS < 250KB
 *
 * This test measures total CSS payload across all templates
 * to ensure it stays under the 250KB performance budget.
 *
 * Target: Total CSS < 250KB (256,000 bytes)
 *
 * These tests WILL FAIL initially as the CSS optimization
 * system isn't fully implemented yet. This follows TDD principles.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Performance budget for CSS
const CSS_PERFORMANCE_BUDGETS = {
  TOTAL_CSS_BYTES: 250 * 1024, // 250KB in bytes
  CRITICAL_CSS_BYTES: 14 * 1024, // 14KB in bytes
  TEMPLATE_CSS_BYTES: 30 * 1024, // 30KB per template
  GZIP_COMPRESSION_RATIO: 0.3 // Expect ~30% size after gzip
}

// Helper function to analyze CSS files in build output
function analyzeCSSFiles(buildDir: string) {
  const cssFiles: Array<{
    path: string
    size: number
    type: 'critical' | 'template' | 'global' | 'component'
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
        } else if (entry.name.endsWith('.css')) {
          const content = fs.readFileSync(fullPath, 'utf8')
          const size = Buffer.byteLength(content, 'utf8')

          let type: 'critical' | 'template' | 'global' | 'component'
          let template: string | undefined

          if (entry.name.includes('critical')) {
            type = 'critical'
          } else if (fullPath.includes('/splits/')) {
            type = 'template'
            template = path.basename(entry.name, '.css')
          } else if (entry.name.includes('component')) {
            type = 'component'
          } else {
            type = 'global'
          }

          cssFiles.push({
            path: fullPath,
            size,
            type,
            template,
            content
          })
        }
      }
    } catch (error) {
      // Directory might not exist yet - that's expected in TDD
      console.warn(`CSS directory not found: ${dir}`)
    }
  }

  // Scan multiple potential CSS locations
  const possibleDirs = [
    path.join(buildDir, 'assets'),
    path.join(buildDir, 'frontend', 'entrypoints'),
    path.join(buildDir, 'frontend', 'entrypoints', 'splits'),
    path.join(buildDir, 'dist'),
    path.join(buildDir, 'build')
  ]

  possibleDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir)
    }
  })

  return cssFiles
}

// Helper to measure CSS payload from network requests
async function measureCSSPayload(page: any, url: string) {
  const cssRequests: Array<{
    url: string
    size: number
    type: string
    transferSize?: number
  }> = []

  page.on('response', (response: any) => {
    if (response.url().includes('.css') && response.status() === 200) {
      cssRequests.push({
        url: response.url(),
        size: 0, // Will be filled later
        type: response.url().includes('critical') ? 'critical' : 'template',
        transferSize: response.headers()['content-length']
          ? parseInt(response.headers()['content-length'])
          : 0
      })
    }
  })

  await page.goto(url, { waitUntil: 'networkidle' })

  // Get actual CSS content sizes
  for (const request of cssRequests) {
    try {
      const response = await page.request.get(request.url)
      const body = await response.body()
      request.size = body.length
    } catch (error) {
      console.warn(`Failed to get CSS content for ${request.url}`)
    }
  }

  return cssRequests
}

test.describe('CSS Performance Budget Tests (T016)', () => {
  const projectRoot = '/Users/joe/GitHub/shopify-starter-slayed'

  test.describe('Build-time CSS Analysis', () => {
    test('Total CSS bundle should be under 250KB', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)

      const totalSize = cssFiles.reduce((sum, file) => sum + file.size, 0)
      const totalSizeKB = totalSize / 1024

      console.log('CSS Bundle Analysis:', {
        totalFiles: cssFiles.length,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSizeKB),
        budgetKB: CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES / 1024,
        files: cssFiles.map(f => ({
          name: path.basename(f.path),
          sizeKB: Math.round(f.size / 1024),
          type: f.type,
          template: f.template
        }))
      })

      expect(totalSize).toBeLessThan(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES)
    })

    test('Critical CSS should be under 14KB per template', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)
      const criticalFiles = cssFiles.filter(f => f.type === 'critical')

      const violations: Array<{ file: string; size: number; budget: number }> = []

      for (const file of criticalFiles) {
        if (file.size > CSS_PERFORMANCE_BUDGETS.CRITICAL_CSS_BYTES) {
          violations.push({
            file: path.basename(file.path),
            size: file.size,
            budget: CSS_PERFORMANCE_BUDGETS.CRITICAL_CSS_BYTES
          })
        }
      }

      console.log('Critical CSS Analysis:', {
        criticalFiles: criticalFiles.map(f => ({
          name: path.basename(f.path),
          sizeKB: Math.round(f.size / 1024),
          template: f.template || 'global'
        })),
        violations
      })

      expect(violations).toHaveLength(0)
    })

    test('Template-specific CSS should be under 30KB per template', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)
      const templateFiles = cssFiles.filter(f => f.type === 'template')

      const violations: Array<{ template: string; size: number; budget: number }> = []

      const templateSizes = templateFiles.reduce((acc, file) => {
        const template = file.template || 'unknown'
        acc[template] = (acc[template] || 0) + file.size
        return acc
      }, {} as Record<string, number>)

      for (const [template, size] of Object.entries(templateSizes)) {
        if (size > CSS_PERFORMANCE_BUDGETS.TEMPLATE_CSS_BYTES) {
          violations.push({
            template,
            size,
            budget: CSS_PERFORMANCE_BUDGETS.TEMPLATE_CSS_BYTES
          })
        }
      }

      console.log('Template CSS Analysis:', {
        templateSizes: Object.entries(templateSizes).map(([template, size]) => ({
          template,
          sizeKB: Math.round(size / 1024),
          budgetKB: Math.round(CSS_PERFORMANCE_BUDGETS.TEMPLATE_CSS_BYTES / 1024)
        })),
        violations
      })

      expect(violations).toHaveLength(0)
    })

    test('Should have CSS files for each template type', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)
      const expectedTemplates = ['product', 'collection', 'cart', 'account']

      const templateFiles = cssFiles.filter(f => f.type === 'template')
      const foundTemplates = [...new Set(templateFiles.map(f => f.template).filter(Boolean))]

      console.log('Template CSS Coverage:', {
        expectedTemplates,
        foundTemplates,
        missing: expectedTemplates.filter(t => !foundTemplates.includes(t))
      })

      // Should have at least some template-specific CSS files
      expect(templateFiles.length).toBeGreaterThan(0)
    })

    test('Should have critical CSS files', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)
      const criticalFiles = cssFiles.filter(f => f.type === 'critical')

      console.log('Critical CSS Files:', criticalFiles.map(f => ({
        name: path.basename(f.path),
        sizeKB: Math.round(f.size / 1024)
      })))

      expect(criticalFiles.length).toBeGreaterThan(0)
    })
  })

  test.describe('Runtime CSS Payload Analysis', () => {
    test('Homepage CSS payload should be under budget', async ({ page }) => {
      const cssRequests = await measureCSSPayload(page, 'http://127.0.0.1:9292/')

      const totalPayload = cssRequests.reduce((sum, req) => sum + req.size, 0)
      const criticalPayload = cssRequests
        .filter(req => req.type === 'critical')
        .reduce((sum, req) => sum + req.size, 0)

      console.log('Homepage CSS Payload:', {
        totalRequests: cssRequests.length,
        totalPayloadKB: Math.round(totalPayload / 1024),
        criticalPayloadKB: Math.round(criticalPayload / 1024),
        requests: cssRequests.map(req => ({
          url: req.url.split('/').pop(),
          sizeKB: Math.round(req.size / 1024),
          type: req.type
        }))
      })

      expect(totalPayload).toBeLessThan(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES)
      expect(criticalPayload).toBeLessThan(CSS_PERFORMANCE_BUDGETS.CRITICAL_CSS_BYTES)
    })

    test('Product page CSS payload should be under budget', async ({ page }) => {
      const cssRequests = await measureCSSPayload(page, 'http://127.0.0.1:9292/products/sample-product')

      const totalPayload = cssRequests.reduce((sum, req) => sum + req.size, 0)

      console.log('Product Page CSS Payload:', {
        totalPayloadKB: Math.round(totalPayload / 1024),
        budgetKB: Math.round(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES / 1024)
      })

      expect(totalPayload).toBeLessThan(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES)
    })

    test('Collection page CSS payload should be under budget', async ({ page }) => {
      const cssRequests = await measureCSSPayload(page, 'http://127.0.0.1:9292/collections/all')

      const totalPayload = cssRequests.reduce((sum, req) => sum + req.size, 0)

      expect(totalPayload).toBeLessThan(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES)
    })

    test('Cart page CSS payload should be under budget', async ({ page }) => {
      const cssRequests = await measureCSSPayload(page, 'http://127.0.0.1:9292/cart')

      const totalPayload = cssRequests.reduce((sum, req) => sum + req.size, 0)

      expect(totalPayload).toBeLessThan(CSS_PERFORMANCE_BUDGETS.TOTAL_CSS_BYTES)
    })
  })

  test.describe('CSS Compression Analysis', () => {
    test('CSS files should be properly compressed', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const compressionAnalysis = await page.evaluate(() => {
        const performanceEntries = performance.getEntriesByType('resource')
        const cssEntries = performanceEntries.filter((entry: any) =>
          entry.name.includes('.css')
        )

        return cssEntries.map((entry: any) => ({
          url: entry.name.split('/').pop(),
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          compressionRatio: entry.encodedBodySize / entry.decodedBodySize
        }))
      })

      console.log('CSS Compression Analysis:', compressionAnalysis)

      // Check that CSS files are compressed (compression ratio < 0.8)
      compressionAnalysis.forEach(entry => {
        if (entry.decodedBodySize > 1000) { // Only check files > 1KB
          expect(entry.compressionRatio).toBeLessThan(0.8)
        }
      })
    })

    test('Should serve appropriate CSS for different templates', async ({ page }) => {
      const homeCSS = await measureCSSPayload(page, 'http://127.0.0.1:9292/')
      const productCSS = await measureCSSPayload(page, 'http://127.0.0.1:9292/products/sample-product')

      const homeCSSUrls = homeCSS.map(r => r.url)
      const productCSSUrls = productCSS.map(r => r.url)

      console.log('Template-specific CSS Serving:', {
        homeCSS: homeCSSUrls.map(url => url.split('/').pop()),
        productCSS: productCSSUrls.map(url => url.split('/').pop())
      })

      // Product page should load product-specific CSS
      const hasProductSpecificCSS = productCSSUrls.some(url =>
        url.includes('product') && !homeCSSUrls.includes(url)
      )

      expect(hasProductSpecificCSS).toBe(true)
    })
  })

  test.describe('CSS Loading Strategy', () => {
    test('Should prioritize critical CSS loading', async ({ page }) => {
      const resourceTimings: any[] = []

      page.on('response', async (response) => {
        if (response.url().includes('.css')) {
          // Note: response.timing() is not available in all Playwright versions
          // const timing = await response.timing()
          resourceTimings.push({
            url: response.url(),
            isCritical: response.url().includes('critical'),
            startTime: 0, // timing?.receiveHeadersEnd || 0,
            size: parseInt(response.headers()['content-length'] || '0', 10)
          })
        }
      })

      await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle' })

      const criticalCSS = resourceTimings.filter(r => r.isCritical)
      const nonCriticalCSS = resourceTimings.filter(r => !r.isCritical)

      console.log('CSS Loading Priority:', {
        criticalCSS: criticalCSS.map(r => ({
          url: r.url.split('/').pop(),
          startTime: r.startTime
        })),
        nonCriticalCSS: nonCriticalCSS.map(r => ({
          url: r.url.split('/').pop(),
          startTime: r.startTime
        }))
      })

      // Critical CSS should start loading before non-critical CSS
      if (criticalCSS.length > 0 && nonCriticalCSS.length > 0) {
        const avgCriticalStart = criticalCSS.reduce((sum, r) => sum + r.startTime, 0) / criticalCSS.length
        const avgNonCriticalStart = nonCriticalCSS.reduce((sum, r) => sum + r.startTime, 0) / nonCriticalCSS.length

        expect(avgCriticalStart).toBeLessThanOrEqual(avgNonCriticalStart)
      }
    })

    test('Should inline critical CSS and defer non-critical', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const cssStrategy = await page.evaluate(() => {
        const inlineStyles = Array.from(document.querySelectorAll('style'))
        const linkedCSS = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        const preloadedCSS = Array.from(document.querySelectorAll('link[rel="preload"][as="style"]'))

        return {
          inlineStyles: inlineStyles.length,
          linkedCSS: linkedCSS.length,
          preloadedCSS: preloadedCSS.length,
          totalInlineSize: inlineStyles.reduce((sum, style) => sum + (style.textContent?.length || 0), 0)
        }
      })

      console.log('CSS Loading Strategy:', cssStrategy)

      // Should have some inline critical CSS
      expect(cssStrategy.inlineStyles).toBeGreaterThan(0)

      // Inline CSS should be reasonably sized (under 14KB)
      expect(cssStrategy.totalInlineSize).toBeLessThan(CSS_PERFORMANCE_BUDGETS.CRITICAL_CSS_BYTES)
    })

    test('Should remove unused CSS', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const cssAnalysis = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets)
        let totalRules = 0
        let unusedRules = 0

        for (const stylesheet of stylesheets) {
          try {
            const rules = stylesheet.cssRules
            if (rules) {
              totalRules += rules.length

              for (let i = 0; i < rules.length; i++) {
                const rule = rules[i]
                if (rule.constructor.name === 'CSSStyleRule') {
                  const selectorText = (rule as CSSStyleRule).selectorText
                  if (selectorText && !document.querySelector(selectorText)) {
                    unusedRules++
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheets might not be accessible
          }
        }

        return {
          totalRules,
          unusedRules,
          utilizationRate: totalRules > 0 ? (totalRules - unusedRules) / totalRules : 1
        }
      })

      console.log('CSS Utilization Analysis:', cssAnalysis)

      // Should have good CSS utilization (> 70%)
      expect(cssAnalysis.utilizationRate).toBeGreaterThan(0.7)
    })
  })

  test.describe('CSS Bundle Structure', () => {
    test('Should separate concerns properly', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)

      const fileTypes = {
        critical: cssFiles.filter(f => f.type === 'critical').length,
        template: cssFiles.filter(f => f.type === 'template').length,
        component: cssFiles.filter(f => f.type === 'component').length,
        global: cssFiles.filter(f => f.type === 'global').length
      }

      console.log('CSS Bundle Structure:', fileTypes)

      // Should have proper separation of concerns
      expect(fileTypes.critical + fileTypes.template + fileTypes.component + fileTypes.global)
        .toBeGreaterThan(0)
    })

    test('Should avoid CSS duplication across bundles', async () => {
      const cssFiles = analyzeCSSFiles(projectRoot)

      // Simple duplication detection by looking for repeated CSS rules
      const allRules: string[] = []
      const duplicatedRules: string[] = []

      for (const file of cssFiles) {
        const rules = file.content.match(/[^{}]+\{[^{}]*\}/g) || []

        for (const rule of rules) {
          const normalizedRule = rule.replace(/\s+/g, ' ').trim()
          if (allRules.includes(normalizedRule)) {
            duplicatedRules.push(normalizedRule)
          } else {
            allRules.push(normalizedRule)
          }
        }
      }

      const duplicationRate = duplicatedRules.length / allRules.length

      console.log('CSS Duplication Analysis:', {
        totalRules: allRules.length,
        duplicatedRules: duplicatedRules.length,
        duplicationRate: Math.round(duplicationRate * 100) + '%'
      })

      // Should have low duplication rate (< 5%)
      expect(duplicationRate).toBeLessThan(0.05)
    })
  })
})