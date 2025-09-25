/**
 * T015: Performance test for LCP < 2.5s mobile
 *
 * This test measures Largest Contentful Paint (LCP) on mobile devices
 * with 3G network throttling to ensure sub-2.5s load times.
 *
 * Target: LCP < 2500ms on mobile with 3G network conditions
 *
 * These tests WILL FAIL initially as the performance optimizations
 * and theme aren't fully implemented yet. This follows TDD principles.
 */

import { test, expect, devices } from '@playwright/test'
import { onCLS, onFCP, onLCP, onTTFB, type CLSMetric, type FCPMetric, type LCPMetric, type TTFBMetric } from 'web-vitals'

// Performance budget thresholds
const PERFORMANCE_BUDGETS = {
  LCP_MOBILE_3G: 2500, // 2.5 seconds
  LCP_MOBILE_WIFI: 1800, // 1.8 seconds
  LCP_DESKTOP: 1500 // 1.5 seconds
}

// Network throttling presets
const NETWORK_CONDITIONS = {
  '3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 750 // 750ms RTT
  },
  'Fast3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 150 // 150ms RTT
  }
}

// Helper function to measure Web Vitals
async function measureWebVitals(page: any) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics = {
        lcp: 0,
        fcp: 0,
        cls: 0,
        fid: 0,
        ttfb: 0
      }

      let collected = 0
      const totalMetrics = 5

      function checkComplete() {
        if (++collected === totalMetrics) {
          resolve(metrics)
        }
      }

      // Web Vitals measurement
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB }) => {
        onLCP((metric: LCPMetric) => {
          metrics.lcp = metric.value
          checkComplete()
        })

        onFCP((metric: FCPMetric) => {
          metrics.fcp = metric.value
          checkComplete()
        })

        onCLS((metric: CLSMetric) => {
          metrics.cls = metric.value
          checkComplete()
        })

        // Note: onFID is deprecated, using onINP instead would be better
        // For now, removing FID measurement
        // onFID((metric: FIDMetric) => {
        //   metrics.fid = metric.value
        //   checkComplete()
        // })

        onTTFB((metric: TTFBMetric) => {
          metrics.ttfb = metric.value
          checkComplete()
        })
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve(metrics)
      }, 10000)
    })
  })
}

// Helper to set up network throttling
async function setupNetworkThrottling(page: any, condition: keyof typeof NETWORK_CONDITIONS) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    ...NETWORK_CONDITIONS[condition]
  })
  return cdp
}

