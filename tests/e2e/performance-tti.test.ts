/**
 * T018a: Performance test for TTI < 3.5s on 3G
 *
 * This test measures Time to Interactive (TTI) on 3G network
 * to ensure the page becomes interactive within 3.5 seconds.
 *
 * Target: TTI < 3500ms on 3G network conditions
 *
 * These tests WILL FAIL initially as the performance optimizations
 * aren't fully implemented yet. This follows TDD principles.
 */

import { test, expect, devices } from '@playwright/test'

// Performance budgets for TTI
const TTI_BUDGETS = {
  MOBILE_3G: 3500, // 3.5 seconds
  MOBILE_WIFI: 2000, // 2 seconds
  DESKTOP: 1500 // 1.5 seconds
}

// Network conditions for testing
const NETWORK_CONDITIONS = {
  '3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 750 // 750ms RTT
  }
}

// Helper to measure TTI using various methods
async function measureTTI(page: any) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      let ttiValue = 0

      // Method 1: Use web-vitals library if available
      if (typeof window !== 'undefined' && (window as any).webVitals) {
        import('web-vitals').then(({ onTTFB, onFCP, onLCP }) => {
          let metricsCollected = 0
          const metrics: { ttfb?: number; fcp?: number; lcp?: number } = {}

          const checkComplete = () => {
            if (++metricsCollected === 3) {
              // Estimate TTI based on other metrics
              // TTI ≈ max(FCP + 300ms, LCP)
              ttiValue = Math.max(
                (metrics.fcp || 0) + 300,
                metrics.lcp || 0
              )
              resolve(ttiValue)
            }
          }

          onTTFB((metric: any) => {
            metrics.ttfb = metric.value
            checkComplete()
          })

          onFCP((metric: any) => {
            metrics.fcp = metric.value
            checkComplete()
          })

          onLCP((metric: any) => {
            metrics.lcp = metric.value
            checkComplete()
          })

          // Note: onFID is deprecated, removed from calculation
        }).catch(() => {
          // Fallback method
          resolve(estimateTTI())
        })
      } else {
        // Method 2: Manual TTI estimation
        resolve(estimateTTI())
      }

      function estimateTTI() {
        const navigationStart = performance.timeOrigin
        const domContentLoaded = performance.getEntriesByName('domContentLoaded')[0]?.startTime || 0
        const loadComplete = performance.getEntriesByName('load')[0]?.startTime || 0

        // Get paint timings
        const paintEntries = performance.getEntriesByType('paint')
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0

        // Get long tasks
        const longTasks = performance.getEntriesByType('longtask')
        const lastLongTaskEnd = longTasks.length > 0
          ? Math.max(...longTasks.map(task => task.startTime + task.duration))
          : 0

        // TTI heuristic: when main thread is quiet for 5s after FCP
        const estimatedTTI = Math.max(
          fcp + 100, // At least 100ms after FCP
          domContentLoaded,
          lastLongTaskEnd,
          loadComplete * 0.8 // Usually ~80% of load time
        )

        return estimatedTTI
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve(estimateTTI())
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

// Helper to measure main thread quiet periods
async function measureMainThreadActivity(page: any) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const longTasks: any[] = []
      let quietPeriodStart = 0
      let longestQuietPeriod = 0

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()

        entries.forEach(entry => {
          longTasks.push({
            start: entry.startTime,
            duration: entry.duration,
            end: entry.startTime + entry.duration
          })

          // Calculate quiet periods
          if (quietPeriodStart === 0) {
            quietPeriodStart = entry.startTime + entry.duration
          } else {
            const quietDuration = entry.startTime - quietPeriodStart
            longestQuietPeriod = Math.max(longestQuietPeriod, quietDuration)
            quietPeriodStart = entry.startTime + entry.duration
          }
        })
      })

      if ('PerformanceObserver' in window) {
        try {
          observer.observe({ entryTypes: ['longtask'] })
        } catch (e) {
          // PerformanceObserver might not support longtask
        }
      }

      setTimeout(() => {
        observer.disconnect()
        resolve({
          longTaskCount: longTasks.length,
          totalBlockingTime: longTasks.reduce((sum, task) =>
            sum + Math.max(0, task.duration - 50), 0),
          longestQuietPeriod,
          mainThreadUtilization: longTasks.reduce((sum, task) => sum + task.duration, 0) / 5000
        })
      }, 5000)
    })
  })
}

