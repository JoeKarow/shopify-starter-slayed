/**
 * T017: Performance test for Critical CSS < 14KB
 *
 * This test measures critical CSS payload per template to ensure
 * it stays under the 14KB budget for optimal above-the-fold rendering.
 *
 * Target: Critical CSS < 14KB (14,336 bytes) per template
 *
 * These tests WILL FAIL initially as the critical CSS extraction
 * system isn't fully implemented yet. This follows TDD principles.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Performance budget for critical CSS
const CRITICAL_CSS_BUDGETS = {
  MAX_BYTES: 14 * 1024, // 14KB in bytes
  MAX_BYTES_GZIPPED: 4 * 1024, // ~4KB after gzip compression
  WARNING_THRESHOLD: 12 * 1024, // Warning at 12KB
  INLINE_THRESHOLD: 2 * 1024 // Inline if under 2KB
}

// Template-specific critical CSS expectations
const TEMPLATE_EXPECTATIONS = {
  'index': {
    maxBytes: CRITICAL_CSS_BUDGETS.MAX_BYTES,
    requiredSelectors: ['.header', '.hero', '.navigation'],
    forbiddenSelectors: ['.footer', '.modal', '.cart-drawer']
  },
  'product': {
    maxBytes: CRITICAL_CSS_BUDGETS.MAX_BYTES,
    requiredSelectors: ['.header', '.product-hero', '.product-title', '.product-price'],
    forbiddenSelectors: ['.product-reviews', '.related-products', '.cart-drawer']
  },
  'collection': {
    maxBytes: CRITICAL_CSS_BUDGETS.MAX_BYTES,
    requiredSelectors: ['.header', '.collection-hero', '.product-grid'],
    forbiddenSelectors: ['.filters-modal', '.cart-drawer', '.pagination']
  },
  'cart': {
    maxBytes: CRITICAL_CSS_BUDGETS.MAX_BYTES,
    requiredSelectors: ['.header', '.cart-items', '.cart-total'],
    forbiddenSelectors: ['.checkout-form', '.shipping-calculator']
  }
}

// Helper function to analyze critical CSS files
function analyzeCriticalCSS(projectRoot: string) {
  const criticalFiles: Array<{
    path: string
    template: string
    size: number
    content: string
    selectors: string[]
    mediaQueries: string[]
  }> = []

  const possibleDirs = [
    path.join(projectRoot, 'assets'),
    path.join(projectRoot, 'frontend', 'entrypoints', 'critical'),
    path.join(projectRoot, 'dist', 'critical'),
    path.join(projectRoot, 'build', 'critical')
  ]

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir)

        for (const file of files) {
          if (file.includes('critical') && file.endsWith('.css')) {
            const filePath = path.join(dir, file)
            const content = fs.readFileSync(filePath, 'utf8')
            const size = Buffer.byteLength(content, 'utf8')

            // Extract template name from filename
            const templateMatch = file.match(/critical-(\w+)\.css/) || file.match(/(\w+)-critical\.css/)
            const template = templateMatch ? templateMatch[1] : 'global'

            // Extract selectors and media queries
            const selectors = (content.match(/[^{}]+(?=\s*\{)/g) || [])
              .map(s => s.trim())
              .filter(s => s && !s.startsWith('@'))

            const mediaQueries = (content.match(/@media[^{]+/g) || [])
              .map(m => m.trim())

            criticalFiles.push({
              path: filePath,
              template,
              size,
              content,
              selectors,
              mediaQueries
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}:`, error)
      }
    }
  }

  return criticalFiles
}

// Helper to extract critical CSS from runtime
async function extractRuntimeCriticalCSS(page: any, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' })

  return await page.evaluate(() => {
    const criticalStyles: Array<{
      selector: string
      rules: string
      source: 'inline' | 'external'
      size: number
    }> = []

    // Get inline styles
    const inlineStyles = Array.from(document.querySelectorAll('style'))
    for (const style of inlineStyles) {
      const content = style.textContent || ''
      const size = new TextEncoder().encode(content).length

      criticalStyles.push({
        selector: 'inline-style',
        rules: content,
        source: 'inline',
        size
      })
    }

    // Get external stylesheets marked as critical
    const criticalLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    for (const link of criticalLinks) {
      const href = link.getAttribute('href') || ''
      if (href.includes('critical')) {
        criticalStyles.push({
          selector: 'critical-css',
          rules: '',
          source: 'external',
          size: 0 // Will be measured separately
        })
      }
    }

    return criticalStyles
  })
}

// Helper to calculate gzipped size (approximation)
function estimateGzippedSize(content: string): number {
  // Simple heuristic: gzip typically achieves ~70% compression on CSS
  return Math.round(Buffer.byteLength(content, 'utf8') * 0.3)
}

test.describe('Critical CSS Performance Tests (T017)', () => {
  const projectRoot = '/Users/joe/GitHub/shopify-starter-slayed'

  test.describe('Critical CSS File Analysis', () => {
    test('Critical CSS files should exist for each template', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)
      const templates = Object.keys(TEMPLATE_EXPECTATIONS)

      console.log('Found Critical CSS Files:', criticalFiles.map(f => ({
        template: f.template,
        sizeKB: Math.round(f.size / 1024),
        path: path.basename(f.path)
      })))

      // Should have critical CSS for each expected template
      for (const template of templates) {
        const templateFile = criticalFiles.find(f => f.template === template)
        expect(templateFile, `Missing critical CSS for template: ${template}`).toBeDefined()
      }
    })

    test('Each critical CSS file should be under 14KB', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)
      const violations: Array<{ template: string; size: number; budget: number }> = []

      for (const file of criticalFiles) {
        if (file.size > CRITICAL_CSS_BUDGETS.MAX_BYTES) {
          violations.push({
            template: file.template,
            size: file.size,
            budget: CRITICAL_CSS_BUDGETS.MAX_BYTES
          })
        }
      }

      console.log('Critical CSS Size Analysis:', {
        files: criticalFiles.map(f => ({
          template: f.template,
          sizeBytes: f.size,
          sizeKB: Math.round(f.size / 1024),
          gzippedKB: Math.round(estimateGzippedSize(f.content) / 1024),
          budgetKB: Math.round(CRITICAL_CSS_BUDGETS.MAX_BYTES / 1024)
        })),
        violations
      })

      expect(violations).toHaveLength(0)
    })

    test('Global critical CSS should be under 14KB', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)
      const globalFile = criticalFiles.find(f => f.template === 'global')

      if (globalFile) {
        console.log('Global Critical CSS:', {
          sizeKB: Math.round(globalFile.size / 1024),
          budgetKB: Math.round(CRITICAL_CSS_BUDGETS.MAX_BYTES / 1024)
        })

        expect(globalFile.size).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES)
      }
    })

    test('Critical CSS should contain required above-the-fold selectors', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const [templateName, expectations] of Object.entries(TEMPLATE_EXPECTATIONS)) {
        const templateFile = criticalFiles.find(f => f.template === templateName)

        if (templateFile) {
          const missingSelectors: string[] = []

          for (const requiredSelector of expectations.requiredSelectors) {
            const hasSelector = templateFile.selectors.some(selector =>
              selector.includes(requiredSelector.replace('.', ''))
            )

            if (!hasSelector) {
              missingSelectors.push(requiredSelector)
            }
          }

          console.log(`${templateName} template critical CSS:`, {
            requiredSelectors: expectations.requiredSelectors,
            foundSelectors: templateFile.selectors.slice(0, 10), // First 10 selectors
            missingSelectors
          })

          expect(missingSelectors).toHaveLength(0)
        }
      }
    })

    test('Critical CSS should not contain below-the-fold styles', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const [templateName, expectations] of Object.entries(TEMPLATE_EXPECTATIONS)) {
        const templateFile = criticalFiles.find(f => f.template === templateName)

        if (templateFile) {
          const forbiddenSelectors: string[] = []

          for (const forbiddenSelector of expectations.forbiddenSelectors) {
            const hasSelector = templateFile.selectors.some(selector =>
              selector.includes(forbiddenSelector.replace('.', ''))
            )

            if (hasSelector) {
              forbiddenSelectors.push(forbiddenSelector)
            }
          }

          console.log(`${templateName} forbidden selectors check:`, {
            forbiddenSelectors: expectations.forbiddenSelectors,
            violations: forbiddenSelectors
          })

          expect(forbiddenSelectors).toHaveLength(0)
        }
      }
    })

    test('Critical CSS should have optimal compression characteristics', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const file of criticalFiles) {
        const originalSize = file.size
        const estimatedGzipped = estimateGzippedSize(file.content)
        const compressionRatio = estimatedGzipped / originalSize

        console.log(`${file.template} compression analysis:`, {
          originalKB: Math.round(originalSize / 1024),
          gzippedKB: Math.round(estimatedGzipped / 1024),
          compressionRatio: Math.round(compressionRatio * 100) + '%'
        })

        // Should achieve good compression (< 40% of original size)
        expect(compressionRatio).toBeLessThan(0.4)

        // Gzipped size should be under 4KB
        expect(estimatedGzipped).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES_GZIPPED)
      }
    })
  })

  test.describe('Runtime Critical CSS Analysis', () => {
    test('Homepage should have optimal critical CSS delivery', async ({ page }) => {
      const criticalStyles = await extractRuntimeCriticalCSS(page, 'http://127.0.0.1:9292/')

      const totalInlineSize = criticalStyles
        .filter(s => s.source === 'inline')
        .reduce((sum, s) => sum + s.size, 0)

      console.log('Homepage Critical CSS Delivery:', {
        inlineStyles: criticalStyles.filter(s => s.source === 'inline').length,
        externalCritical: criticalStyles.filter(s => s.source === 'external').length,
        totalInlineSizeKB: Math.round(totalInlineSize / 1024),
        budgetKB: Math.round(CRITICAL_CSS_BUDGETS.MAX_BYTES / 1024)
      })

      expect(totalInlineSize).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES)
    })

    test('Product page should have optimal critical CSS delivery', async ({ page }) => {
      const criticalStyles = await extractRuntimeCriticalCSS(page, 'http://127.0.0.1:9292/products/sample-product')

      const totalInlineSize = criticalStyles
        .filter(s => s.source === 'inline')
        .reduce((sum, s) => sum + s.size, 0)

      expect(totalInlineSize).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES)
    })

    test('Collection page should have optimal critical CSS delivery', async ({ page }) => {
      const criticalStyles = await extractRuntimeCriticalCSS(page, 'http://127.0.0.1:9292/collections/all')

      const totalInlineSize = criticalStyles
        .filter(s => s.source === 'inline')
        .reduce((sum, s) => sum + s.size, 0)

      expect(totalInlineSize).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES)
    })

    test('Cart page should have optimal critical CSS delivery', async ({ page }) => {
      const criticalStyles = await extractRuntimeCriticalCSS(page, 'http://127.0.0.1:9292/cart')

      const totalInlineSize = criticalStyles
        .filter(s => s.source === 'inline')
        .reduce((sum, s) => sum + s.size, 0)

      expect(totalInlineSize).toBeLessThan(CRITICAL_CSS_BUDGETS.MAX_BYTES)
    })
  })

  test.describe('Critical CSS Content Quality', () => {
    test('Should prioritize above-the-fold content', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Measure which elements are styled by critical CSS
      const criticalCoverage = await page.evaluate(() => {
        const criticalElements = [
          'header',
          '.hero',
          '.navigation',
          'h1',
          '.product-card:first-of-type'
        ]

        const coverage = criticalElements.map(selector => {
          const element = document.querySelector(selector)
          if (!element) return { selector, found: false, styled: false }

          const computedStyle = window.getComputedStyle(element)
          const isStyled = computedStyle.display !== 'inline' ||
                           computedStyle.color !== 'rgb(0, 0, 0)' ||
                           computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'

          return {
            selector,
            found: true,
            styled: isStyled
          }
        })

        return coverage
      })

      console.log('Critical CSS Coverage Analysis:', criticalCoverage)

      // Most critical elements should be styled
      const styledElements = criticalCoverage.filter(c => c.found && c.styled)
      const foundElements = criticalCoverage.filter(c => c.found)

      if (foundElements.length > 0) {
        const coverageRatio = styledElements.length / foundElements.length
        expect(coverageRatio).toBeGreaterThan(0.8) // 80% coverage
      }
    })

    test('Should avoid redundant or duplicate styles', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const file of criticalFiles) {
        const rules = file.content.match(/[^{}]+\{[^{}]*\}/g) || []
        const uniqueRules = [...new Set(rules.map(r => r.replace(/\s+/g, ' ').trim()))]

        const redundancyRatio = (rules.length - uniqueRules.length) / rules.length

        console.log(`${file.template} redundancy analysis:`, {
          totalRules: rules.length,
          uniqueRules: uniqueRules.length,
          redundancyRatio: Math.round(redundancyRatio * 100) + '%'
        })

        // Should have minimal redundancy (< 5%)
        expect(redundancyRatio).toBeLessThan(0.05)
      }
    })

    test('Should use efficient CSS selectors', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const file of criticalFiles) {
        const inefficientSelectors = file.selectors.filter(selector => {
          // Check for inefficient patterns
          const hasUniversalSelector = selector.includes('*')
          const hasDeeplyNested = (selector.match(/>/g) || []).length > 3
          const hasComplexPseudo = /:(nth-child|nth-of-type)\([^)]+\)/.test(selector)

          return hasUniversalSelector || hasDeeplyNested || hasComplexPseudo
        })

        console.log(`${file.template} selector efficiency:`, {
          totalSelectors: file.selectors.length,
          inefficientSelectors: inefficientSelectors.length,
          examples: inefficientSelectors.slice(0, 3)
        })

        // Should have minimal inefficient selectors (< 10%)
        const inefficiencyRatio = inefficientSelectors.length / file.selectors.length
        expect(inefficiencyRatio).toBeLessThan(0.1)
      }
    })

    test('Should include responsive breakpoints only for critical viewport', async () => {
      const criticalFiles = analyzeCriticalCSS(projectRoot)

      for (const file of criticalFiles) {
        const mediaQueries = file.mediaQueries

        // Should primarily target mobile-first breakpoints
        const mobileQueries = mediaQueries.filter(mq =>
          mq.includes('max-width') &&
          (mq.includes('768px') || mq.includes('640px') || mq.includes('480px'))
        )

        const desktopQueries = mediaQueries.filter(mq =>
          mq.includes('min-width') &&
          (mq.includes('1200px') || mq.includes('1440px'))
        )

        console.log(`${file.template} media queries:`, {
          total: mediaQueries.length,
          mobile: mobileQueries.length,
          desktop: desktopQueries.length
        })

        // Should prioritize mobile breakpoints in critical CSS
        if (mediaQueries.length > 0) {
          expect(mobileQueries.length).toBeGreaterThanOrEqual(desktopQueries.length)
        }
      }
    })
  })

  test.describe('Critical CSS Loading Strategy', () => {
    test('Should inline critical CSS under 2KB', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const inlineStrategy = await page.evaluate(() => {
        const styles = Array.from(document.querySelectorAll('style'))
        const smallInlineStyles = styles.filter(style => {
          const size = new TextEncoder().encode(style.textContent || '').length
          return size < 2048 // 2KB
        })

        const largeInlineStyles = styles.filter(style => {
          const size = new TextEncoder().encode(style.textContent || '').length
          return size >= 2048
        })

        return {
          totalStyles: styles.length,
          smallInline: smallInlineStyles.length,
          largeInline: largeInlineStyles.length,
          totalInlineSize: styles.reduce((sum, style) =>
            sum + new TextEncoder().encode(style.textContent || '').length, 0
          )
        }
      })

      console.log('Inline CSS Strategy:', inlineStrategy)

      // Large critical CSS should be external, small should be inline
      expect(inlineStrategy.smallInline).toBeGreaterThanOrEqual(inlineStrategy.largeInline)
    })

    test('Should preload critical CSS files', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const preloadStrategy = await page.evaluate(() => {
        const preloadLinks = Array.from(document.querySelectorAll('link[rel="preload"][as="style"]'))
        const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))

        return {
          preloadedCSS: preloadLinks.map(link => link.getAttribute('href')),
          stylesheetCSS: stylesheetLinks.map(link => link.getAttribute('href')),
          criticalPreloads: preloadLinks.filter(link =>
            link.getAttribute('href')?.includes('critical')
          ).length
        }
      })

      console.log('CSS Preload Strategy:', preloadStrategy)

      // Should preload critical CSS files
      expect(preloadStrategy.criticalPreloads).toBeGreaterThan(0)
    })

    test('Should defer non-critical CSS loading', async ({ page }) => {
      const deferredResources: string[] = []

      page.on('response', (response) => {
        if (response.url().includes('.css') && !response.url().includes('critical')) {
          deferredResources.push(response.url())
        }
      })

      await page.goto('http://127.0.0.1:9292/', { waitUntil: 'load' })

      // Wait for deferred CSS to load
      await page.waitForTimeout(2000)

      console.log('Deferred CSS Resources:', deferredResources.map(url => url.split('/').pop()))

      // Non-critical CSS should load after initial page load
      expect(deferredResources.length).toBeGreaterThan(0)
    })
  })
})