test.describe('LCP Performance Tests (T015)', () => {
  test.describe('Mobile LCP on 3G Network', () => {
    test('Homepage LCP should be under 2.5s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      // Set up 3G network throttling
      await setupNetworkThrottling(page, '3G')

      // Navigate to homepage and measure performance
      const startTime = Date.now()

      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle',
        timeout: 15000 // Allow extra time for slow network
      })

      const metrics = await measureWebVitals(page)
      const navigationTime = Date.now() - startTime

      // Assert LCP is under budget
      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_3G)

      // Log metrics for debugging
      console.log('Mobile 3G Homepage Metrics:', {
        lcp: `${metrics.lcp}ms`,
        navigationTime: `${navigationTime}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_MOBILE_3G}ms`
      })

      await context.close()
    })

    test('Product page LCP should be under 2.5s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      // Set up 3G network throttling
      await setupNetworkThrottling(page, '3G')

      // Navigate to a product page
      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle',
        timeout: 15000
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_3G)

      console.log('Mobile 3G Product Page Metrics:', {
        lcp: `${metrics.lcp}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_MOBILE_3G}ms`
      })

      await context.close()
    })

    test('Collection page LCP should be under 2.5s on mobile 3G', async ({ browser }) => {
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

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_3G)

      console.log('Mobile 3G Collection Page Metrics:', {
        lcp: `${metrics.lcp}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_MOBILE_3G}ms`
      })

      await context.close()
    })

    test('Cart page LCP should be under 2.5s on mobile 3G', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await setupNetworkThrottling(page, '3G')

      await page.goto('http://127.0.0.1:9292/cart', {
        waitUntil: 'networkidle',
        timeout: 15000
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_3G)

      console.log('Mobile 3G Cart Page Metrics:', {
        lcp: `${metrics.lcp}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_MOBILE_3G}ms`
      })

      await context.close()
    })
  })

  test.describe('Mobile LCP on Fast WiFi', () => {
    test('Homepage LCP should be under 1.8s on mobile WiFi', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      // No network throttling for WiFi conditions
      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_WIFI)

      console.log('Mobile WiFi Homepage Metrics:', {
        lcp: `${metrics.lcp}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_MOBILE_WIFI}ms`
      })

      await context.close()
    })

    test('Product page LCP should be under 1.8s on mobile WiFi', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle'
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_MOBILE_WIFI)

      await context.close()
    })
  })

  test.describe('Desktop LCP Performance', () => {
    test('Homepage LCP should be under 1.5s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_DESKTOP)

      console.log('Desktop Homepage Metrics:', {
        lcp: `${metrics.lcp}ms`,
        budget: `${PERFORMANCE_BUDGETS.LCP_DESKTOP}ms`
      })
    })

    test('Product page LCP should be under 1.5s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle'
      })

      const metrics = await measureWebVitals(page)

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.LCP_DESKTOP)
    })
  })

  test.describe('LCP Content Analysis', () => {
    test('Should identify LCP elements correctly on homepage', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const lcpElement = await page.evaluate(() => {
        return new Promise((resolve) => {
          import('web-vitals').then(({ onLCP }) => {
            onLCP((metric: LCPMetric) => {
              const element = metric.entries[metric.entries.length - 1]?.element
              resolve({
                tagName: element?.tagName,
                className: element?.className,
                id: element?.id,
                src: (element as HTMLImageElement)?.src || (element as HTMLImageElement)?.currentSrc
              })
            })
          })
        })
      })

      expect(lcpElement).toBeDefined()
      console.log('LCP Element on Homepage:', lcpElement)
    })

    test('Should identify LCP elements correctly on product page', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product')

      const lcpElement = await page.evaluate(() => {
        return new Promise((resolve) => {
          import('web-vitals').then(({ onLCP }) => {
            onLCP((metric: LCPMetric) => {
              const element = metric.entries[metric.entries.length - 1]?.element
              resolve({
                tagName: element?.tagName,
                className: element?.className,
                id: element?.id,
                src: (element as HTMLImageElement)?.src || (element as HTMLImageElement)?.currentSrc
              })
            })
          })
        })
      })

      expect(lcpElement).toBeDefined()
      console.log('LCP Element on Product Page:', lcpElement)

      // Product pages typically have images as LCP elements
      expect((lcpElement as any).tagName).toBe('IMG')
    })
  })

  test.describe('Critical Path Analysis', () => {
    test('Should load critical CSS before LCP', async ({ page }) => {
      // Start monitoring network activity
      const responses: any[] = []
      page.on('response', response => {
        if (response.url().includes('.css')) {
          responses.push({
            url: response.url(),
            status: response.status(),
            timing: Date.now()
          })
        }
      })

      const startTime = Date.now()
      await page.goto('http://127.0.0.1:9292/')

      const metrics = await measureWebVitals(page)
      const lcpTime = startTime + metrics.lcp

      // Critical CSS should load before LCP
      const criticalCSSResponse = responses.find(r => r.url.includes('critical'))
      if (criticalCSSResponse) {
        expect(criticalCSSResponse.timing).toBeLessThan(lcpTime)
      }

      console.log('CSS Loading Timeline:', responses)
    })

    test('Should minimize render-blocking resources', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Check for render-blocking resources
      const renderBlockingResources = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        const scripts = Array.from(document.querySelectorAll('script:not([async]):not([defer])'))

        return {
          blockingCSS: links.map(link => link.getAttribute('href')),
          blockingJS: scripts.map(script => script.getAttribute('src')).filter(Boolean)
        }
      })

      // Should have minimal render-blocking resources
      expect(renderBlockingResources.blockingCSS.length).toBeLessThan(3)
      expect(renderBlockingResources.blockingJS.length).toBeLessThan(2)

      console.log('Render-blocking resources:', renderBlockingResources)
    })
  })

  test.describe('Image Optimization for LCP', () => {
    test('Should use optimized images for LCP elements', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product')

      const imageOptimization = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
        const heroImage = images[0] // Likely LCP element

        return {
          hasWebP: heroImage?.src.includes('.webp'),
          hasAvif: heroImage?.src.includes('.avif'),
          hasLazyLoading: heroImage?.loading === 'lazy',
          hasSrcSet: Boolean(heroImage?.srcset),
          dimensions: {
            width: heroImage?.width,
            height: heroImage?.height,
            naturalWidth: heroImage?.naturalWidth,
            naturalHeight: heroImage?.naturalHeight
          }
        }
      })

      // Hero images should not be lazy loaded (they're likely LCP)
      expect(imageOptimization.hasLazyLoading).toBe(false)

      // Should have responsive images
      expect(imageOptimization.hasSrcSet).toBe(true)

      console.log('Image optimization details:', imageOptimization)
    })

    test('Should preload LCP images', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const preloadedImages = await page.evaluate(() => {
        const preloadLinks = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]'))
        return preloadLinks.map(link => link.getAttribute('href'))
      })

      // Should have at least one preloaded image for LCP
      expect(preloadedImages.length).toBeGreaterThan(0)

      console.log('Preloaded images:', preloadedImages)
    })
  })
})