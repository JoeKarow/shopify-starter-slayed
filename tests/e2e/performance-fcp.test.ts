/**
 * T018b: Performance test for FCP < 1.8s
 *
 * This test measures First Contentful Paint (FCP) to ensure
 * users see content quickly, especially on mobile devices.
 *
 * Target: FCP < 1800ms on mobile, < 1200ms on desktop
 *
 * These tests WILL FAIL initially as the performance optimizations
 * aren't fully implemented yet. This follows TDD principles.
 */

import { test, expect, devices } from '@playwright/test'

// Performance budgets for FCP
const FCP_BUDGETS = {
  MOBILE_3G: 1800, // 1.8 seconds
  MOBILE_WIFI: 1200, // 1.2 seconds
  DESKTOP: 800, // 0.8 seconds
  GOOD_THRESHOLD: 1800, // Web Vitals "good" threshold
  POOR_THRESHOLD: 3000 // Web Vitals "poor" threshold
}

// Network conditions
const NETWORK_CONDITIONS = {
  '3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 750
  }
}

// Helper to measure FCP and related paint metrics
async function measurePaintMetrics(page: any) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      let fcp = 0
      let fmp = 0
      let lcp = 0

      // Try to use web-vitals library if available
      if ((window as any).webVitals) {
        import('web-vitals').then(({ getFCP, getLCP }) => {
          let collected = 0

          getFCP((metric) => {
            fcp = metric.value
            if (++collected === 2) resolve({ fcp, fmp, lcp })
          })

          getLCP((metric) => {
            lcp = metric.value
            if (++collected === 2) resolve({ fcp, fmp, lcp })
          })
        }).catch(() => {
          resolve(getManualPaintMetrics())
        })
      } else {
        resolve(getManualPaintMetrics())
      }

      function getManualPaintMetrics() {
        const paintEntries = performance.getEntriesByType('paint')

        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        const fmpEntry = paintEntries.find(entry => entry.name === 'first-meaningful-paint')

        fcp = fcpEntry?.startTime || 0
        fmp = fmpEntry?.startTime || 0

        // Estimate LCP from navigation timing if not available
        const navigation = performance.getEntriesByType('navigation')[0] as any
        lcp = navigation?.loadEventEnd || 0

        return { fcp, fmp, lcp }
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve(getManualPaintMetrics())
      }, 10000)
    })
  })
}

// Helper to setup network throttling
async function setupNetworkThrottling(page: any, condition: keyof typeof NETWORK_CONDITIONS) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    ...NETWORK_CONDITIONS[condition]
  })
  return cdp
}

// Helper to analyze render-blocking resources
async function analyzeRenderBlocking(page: any) {
  return await page.evaluate(() => {
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    const blockingScripts = Array.from(document.querySelectorAll('script:not([async]):not([defer])'))
    const inlineStyles = Array.from(document.querySelectorAll('style'))

    return {
      blockingStylesheets: stylesheets.length,
      blockingScripts: blockingScripts.filter(s => s.getAttribute('src')).length,
      inlineStyles: inlineStyles.length,
      totalInlineCSS: inlineStyles.reduce((sum, style) => sum + (style.textContent?.length || 0), 0)
    }
  })
}

