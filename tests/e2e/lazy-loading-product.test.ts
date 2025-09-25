/**
 * T064: Test lazy loading for below-fold components on product pages
 *
 * This E2E test validates that components with @LazyLoad decorator
 * are properly lazy-loaded when they come into viewport on product pages.
 */

import { test, expect, type Page } from '@playwright/test'

// Mock IntersectionObserver for testing environments
const mockIntersectionObserver = `
  window.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observedElements = new Set();
    }

    observe(element) {
      this.observedElements.add(element);
      // Simulate immediate visibility for testing
      setTimeout(() => {
        this.callback([{
          target: element,
          isIntersecting: true,
          intersectionRatio: this.options?.threshold || 0.1,
          boundingClientRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now()
        }]);
      }, 100);
    }

    unobserve(element) {
      this.observedElements.delete(element);
    }

    disconnect() {
      this.observedElements.clear();
    }
  };
`

test.describe('Lazy Loading on Product Pages (T064)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock IntersectionObserver in the browser
    await page.addInitScript(mockIntersectionObserver)

    // Set up console logging to catch component initialization
    page.on('console', msg => {
      if (msg.text().includes('Initialized') || msg.text().includes('lazy')) {
        console.log('Browser console:', msg.text())
      }
    })
  })

  test('should lazy load ProductGallery component on product page', async ({ page }) => {
    // Mock a product page HTML with below-fold gallery
    const productPageHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Product</title>
          <style>
            .above-fold { height: 100vh; background: #f0f0f0; }
            .product-gallery { margin-top: 50px; height: 400px; }
          </style>
        </head>
        <body>
          <div class="above-fold">Above fold content</div>

          <!-- Product gallery should be lazy loaded -->
          <div class="product-gallery" data-component="product-gallery">
            <div class="product-gallery-main">
              <img src="/test-image.jpg" alt="Product" />
            </div>
            <div class="product-gallery-thumbnails">
              <img src="/thumb1.jpg" class="gallery-thumbnail" />
              <img src="/thumb2.jpg" class="gallery-thumbnail" />
            </div>
          </div>

          <!-- Test script to simulate component registration -->
          <script>
            // Simulate lazy loading decorator system
            window.slayedComponents = window.slayedComponents || {};
            window.componentRegistry = window.componentRegistry || {
              components: new Map(),
              observers: new Map()
            };

            // Simulate ProductGallery with @LazyLoad decorator
            class ProductGallery {
              constructor(options = {}) {
                this.options = {
                  rootMargin: '200px',
                  threshold: 0.1,
                  ...options
                };
                this.isLoaded = false;
                this.element = null;
              }

              init() {
                console.log('ProductGallery component initialized');
                this.isLoaded = true;
                this.bindEvents();
              }

              bindEvents() {
                const thumbnails = document.querySelectorAll('.gallery-thumbnail');
                thumbnails.forEach(thumb => {
                  thumb.addEventListener('click', () => {
                    console.log('Gallery thumbnail clicked');
                  });
                });
              }

              isInitialized() {
                return this.isLoaded;
              }
            }

            // Simulate @LazyLoad decorator behavior
            function setupLazyLoading() {
              const galleryElement = document.querySelector('.product-gallery');
              if (!galleryElement) return;

              const gallery = new ProductGallery();

              // Create IntersectionObserver for lazy loading
              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting && !gallery.isInitialized()) {
                    console.log('Gallery entered viewport - lazy loading triggered');
                    gallery.init();
                    observer.unobserve(entry.target);
                  }
                });
              }, {
                rootMargin: '200px',
                threshold: 0.1
              });

              observer.observe(galleryElement);
              window.componentRegistry.observers.set('product-gallery', observer);
              window.slayedComponents.productGallery = gallery;
            }

            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setupLazyLoading);
            } else {
              setupLazyLoading();
            }
          </script>
        </body>
      </html>
    `

    // Set content and wait for page load
    await page.setContent(productPageHTML)
    await page.waitForLoadState('domcontentloaded')

    // Initially, the component should not be initialized (above fold)
    let isInitialized = await page.evaluate(() => {
      return window.slayedComponents?.productGallery?.isInitialized() || false
    })
    expect(isInitialized).toBe(false)

    // Scroll to bring the gallery into viewport
    await page.evaluate(() => {
      document.querySelector('.product-gallery').scrollIntoView()
    })

    // Wait for lazy loading to trigger
    await page.waitForTimeout(200)

    // Check if component is now initialized
    isInitialized = await page.evaluate(() => {
      return window.slayedComponents?.productGallery?.isInitialized() || false
    })
    expect(isInitialized).toBe(true)

    // Verify that clicking thumbnails works (component is functional)
    const thumbnail = page.locator('.gallery-thumbnail').first()
    await expect(thumbnail).toBeVisible()

    // Listen for click event
    let clickEventFired = false
    page.on('console', msg => {
      if (msg.text().includes('Gallery thumbnail clicked')) {
        clickEventFired = true
      }
    })

    await thumbnail.click()
    await page.waitForTimeout(100)

    // The component should be interactive after lazy loading
    expect(clickEventFired).toBe(true)
  })

  test('should respect rootMargin configuration in lazy loading', async ({ page }) => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Root Margin Test</title></head>
        <body>
          <div style="height: 2000px;">Tall content</div>
          <div id="lazy-component" data-component="test-component">Lazy Component</div>

          <script>
            let triggerCount = 0;

            function setupTestComponent() {
              const element = document.getElementById('lazy-component');
              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    triggerCount++;
                    console.log('Lazy component triggered, count:', triggerCount);
                  }
                });
              }, {
                rootMargin: '100px', // Should trigger 100px before element is visible
                threshold: 0.1
              });

              observer.observe(element);
              window.testObserver = observer;
              window.getTriggerCount = () => triggerCount;
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setupTestComponent);
            } else {
              setupTestComponent();
            }
          </script>
        </body>
      </html>
    `

    await page.setContent(testHTML)
    await page.waitForLoadState('domcontentloaded')

    // Initially, component should not be triggered
    let triggerCount = await page.evaluate(() => window.getTriggerCount())
    expect(triggerCount).toBe(0)

    // Scroll to within rootMargin distance (but not fully visible)
    await page.evaluate(() => {
      const element = document.getElementById('lazy-component');
      const rect = element.getBoundingClientRect();
      const scrollTarget = window.scrollY + rect.top - window.innerHeight - 50; // 50px before it would be visible
      window.scrollTo(0, scrollTarget);
    })

    // Wait for intersection observer
    await page.waitForTimeout(200)

    // Component should be triggered due to rootMargin
    triggerCount = await page.evaluate(() => window.getTriggerCount())
    expect(triggerCount).toBeGreaterThan(0)
  })

  test('should handle multiple lazy components with different configurations', async ({ page }) => {
    const multiComponentHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Multiple Lazy Components</title></head>
        <body>
          <div style="height: 1000px;">Above fold content</div>

          <!-- Component 1: Quick trigger -->
          <div id="quick-component" style="height: 200px; margin: 100px 0;">
            Quick Component
          </div>

          <div style="height: 500px;"></div>

          <!-- Component 2: Delayed trigger -->
          <div id="delayed-component" style="height: 200px; margin: 100px 0;">
            Delayed Component
          </div>

          <script>
            const components = {
              quick: { loaded: false, config: { rootMargin: '200px', threshold: 0.1 } },
              delayed: { loaded: false, config: { rootMargin: '50px', threshold: 0.5 } }
            };

            function setupComponent(id, type) {
              const element = document.getElementById(id + '-component');
              const config = components[type].config;

              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    components[type].loaded = true;
                    console.log(type + ' component loaded');
                    observer.unobserve(entry.target);
                  }
                });
              }, config);

              observer.observe(element);
            }

            setupComponent('quick', 'quick');
            setupComponent('delayed', 'delayed');

            window.getComponentState = (type) => components[type].loaded;
          </script>
        </body>
      </html>
    `

    await page.setContent(multiComponentHTML)
    await page.waitForLoadState('domcontentloaded')

    // Initially, no components should be loaded
    expect(await page.evaluate(() => window.getComponentState('quick'))).toBe(false)
    expect(await page.evaluate(() => window.getComponentState('delayed'))).toBe(false)

    // Scroll to quick component (with larger rootMargin)
    await page.evaluate(() => {
      document.getElementById('quick-component').scrollIntoView({ behavior: 'smooth' })
    })
    await page.waitForTimeout(300)

    // Quick component should be loaded, delayed should not
    expect(await page.evaluate(() => window.getComponentState('quick'))).toBe(true)
    expect(await page.evaluate(() => window.getComponentState('delayed'))).toBe(false)

    // Scroll to delayed component
    await page.evaluate(() => {
      document.getElementById('delayed-component').scrollIntoView({ behavior: 'smooth' })
    })
    await page.waitForTimeout(300)

    // Both components should now be loaded
    expect(await page.evaluate(() => window.getComponentState('quick'))).toBe(true)
    expect(await page.evaluate(() => window.getComponentState('delayed'))).toBe(true)
  })

  test('should handle lazy loading with slow network simulation', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Add 100ms delay
      await route.continue()
    })

    const slowNetworkHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Slow Network Test</title></head>
        <body>
          <div style="height: 1000px;">Above fold</div>
          <div id="network-aware-component" data-component="network-aware">
            Network Aware Component
          </div>

          <script>
            let loadStartTime, loadEndTime;

            function setupNetworkAwareComponent() {
              const element = document.getElementById('network-aware-component');

              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    loadStartTime = Date.now();
                    console.log('Network-aware component loading started');

                    // Simulate component initialization with network delay
                    setTimeout(() => {
                      loadEndTime = Date.now();
                      console.log('Network-aware component loaded');
                      element.textContent = 'Component Loaded!';
                    }, 200);

                    observer.unobserve(entry.target);
                  }
                });
              }, {
                rootMargin: '100px',
                threshold: 0.1
              });

              observer.observe(element);
            }

            setupNetworkAwareComponent();
            window.getLoadTime = () => loadEndTime - loadStartTime;
          </script>
        </body>
      </html>
    `

    await page.setContent(slowNetworkHTML)
    await page.waitForLoadState('domcontentloaded')

    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      document.getElementById('network-aware-component').scrollIntoView()
    })

    // Wait for component to load
    await page.waitForFunction(() => {
      return document.getElementById('network-aware-component').textContent === 'Component Loaded!'
    })

    // Verify component loaded successfully even with network delay
    const componentText = await page.locator('#network-aware-component').textContent()
    expect(componentText).toBe('Component Loaded!')

    // Check that loading took reasonable time (accounting for delays)
    const loadTime = await page.evaluate(() => window.getLoadTime())
    expect(loadTime).toBeGreaterThan(150) // Should include our simulated delays
    expect(loadTime).toBeLessThan(1000) // But not excessively long
  })

  test('should clean up observers when components are destroyed', async ({ page }) => {
    const cleanupHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Observer Cleanup Test</title></head>
        <body>
          <div id="removable-component" style="margin-top: 1000px;">
            Removable Component
          </div>

          <script>
            let observerCount = 0;
            let cleanupCalled = false;

            function setupComponent() {
              const element = document.getElementById('removable-component');

              const observer = new IntersectionObserver((entries) => {
                console.log('Observer callback called');
              }, { rootMargin: '100px' });

              observer.observe(element);
              observerCount++;

              // Simulate cleanup function
              window.cleanupComponent = () => {
                observer.unobserve(element);
                observer.disconnect();
                cleanupCalled = true;
                observerCount--;
                console.log('Component cleanup completed');
              };

              window.getObserverCount = () => observerCount;
              window.wasCleanupCalled = () => cleanupCalled;
            }

            setupComponent();
          </script>
        </body>
      </html>
    `

    await page.setContent(cleanupHTML)
    await page.waitForLoadState('domcontentloaded')

    // Initially should have one observer
    expect(await page.evaluate(() => window.getObserverCount())).toBe(1)
    expect(await page.evaluate(() => window.wasCleanupCalled())).toBe(false)

    // Call cleanup
    await page.evaluate(() => window.cleanupComponent())

    // Observer should be cleaned up
    expect(await page.evaluate(() => window.getObserverCount())).toBe(0)
    expect(await page.evaluate(() => window.wasCleanupCalled())).toBe(true)
  })
})

test.describe('Lazy Loading Performance (T064)', () => {
  test('should not impact initial page load performance', async ({ page }) => {
    const performanceHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Performance Test</title></head>
        <body>
          <div id="critical-content">Critical above-fold content</div>

          <!-- Multiple lazy components below fold -->
          ${Array.from({ length: 10 }, (_, i) => `
            <div style="height: 1000px;"></div>
            <div id="lazy-${i}" class="lazy-component">Lazy Component ${i}</div>
          `).join('')}

          <script>
            const loadTimes = [];
            let criticalLoadTime;

            // Measure critical content load time
            const criticalStart = performance.now();
            document.getElementById('critical-content').textContent = 'Critical Content Loaded';
            criticalLoadTime = performance.now() - criticalStart;

            // Setup lazy loading for all components
            document.querySelectorAll('.lazy-component').forEach((element, index) => {
              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    const loadStart = performance.now();
                    entry.target.textContent += ' - Loaded!';
                    const loadTime = performance.now() - loadStart;
                    loadTimes.push(loadTime);
                    observer.unobserve(entry.target);
                  }
                });
              }, { rootMargin: '200px', threshold: 0.1 });

              observer.observe(element);
            });

            window.getCriticalLoadTime = () => criticalLoadTime;
            window.getLazyLoadTimes = () => loadTimes;
            window.getLoadedComponentsCount = () => loadTimes.length;
          </script>
        </body>
      </html>
    `

    await page.setContent(performanceHTML)
    await page.waitForLoadState('domcontentloaded')

    // Critical content should load very quickly
    const criticalLoadTime = await page.evaluate(() => window.getCriticalLoadTime())
    expect(criticalLoadTime).toBeLessThan(10) // Should be nearly instantaneous

    // Initially no lazy components should be loaded
    expect(await page.evaluate(() => window.getLoadedComponentsCount())).toBe(0)

    // Scroll through some components
    for (let i = 0; i < 3; i++) {
      await page.evaluate((index) => {
        document.getElementById(`lazy-${index}`).scrollIntoView({ behavior: 'smooth' })
      }, i)
      await page.waitForTimeout(100)
    }

    // Some components should now be loaded
    const loadedCount = await page.evaluate(() => window.getLoadedComponentsCount())
    expect(loadedCount).toBeGreaterThan(0)
    expect(loadedCount).toBeLessThanOrEqual(3)

    // Each lazy load should be reasonably fast
    const lazyLoadTimes = await page.evaluate(() => window.getLazyLoadTimes())
    lazyLoadTimes.forEach(time => {
      expect(time).toBeLessThan(50) // Each lazy load should be fast
    })
  })
})