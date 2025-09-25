/**
 * T018c: Performance test for CLS < 0.1
 *
 * This test measures Cumulative Layout Shift (CLS) to ensure
 * visual stability during page loading and interactions.
 *
 * Target: CLS < 0.1 (Web Vitals "good" threshold)
 *
 * These tests WILL FAIL initially as the layout stability optimizations
 * aren't fully implemented yet. This follows TDD principles.
 */

import { test, expect, devices } from '@playwright/test'

// Performance budgets for CLS
const CLS_BUDGETS = {
  GOOD: 0.1, // Web Vitals "good" threshold
  NEEDS_IMPROVEMENT: 0.25, // Web Vitals "needs improvement" threshold
  EXCELLENT: 0.05, // Target for excellent UX
  POOR: 0.25 // Web Vitals "poor" threshold
}

// Helper to measure CLS and related layout metrics
async function measureCLS(page: any, duration: number = 5000) {
  return await page.evaluate((measurementDuration: number) => {
    return new Promise((resolve) => {
      let cls = 0
      let clsEntries: any[] = []
      let sessionValue = 0
      let sessionEntries: any[] = []

      // Try to use web-vitals library if available
      if ((window as any).webVitals) {
        import('web-vitals').then((webVitals: any) => {
          webVitals.onCLS((metric: any) => {
            cls = metric.value
            clsEntries = metric.entries
            resolve({
              cls,
              clsEntries: clsEntries.map(entry => ({
                value: entry.value,
                startTime: entry.startTime,
                hadRecentInput: entry.hadRecentInput,
                sources: entry.sources?.map((source: any) => ({
                  element: source.node?.tagName || 'unknown',
                  className: source.node?.className || ''
                }))
              })),
              sessionValue,
              sessionEntries: sessionEntries.length
            })
          })
        }).catch(() => {
          resolve(getManualCLS())
        })
      } else {
        resolve(getManualCLS())
      }

      function getManualCLS() {
        // Manual CLS calculation using PerformanceObserver
        let cumulativeScore = 0
        const entries: any[] = []

        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                  cumulativeScore += (entry as any).value
                  entries.push({
                    value: (entry as any).value,
                    startTime: entry.startTime,
                    hadRecentInput: (entry as any).hadRecentInput
                  })
                }
              }
            })

            observer.observe({ entryTypes: ['layout-shift'] })

            setTimeout(() => {
              observer.disconnect()
              resolve({
                cls: cumulativeScore,
                clsEntries: entries,
                sessionValue: cumulativeScore,
                sessionEntries: entries.length
              })
            }, measurementDuration)
          } catch (error) {
            // Fallback if PerformanceObserver not supported
            resolve({
              cls: 0,
              clsEntries: [],
              sessionValue: 0,
              sessionEntries: 0
            })
          }
        } else {
          resolve({
            cls: 0,
            clsEntries: [],
            sessionValue: 0,
            sessionEntries: 0
          })
        }
      }
    })
  }, duration)
}

// Helper to simulate user interactions that might cause layout shifts
async function triggerPotentialLayoutShifts(page: any) {
  const interactions = [
    // Hover over elements that might change size
    () => page.hover('.product-card').catch(() => {}),
    () => page.hover('button').catch(() => {}),
    () => page.hover('.navigation a').catch(() => {}),

    // Click interactions that might trigger content changes
    () => page.click('button[data-action]').catch(() => {}),
    () => page.click('.accordion-trigger').catch(() => {}),
    () => page.click('.tab-button').catch(() => {}),

    // Scroll to trigger lazy loading
    () => page.evaluate(() => window.scrollTo(0, window.innerHeight)),
    () => page.evaluate(() => window.scrollTo(0, window.innerHeight * 2)),

    // Resize events
    () => page.setViewportSize({ width: 375, height: 667 }),
    () => page.setViewportSize({ width: 1200, height: 800 })
  ]

  // Execute interactions with delays
  for (const interaction of interactions) {
    await interaction()
    await page.waitForTimeout(500) // Wait for potential layout shifts
  }
}