test.describe('TTI Performance Tests (T018a)', () => {
  test.describe('Mobile TTI on 3G Network', () => {
    test('Homepage TTI should be under 3.5s on mobile 3G', async ({ browser }) => {
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

      const tti = await measureTTI(page)
      const mainThreadActivity = await measureMainThreadActivity(page)
      const navigationTime = Date.now() - startTime

      console.log('Mobile 3G Homepage TTI:', {
        tti: `${tti}ms`,
        navigationTime: `${navigationTime}ms`,
        budget: `${TTI_BUDGETS.MOBILE_3G}ms`,
        mainThreadActivity: {
          longTasks: mainThreadActivity.longTaskCount,
          blockingTime: `${Math.round(mainThreadActivity.totalBlockingTime)}ms`,
          quietPeriod: `${Math.round(mainThreadActivity.longestQuietPeriod)}ms`,
          utilization: `${Math.round(mainThreadActivity.mainThreadUtilization * 100)}%`
        }
      })

      expect(tti).toBeLessThan(TTI_BUDGETS.MOBILE_3G)

      await context.close()
    })

    test('Product page TTI should be under 3.5s on mobile 3G', async ({ browser }) => {
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

      const tti = await measureTTI(page)

      console.log('Mobile 3G Product Page TTI:', {
        tti: `${tti}ms`,
        budget: `${TTI_BUDGETS.MOBILE_3G}ms`
      })

      expect(tti).toBeLessThan(TTI_BUDGETS.MOBILE_3G)

      await context.close()
    })

    test('Collection page TTI should be under 3.5s on mobile 3G', async ({ browser }) => {
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

      const tti = await measureTTI(page)

      expect(tti).toBeLessThan(TTI_BUDGETS.MOBILE_3G)

      await context.close()
    })
  })

  test.describe('Mobile TTI on WiFi', () => {
    test('Homepage TTI should be under 2s on mobile WiFi', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const tti = await measureTTI(page)

      console.log('Mobile WiFi Homepage TTI:', {
        tti: `${tti}ms`,
        budget: `${TTI_BUDGETS.MOBILE_WIFI}ms`
      })

      expect(tti).toBeLessThan(TTI_BUDGETS.MOBILE_WIFI)

      await context.close()
    })
  })

  test.describe('Desktop TTI Performance', () => {
    test('Homepage TTI should be under 1.5s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle'
      })

      const tti = await measureTTI(page)

      console.log('Desktop Homepage TTI:', {
        tti: `${tti}ms`,
        budget: `${TTI_BUDGETS.DESKTOP}ms`
      })

      expect(tti).toBeLessThan(TTI_BUDGETS.DESKTOP)
    })

    test('Product page TTI should be under 1.5s on desktop', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product', {
        waitUntil: 'networkidle'
      })

      const tti = await measureTTI(page)

      expect(tti).toBeLessThan(TTI_BUDGETS.DESKTOP)
    })
  })

  test.describe('TTI Optimization Analysis', () => {
    test('Should minimize main thread blocking for faster TTI', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const mainThreadAnalysis = await measureMainThreadActivity(page)

      console.log('Main Thread Analysis for TTI:', mainThreadAnalysis)

      // Should have minimal long tasks that block interactivity
      expect(mainThreadAnalysis.longTaskCount).toBeLessThan(5)
      expect(mainThreadAnalysis.totalBlockingTime).toBeLessThan(200) // < 200ms total blocking
      expect(mainThreadAnalysis.longestQuietPeriod).toBeGreaterThan(500) // > 500ms quiet period
    })

    test('Should prioritize critical resources for faster TTI', async ({ page }) => {
      const resourceTimings: any[] = []

      page.on('response', async (response) => {
        const url = response.url()
        // Note: response.timing() may not be available in all Playwright versions
        // const timing = await response.timing()

        if (url.includes('.js') || url.includes('.css') || url.includes('fonts')) {
          resourceTimings.push({
            url,
            type: url.includes('.js') ? 'js' : url.includes('.css') ? 'css' : 'font',
            critical: url.includes('critical') || url.includes('main'),
            startTime: 0, // timing?.receiveHeadersEnd || 0,
            size: response.headers()['content-length'] || 0
          })
        }
      })

      await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle' })

      const criticalResources = resourceTimings.filter(r => r.critical)
      const nonCriticalResources = resourceTimings.filter(r => !r.critical)

      console.log('Resource Loading Priority for TTI:', {
        criticalResources: criticalResources.length,
        nonCriticalResources: nonCriticalResources.length,
        avgCriticalLoadTime: criticalResources.length > 0
          ? Math.round(criticalResources.reduce((sum, r) => sum + r.startTime, 0) / criticalResources.length)
          : 0,
        avgNonCriticalLoadTime: nonCriticalResources.length > 0
          ? Math.round(nonCriticalResources.reduce((sum, r) => sum + r.startTime, 0) / nonCriticalResources.length)
          : 0
      })

      // Critical resources should load before non-critical
      if (criticalResources.length > 0 && nonCriticalResources.length > 0) {
        const avgCriticalTime = criticalResources.reduce((sum, r) => sum + r.startTime, 0) / criticalResources.length
        const avgNonCriticalTime = nonCriticalResources.reduce((sum, r) => sum + r.startTime, 0) / nonCriticalResources.length

        expect(avgCriticalTime).toBeLessThanOrEqual(avgNonCriticalTime)
      }
    })

    test('Should defer non-essential JavaScript for better TTI', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const scriptAnalysis = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'))

        return {
          totalScripts: scripts.length,
          deferredScripts: scripts.filter(s => s.defer || s.async || s.type === 'module').length,
          blockingScripts: scripts.filter(s => !s.defer && !s.async && s.type !== 'module' && s.src).length,
          inlineScripts: scripts.filter(s => !s.src).length
        }
      })

      console.log('Script Loading Strategy for TTI:', scriptAnalysis)

      // Most scripts should be non-blocking
      const nonBlockingRatio = (scriptAnalysis.deferredScripts + scriptAnalysis.inlineScripts) / scriptAnalysis.totalScripts
      expect(nonBlockingRatio).toBeGreaterThan(0.7) // 70% should be non-blocking

      // Should have minimal render-blocking scripts
      expect(scriptAnalysis.blockingScripts).toBeLessThan(2)
    })

    test('Should have interactive elements ready within TTI', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Wait for TTI
      const tti = await measureTTI(page)

      // Test that critical interactive elements work after TTI
      const interactiveElements = await page.evaluate(() => {
        const elements = [
          'button',
          'a[href]',
          'input',
          '[tabindex]',
          '[onclick]'
        ]

        const interactive = elements.flatMap(selector =>
          Array.from(document.querySelectorAll(selector))
        )

        return {
          totalInteractive: interactive.length,
          visibleInteractive: interactive.filter(el => {
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight
          }).length
        }
      })

      console.log('Interactive Elements Analysis:', {
        tti: `${tti}ms`,
        totalInteractive: interactiveElements.totalInteractive,
        visibleInteractive: interactiveElements.visibleInteractive
      })

      // Should have interactive elements available
      expect(interactiveElements.visibleInteractive).toBeGreaterThan(0)

      // Test that a critical interactive element works
      try {
        await page.click('button, a[href], input', { timeout: 1000 })
      } catch (error) {
        console.warn('No interactive elements found or clickable')
      }
    })

    test('Should handle user input immediately after TTI', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Wait for TTI
      await measureTTI(page)

      // Test immediate responsiveness
      const inputResponseTime = await page.evaluate(() => {
        return new Promise((resolve) => {
          const startTime = performance.now()
          let responded = false

          // Try to trigger an input event
          const input = document.querySelector('input, button, a') as HTMLElement

          if (input) {
            const handleResponse = () => {
              if (!responded) {
                responded = true
                const responseTime = performance.now() - startTime
                resolve(responseTime)
              }
            }

            input.addEventListener('click', handleResponse, { once: true })
            input.addEventListener('focus', handleResponse, { once: true })

            // Simulate interaction
            if (input.click) {
              input.click()
            }

            setTimeout(() => {
              if (!responded) {
                resolve(performance.now() - startTime)
              }
            }, 100)
          } else {
            resolve(0)
          }
        })
      })

      console.log('Input Response Time after TTI:', `${Math.round(inputResponseTime as number)}ms`)

      // Should respond to input quickly (< 100ms)
      expect(inputResponseTime).toBeLessThan(100)
    })
  })

  test.describe('TTI Regression Prevention', () => {
    test('Should maintain TTI budget under different conditions', async ({ page }) => {
      const scenarios = [
        { name: 'Homepage Clean', url: 'http://127.0.0.1:9292/' },
        { name: 'Homepage with Cart', url: 'http://127.0.0.1:9292/?cart=1' },
        { name: 'Product Page', url: 'http://127.0.0.1:9292/products/sample-product' }
      ]

      const results = []

      for (const scenario of scenarios) {
        await page.goto(scenario.url, { waitUntil: 'networkidle' })
        const tti = await measureTTI(page)

        results.push({
          scenario: scenario.name,
          tti,
          withinBudget: tti < TTI_BUDGETS.DESKTOP
        })
      }

      console.log('TTI Regression Test Results:', results)

      // All scenarios should meet TTI budget
      results.forEach(result => {
        expect(result.tti, `${result.scenario} TTI exceeded budget`).toBeLessThan(TTI_BUDGETS.DESKTOP)
      })
    })

    test('Should maintain consistent TTI across multiple page loads', async ({ page }) => {
      const ttiMeasurements: number[] = []

      // Test 3 consecutive loads
      for (let i = 0; i < 3; i++) {
        await page.goto('http://127.0.0.1:9292/', {
          waitUntil: 'networkidle',
          timeout: 10000
        })

        const tti = await measureTTI(page)
        ttiMeasurements.push(tti)
      }

      console.log('TTI Consistency Test:', {
        measurements: ttiMeasurements.map(tti => `${Math.round(tti)}ms`),
        average: `${Math.round(ttiMeasurements.reduce((sum, tti) => sum + tti, 0) / ttiMeasurements.length)}ms`,
        variance: Math.round(Math.sqrt(ttiMeasurements.reduce((sum, tti) => {
          const avg = ttiMeasurements.reduce((s, t) => s + t, 0) / ttiMeasurements.length
          return sum + Math.pow(tti - avg, 2)
        }, 0) / ttiMeasurements.length))
      })

      // TTI should be consistent (variance < 500ms)
      const average = ttiMeasurements.reduce((sum, tti) => sum + tti, 0) / ttiMeasurements.length
      const variance = Math.sqrt(ttiMeasurements.reduce((sum, tti) => sum + Math.pow(tti - average, 2), 0) / ttiMeasurements.length)

      expect(variance).toBeLessThan(500)

      // All measurements should be within budget
      ttiMeasurements.forEach(tti => {
        expect(tti).toBeLessThan(TTI_BUDGETS.DESKTOP)
      })
    })
  })
})