test.describe('FCP Performance Tests (T018b)', () => {
  test.describe('Mobile FCP on 3G Network', () => {
    test('Homepage FCP should be under 1.8s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      // Set up 3G network throttling
      await setupNetworkThrottling(page, '3G')

      const startTime = Date.now()

      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle',
        timeout: 15000
      })

      const paintMetrics = await measurePaintMetrics(page)
      const navigationTime = Date.now() - startTime

      console.log('Mobile 3G Homepage FCP:', {
        fcp: `${paintMetrics.fcp}ms`,
        fmp: `${paintMetrics.fmp}ms`,
        lcp: `${paintMetrics.lcp}ms`,
        navigationTime: `${navigationTime}ms`,
        budget: `${FCP_BUDGETS.MOBILE_3G}ms`
      })

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.MOBILE_3G)

      await context.close()
    })

    test('Product page FCP should be under 1.8s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await setupNetworkThrottling(page, '3G')

      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle',
        timeout: 15000
      })

      const paintMetrics = await measurePaintMetrics(page)

      console.log('Mobile 3G Product Page FCP:', {
        fcp: `${paintMetrics.fcp}ms`,
        budget: `${FCP_BUDGETS.MOBILE_3G}ms`
      })

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.MOBILE_3G)

      await context.close()
    })

    test('Collection page FCP should be under 1.8s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await setupNetworkThrottling(page, '3G')

      await page.goto('http://127.0.0.1:9292/collections/all', {
        waitUntil: 'networkidle',
        timeout: 15000
      })

      const paintMetrics = await measurePaintMetrics(page)

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.MOBILE_3G)

      await context.close()
    })
  })

  test.describe('Mobile FCP on WiFi', () => {
    test('Homepage FCP should be under 1.2s on mobile WiFi', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const paintMetrics = await measurePaintMetrics(page)

      console.log('Mobile WiFi Homepage FCP:', {
        fcp: `${paintMetrics.fcp}ms`,
        budget: `${FCP_BUDGETS.MOBILE_WIFI}ms`
      })

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.MOBILE_WIFI)

      await context.close()
    })

    test('Product page FCP should be under 1.2s on mobile WiFi', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle'
      })

      const paintMetrics = await measurePaintMetrics(page)

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.MOBILE_WIFI)

      await context.close()
    })
  })

  test.describe('Desktop FCP Performance', () => {
    test('Homepage FCP should be under 0.8s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const paintMetrics = await measurePaintMetrics(page)

      console.log('Desktop Homepage FCP:', {
        fcp: `${paintMetrics.fcp}ms`,
        budget: `${FCP_BUDGETS.DESKTOP}ms`
      })

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.DESKTOP)
    })

    test('Product page FCP should be under 0.8s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle'
      })

      const paintMetrics = await measurePaintMetrics(page)

      expect(paintMetrics.fcp).toBeLessThan(FCP_BUDGETS.DESKTOP)
    })
  })

  test.describe('FCP Optimization Analysis', () => {
    test('Should minimize render-blocking resources for faster FCP', async ({ page }) => {
      const renderBlockingAnalysis = await page.evaluate(() => {
        // Track render-blocking resources during navigation
        const resources = performance.getEntriesByType('resource')
        const renderBlockingResources = []

        // Check stylesheets
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        for (const stylesheet of stylesheets) {
          const href = stylesheet.getAttribute('href')
          const resourceEntry = resources.find((r: any) => r.name.includes(href))

          if (resourceEntry) {
            renderBlockingResources.push({
              url: resourceEntry.name,
              type: 'stylesheet',
              loadTime: resourceEntry.responseEnd - resourceEntry.startTime,
              size: resourceEntry.transferSize || 0
            })
          }
        }

        // Check blocking scripts
        const blockingScripts = Array.from(document.querySelectorAll('script:not([async]):not([defer])'))
        for (const script of blockingScripts) {
          const src = script.getAttribute('src')
          if (src) {
            const resourceEntry = resources.find((r: any) => r.name.includes(src))

            if (resourceEntry) {
              renderBlockingResources.push({
                url: resourceEntry.name,
                type: 'script',
                loadTime: resourceEntry.responseEnd - resourceEntry.startTime,
                size: resourceEntry.transferSize || 0
              })
            }
          }
        }

        return {
          totalRenderBlocking: renderBlockingResources.length,
          stylesheets: renderBlockingResources.filter(r => r.type === 'stylesheet').length,
          scripts: renderBlockingResources.filter(r => r.type === 'script').length,
          totalSize: renderBlockingResources.reduce((sum, r) => sum + r.size, 0),
          maxLoadTime: Math.max(...renderBlockingResources.map(r => r.loadTime), 0)
        }
      })

      await page.goto('http://127.0.0.1:9292/')

      const blockingResources = await analyzeRenderBlocking(page)

      console.log('Render-blocking Resources Analysis:', {
        ...renderBlockingAnalysis,
        ...blockingResources
      })

      // Should have minimal render-blocking resources
      expect(renderBlockingAnalysis.totalRenderBlocking).toBeLessThan(5)
      expect(renderBlockingAnalysis.stylesheets).toBeLessThan(3)
      expect(renderBlockingAnalysis.scripts).toBeLessThan(2)
    })

    test('Should prioritize above-the-fold content for FCP', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const contentAnalysis = await page.evaluate(() => {
        const viewportHeight = window.innerHeight
        const allElements = Array.from(document.querySelectorAll('*'))

        const aboveTheFoldElements = allElements.filter(el => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.top < viewportHeight && rect.height > 0
        })

        const styledElements = aboveTheFoldElements.filter(el => {
          const computedStyle = window.getComputedStyle(el)
          return computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
        })

        return {
          totalElements: allElements.length,
          aboveTheFoldElements: aboveTheFoldElements.length,
          styledAboveTheFold: styledElements.length,
          coverageRatio: styledElements.length / aboveTheFoldElements.length
        }
      })

      console.log('Above-the-fold Content Analysis:', contentAnalysis)

      // Above-the-fold content should be well covered
      expect(contentAnalysis.coverageRatio).toBeGreaterThan(0.8)
      expect(contentAnalysis.aboveTheFoldElements).toBeGreaterThan(5)
    })

    test('Should use critical CSS for faster FCP', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const cssAnalysis = await page.evaluate(() => {
        const inlineStyles = Array.from(document.querySelectorAll('style'))
        const externalStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))

        const totalInlineCSS = inlineStyles.reduce((sum, style) =>
          sum + (style.textContent?.length || 0), 0)

        return {
          inlineStyles: inlineStyles.length,
          externalStylesheets: externalStylesheets.length,
          totalInlineCSSSize: totalInlineCSS,
          hasCriticalCSS: inlineStyles.some(style =>
            style.textContent?.includes('.header') ||
            style.textContent?.includes('.hero') ||
            style.textContent?.includes('above-fold')
          )
        }
      })

      console.log('Critical CSS Analysis:', cssAnalysis)

      // Should have inline critical CSS
      expect(cssAnalysis.inlineStyles).toBeGreaterThan(0)
      expect(cssAnalysis.totalInlineCSSSize).toBeGreaterThan(0)
      expect(cssAnalysis.totalInlineCSSSize).toBeLessThan(14 * 1024) // Under 14KB
    })

    test('Should preload critical resources for FCP', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const preloadAnalysis = await page.evaluate(() => {
        const preloadLinks = Array.from(document.querySelectorAll('link[rel="preload"]'))

        return {
          totalPreloads: preloadLinks.length,
          preloadTypes: preloadLinks.reduce((types: any, link) => {
            const as = link.getAttribute('as') || 'unknown'
            types[as] = (types[as] || 0) + 1
            return types
          }, {}),
          preloadedResources: preloadLinks.map(link => ({
            href: link.getAttribute('href'),
            as: link.getAttribute('as'),
            crossorigin: link.hasAttribute('crossorigin')
          }))
        }
      })

      console.log('Resource Preload Analysis:', preloadAnalysis)

      // Should preload critical resources
      expect(preloadAnalysis.totalPreloads).toBeGreaterThan(0)
      expect(preloadAnalysis.preloadTypes.font || 0).toBeGreaterThan(0) // Should preload fonts
    })
  })

  test.describe('FCP Content Quality', () => {
    test('Should render meaningful content at FCP', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Wait for FCP
      await page.waitForFunction(() => {
        const paintEntries = performance.getEntriesByType('paint')
        return paintEntries.some(entry => entry.name === 'first-contentful-paint')
      }, { timeout: 5000 }).catch(() => {})

      const contentAnalysis = await page.evaluate(() => {
        const meaningfulElements = [
          'h1', 'h2', 'h3',
          '.hero', '.banner',
          '.product-card', '.product-title',
          '.logo', '.navigation'
        ]

        const foundElements = meaningfulElements.map(selector => ({
          selector,
          found: document.querySelector(selector) !== null,
          visible: (() => {
            const el = document.querySelector(selector)
            if (!el) return false
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight
          })()
        }))

        return {
          meaningfulElements: foundElements,
          visibleMeaningfulCount: foundElements.filter(e => e.visible).length,
          totalMeaningfulCount: foundElements.filter(e => e.found).length
        }
      })

      console.log('FCP Content Quality Analysis:', contentAnalysis)

      // Should have meaningful content visible at FCP
      expect(contentAnalysis.visibleMeaningfulCount).toBeGreaterThan(2)
    })

    test('Should avoid invisible or placeholder content at FCP', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const placeholderAnalysis = await page.evaluate(() => {
        const potentialPlaceholders = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent?.trim() || ''
            const classList = Array.from(el.classList)

            return text.includes('loading') ||
                   text.includes('placeholder') ||
                   classList.some(cls => cls.includes('skeleton') || cls.includes('placeholder'))
          })

        return {
          placeholderElements: potentialPlaceholders.length,
          placeholderTypes: potentialPlaceholders.map(el => ({
            tagName: el.tagName,
            className: el.className,
            text: el.textContent?.slice(0, 50)
          }))
        }
      })

      console.log('Placeholder Content Analysis:', placeholderAnalysis)

      // Should have minimal placeholder content visible at FCP
      expect(placeholderAnalysis.placeholderElements).toBeLessThan(3)
    })
  })

  test.describe('FCP Regression Prevention', () => {
    test('Should maintain consistent FCP across page types', async ({ page }) => {
      const pageTypes = [
        { name: 'Homepage', url: 'http://127.0.0.1:9292/' },
        { name: 'Product', url: 'http://127.0.0.1:9292/products/sample-product' },
        { name: 'Collection', url: 'http://127.0.0.1:9292/collections/all' },
        { name: 'Cart', url: 'http://127.0.0.1:9292/cart' }
      ]

      const fcpResults = []

      for (const pageType of pageTypes) {
        await page.goto(pageType.url, { waitUntil: 'networkidle' })
        const paintMetrics = await measurePaintMetrics(page)

        fcpResults.push({
          pageType: pageType.name,
          fcp: paintMetrics.fcp,
          withinBudget: paintMetrics.fcp < FCP_BUDGETS.DESKTOP
        })
      }

      console.log('FCP Consistency Across Page Types:', fcpResults)

      // All page types should meet FCP budget
      fcpResults.forEach(result => {
        expect(result.fcp, `${result.pageType} FCP exceeded budget`).toBeLessThan(FCP_BUDGETS.DESKTOP)
      })

      // FCP should be relatively consistent (variance < 400ms)
      const fcpValues = fcpResults.map(r => r.fcp)
      const average = fcpValues.reduce((sum, fcp) => sum + fcp, 0) / fcpValues.length
      const variance = Math.sqrt(fcpValues.reduce((sum, fcp) => sum + Math.pow(fcp - average, 2), 0) / fcpValues.length)

      expect(variance).toBeLessThan(400)
    })

    test('Should maintain FCP budget under different network conditions', async ({ browser }) => {
      const results = []

      // Test on different network conditions
      const scenarios = [
        { name: 'Desktop Fast', device: null, throttle: false },
        { name: 'Mobile WiFi', device: devices['iPhone 12'], throttle: false },
        { name: 'Mobile 3G', device: devices['iPhone 12'], throttle: '3G' }
      ]

      for (const scenario of scenarios) {
        const context = await browser.newContext(scenario.device || {})
        const page = await context.newPage()

        if (scenario.throttle) {
          await setupNetworkThrottling(page, scenario.throttle as keyof typeof NETWORK_CONDITIONS)
        }

        await page.goto('http://127.0.0.1:9292/', {
          waitUntil: 'networkidle',
          timeout: 15000
        })

        const paintMetrics = await measurePaintMetrics(page)

        results.push({
          scenario: scenario.name,
          fcp: paintMetrics.fcp,
          budget: scenario.name.includes('3G') ? FCP_BUDGETS.MOBILE_3G :
                 scenario.name.includes('Mobile') ? FCP_BUDGETS.MOBILE_WIFI :
                 FCP_BUDGETS.DESKTOP
        })

        await context.close()
      }

      console.log('FCP Under Different Network Conditions:', results)

      // All scenarios should meet their respective budgets
      results.forEach(result => {
        expect(result.fcp, `${result.scenario} FCP exceeded budget`).toBeLessThan(result.budget)
      })
    })
  })
})