test.describe('CLS Performance Tests (T018c)', () => {
  test.describe('Basic CLS Measurement', () => {
    test('Homepage CLS should be under 0.1', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Measure CLS for 5 seconds after page load
      const clsMetrics = await measureCLS(page, 5000)

      console.log('Homepage CLS Metrics:', {
        cls: clsMetrics.cls.toFixed(3),
        budget: CLS_BUDGETS.GOOD.toFixed(3),
        layoutShifts: clsMetrics.sessionEntries,
        shifts: clsMetrics.clsEntries.map((entry: any) => ({
          value: entry.value?.toFixed(3),
          time: `${Math.round(entry.startTime)}ms`,
          element: entry.sources?.[0]?.element || 'unknown'
        }))
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })

    test('Product page CLS should be under 0.1', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product')

      const clsMetrics = await measureCLS(page, 5000)

      console.log('Product Page CLS Metrics:', {
        cls: clsMetrics.cls.toFixed(3),
        budget: CLS_BUDGETS.GOOD.toFixed(3)
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })

    test('Collection page CLS should be under 0.1', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/collections/all')

      const clsMetrics = await measureCLS(page, 5000)

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })

    test('Cart page CLS should be under 0.1', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/cart')

      const clsMetrics = await measureCLS(page, 5000)

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })
  })

  test.describe('Mobile CLS Performance', () => {
    test('Homepage CLS should be under 0.1 on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/')

      const clsMetrics = await measureCLS(page, 5000)

      console.log('Mobile Homepage CLS:', {
        cls: clsMetrics.cls.toFixed(3),
        device: 'iPhone 12'
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)

      await context.close()
    })

    test('Product page CLS should be under 0.1 on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        offline: false
      })

      const page = await context.newPage()

      await page.goto('http://127.0.0.1:9292/products/sample-product')

      const clsMetrics = await measureCLS(page, 5000)

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)

      await context.close()
    })
  })

  test.describe('CLS During User Interactions', () => {
    test('Should maintain low CLS during common interactions', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Start CLS measurement
      const measurementPromise = measureCLS(page, 10000)

      // Wait for initial load
      await page.waitForTimeout(2000)

      // Trigger potential layout shifts
      await triggerPotentialLayoutShifts(page)

      const clsMetrics = await measurementPromise

      console.log('CLS During Interactions:', {
        cls: clsMetrics.cls.toFixed(3),
        totalShifts: clsMetrics.sessionEntries,
        budget: CLS_BUDGETS.GOOD.toFixed(3),
        majorShifts: clsMetrics.clsEntries.filter((entry: any) => entry.value > 0.01).length
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)

      // Should have minimal major layout shifts
      const majorShifts = clsMetrics.clsEntries.filter((entry: any) => entry.value > 0.01)
      expect(majorShifts.length).toBeLessThan(3)
    })

    test('Should handle image loading without layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/products/sample-product')

      // Start measuring CLS
      const measurementPromise = measureCLS(page, 8000)

      // Trigger image loading by scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2)
      })

      await page.waitForTimeout(2000)

      // Scroll more to load additional images
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      const clsMetrics = await measurementPromise

      console.log('CLS During Image Loading:', {
        cls: clsMetrics.cls.toFixed(3),
        imageShifts: clsMetrics.clsEntries.filter((entry: any) =>
          entry.sources?.some((source: any) => source.element === 'IMG')).length
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })

    test('Should handle dynamic content insertion without layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const measurementPromise = measureCLS(page, 8000)

      // Try to trigger dynamic content loading
      await page.click('[data-action="load-more"]').catch(() => {})
      await page.waitForTimeout(1000)

      await page.click('[data-action="add-to-cart"]').catch(() => {})
      await page.waitForTimeout(1000)

      await page.click('[data-action="open-modal"]').catch(() => {})
      await page.waitForTimeout(1000)

      const clsMetrics = await measurementPromise

      console.log('CLS During Dynamic Content:', {
        cls: clsMetrics.cls.toFixed(3),
        dynamicShifts: clsMetrics.sessionEntries
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)
    })
  })

  test.describe('CLS Root Causes Analysis', () => {
    test('Should have proper image dimensions to prevent layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const imageAnalysis = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))

        return images.map(img => ({
          src: img.src.split('/').pop(),
          hasWidth: img.hasAttribute('width') || img.style.width !== '',
          hasHeight: img.hasAttribute('height') || img.style.height !== '',
          hasDimensions: (img.hasAttribute('width') || img.style.width !== '') &&
                        (img.hasAttribute('height') || img.style.height !== ''),
          hasAspectRatio: img.style.aspectRatio !== '',
          naturalDimensions: {
            width: img.naturalWidth,
            height: img.naturalHeight
          },
          displayDimensions: {
            width: img.offsetWidth,
            height: img.offsetHeight
          }
        }))
      })

      console.log('Image Dimensions Analysis:', {
        totalImages: imageAnalysis.length,
        withDimensions: imageAnalysis.filter(img => img.hasDimensions).length,
        withAspectRatio: imageAnalysis.filter(img => img.hasAspectRatio).length,
        properlyDimensioned: imageAnalysis.filter(img => img.hasDimensions || img.hasAspectRatio).length
      })

      // Most images should have proper dimensions or aspect ratios
      const properlyDimensionedCount = imageAnalysis.filter(img => img.hasDimensions || img.hasAspectRatio).length
      const properlyDimensionedRatio = properlyDimensionedCount / imageAnalysis.length

      expect(properlyDimensionedRatio).toBeGreaterThan(0.8) // 80% should be properly dimensioned
    })

    test('Should reserve space for fonts to prevent layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const fontAnalysis = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, div'))

        const fontLoadingStrategies = {
          fontDisplay: 0,
          fallbackFonts: 0,
          fontPreload: 0
        }

        // Check for font-display in stylesheets
        const stylesheets = Array.from(document.styleSheets)
        for (const stylesheet of stylesheets) {
          try {
            const rules = stylesheet.cssRules
            if (rules) {
              for (let i = 0; i < rules.length; i++) {
                const rule = rules[i]
                if (rule.constructor.name === 'CSSFontFaceRule') {
                  const fontFaceRule = rule as CSSFontFaceRule
                  if ((fontFaceRule.style as any).fontDisplay) {
                    fontLoadingStrategies.fontDisplay++
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheets might not be accessible
          }
        }

        // Check for font preloading
        const preloadLinks = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'))
        fontLoadingStrategies.fontPreload = preloadLinks.length

        // Check for fallback fonts
        const elementsWithFallbacks = elements.filter(el => {
          const computedStyle = window.getComputedStyle(el)
          const fontFamily = computedStyle.fontFamily
          return fontFamily.includes(',') // Has fallback fonts
        })

        fontLoadingStrategies.fallbackFonts = elementsWithFallbacks.length

        return {
          ...fontLoadingStrategies,
          totalTextElements: elements.length,
          fallbackRatio: elementsWithFallbacks.length / elements.length
        }
      })

      console.log('Font Loading Strategy Analysis:', fontAnalysis)

      // Should have good fallback font coverage
      expect(fontAnalysis.fallbackRatio).toBeGreaterThan(0.5)

      // Should preload important fonts
      expect(fontAnalysis.fontPreload).toBeGreaterThan(0)
    })

    test('Should avoid layout shifts from ads or dynamic content', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const dynamicContentAnalysis = await page.evaluate(() => {
        const dynamicElements = Array.from(document.querySelectorAll('[data-dynamic], [data-lazy], .ad-container, .widget'))

        return dynamicElements.map(el => {
          const rect = el.getBoundingClientRect()
          const computedStyle = window.getComputedStyle(el)

          return {
            tagName: el.tagName,
            className: el.className,
            hasReservedSpace: rect.height > 0 || computedStyle.minHeight !== '0px',
            dimensions: {
              width: rect.width,
              height: rect.height
            },
            style: {
              minHeight: computedStyle.minHeight,
              height: computedStyle.height
            }
          }
        })
      })

      console.log('Dynamic Content Analysis:', dynamicContentAnalysis)

      // Dynamic elements should have reserved space
      const elementsWithSpace = dynamicContentAnalysis.filter(el => el.hasReservedSpace)
      if (dynamicContentAnalysis.length > 0) {
        const reservedSpaceRatio = elementsWithSpace.length / dynamicContentAnalysis.length
        expect(reservedSpaceRatio).toBeGreaterThan(0.7) // 70% should have reserved space
      }
    })

    test('Should handle responsive design changes without layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      // Test different viewport sizes
      const viewportSizes = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1200, height: 800 } // Desktop
      ]

      let totalCLS = 0

      for (const size of viewportSizes) {
        await page.setViewportSize(size)

        // Measure CLS during viewport change
        const clsMetrics = await measureCLS(page, 2000)
        totalCLS += clsMetrics.cls

        await page.waitForTimeout(1000)
      }

      console.log('Responsive Design CLS:', {
        totalCLS: totalCLS.toFixed(3),
        averageCLS: (totalCLS / viewportSizes.length).toFixed(3)
      })

      // Should have minimal CLS during responsive changes
      expect(totalCLS).toBeLessThan(CLS_BUDGETS.GOOD * 2) // Allow slightly higher for viewport changes
    })
  })

  test.describe('CLS Prevention Strategies', () => {
    test('Should use CSS containment for layout stability', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const containmentAnalysis = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'))

        const containmentStrategies = {
          layoutContainment: 0,
          sizeContainment: 0,
          styleContainment: 0,
          transformElements: 0,
          willChangeElements: 0
        }

        elements.forEach(el => {
          const computedStyle = window.getComputedStyle(el)

          if (computedStyle.contain.includes('layout')) {
            containmentStrategies.layoutContainment++
          }
          if (computedStyle.contain.includes('size')) {
            containmentStrategies.sizeContainment++
          }
          if (computedStyle.contain.includes('style')) {
            containmentStrategies.styleContainment++
          }
          if (computedStyle.transform !== 'none') {
            containmentStrategies.transformElements++
          }
          if (computedStyle.willChange !== 'auto') {
            containmentStrategies.willChangeElements++
          }
        })

        return containmentStrategies
      })

      console.log('CSS Containment Analysis:', containmentAnalysis)

      // Should use containment strategies for performance
      const totalContainment = containmentAnalysis.layoutContainment +
                              containmentAnalysis.sizeContainment +
                              containmentAnalysis.styleContainment

      expect(totalContainment).toBeGreaterThan(0)
    })

    test('Should avoid layout-triggering CSS properties in animations', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const animationAnalysis = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'))

        const animations = elements.map(el => {
          const computedStyle = window.getComputedStyle(el)
          const animations = computedStyle.animationName !== 'none'
          const transitions = computedStyle.transitionProperty !== 'none'

          return {
            hasAnimation: animations || transitions,
            animationName: computedStyle.animationName,
            transitionProperty: computedStyle.transitionProperty,
            transform: computedStyle.transform !== 'none'
          }
        }).filter(anim => anim.hasAnimation)

        const safeAnimations = animations.filter(anim =>
          anim.transitionProperty.includes('transform') ||
          anim.transitionProperty.includes('opacity') ||
          anim.transitionProperty === 'all' ||
          anim.transform
        )

        return {
          totalAnimations: animations.length,
          safeAnimations: safeAnimations.length,
          safeRatio: safeAnimations.length / (animations.length || 1)
        }
      })

      console.log('Animation Safety Analysis:', animationAnalysis)

      // Most animations should use safe properties (transform, opacity)
      if (animationAnalysis.totalAnimations > 0) {
        expect(animationAnalysis.safeRatio).toBeGreaterThan(0.7)
      }
    })

    test('Should handle loading states without layout shifts', async ({ page }) => {
      await page.goto('http://127.0.0.1:9292/')

      const loadingStateAnalysis = await page.evaluate(() => {
        const loadingElements = Array.from(document.querySelectorAll('[data-loading], .loading, .spinner, .skeleton'))

        return loadingElements.map(el => {
          const rect = el.getBoundingClientRect()
          const computedStyle = window.getComputedStyle(el)

          return {
            tagName: el.tagName,
            className: el.className,
            hasFixedSize: rect.width > 0 && rect.height > 0,
            position: computedStyle.position,
            minHeight: computedStyle.minHeight
          }
        })
      })

      console.log('Loading State Analysis:', loadingStateAnalysis)

      // Loading elements should have fixed dimensions
      if (loadingStateAnalysis.length > 0) {
        const fixedSizeCount = loadingStateAnalysis.filter(el => el.hasFixedSize).length
        const fixedSizeRatio = fixedSizeCount / loadingStateAnalysis.length

        expect(fixedSizeRatio).toBeGreaterThan(0.8)
      }
    })
  })

  test.describe('CLS Regression Testing', () => {
    test('Should maintain CLS budget across multiple page loads', async ({ page }) => {
      const clsResults = []

      // Test 3 consecutive loads
      for (let i = 0; i < 3; i++) {
        await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle' })

        const clsMetrics = await measureCLS(page, 3000)
        clsResults.push(clsMetrics.cls)

        // Small delay between tests
        await page.waitForTimeout(500)
      }

      console.log('CLS Consistency Test:', {
        measurements: clsResults.map(cls => cls.toFixed(3)),
        average: (clsResults.reduce((sum, cls) => sum + cls, 0) / clsResults.length).toFixed(3),
        max: Math.max(...clsResults).toFixed(3)
      })

      // All measurements should be under budget
      clsResults.forEach((cls, index) => {
        expect(cls, `Load ${index + 1} CLS exceeded budget`).toBeLessThan(CLS_BUDGETS.GOOD)
      })

      // Maximum CLS should not exceed good threshold
      expect(Math.max(...clsResults)).toBeLessThan(CLS_BUDGETS.GOOD)
    })

    test('Should handle slow network conditions without excessive layout shifts', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      // Simulate slow network
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 Kbps
        uploadThroughput: 200 * 1024 / 8,   // 200 Kbps
        latency: 1000 // 1 second latency
      })

      await page.goto('http://127.0.0.1:9292/', {
        waitUntil: 'networkidle',
        timeout: 20000
      })

      const clsMetrics = await measureCLS(page, 8000)

      console.log('CLS on Slow Network:', {
        cls: clsMetrics.cls.toFixed(3),
        budget: CLS_BUDGETS.GOOD.toFixed(3),
        networkCondition: 'Slow (500 Kbps, 1s latency)'
      })

      expect(clsMetrics.cls).toBeLessThan(CLS_BUDGETS.GOOD)

      await context.close()
    })
  })
})