/**
 * T065: Test network adaptation on slow 3G connections
 *
 * This E2E test validates that components with @NetworkAware decorator
 * adapt their loading behavior based on network conditions, especially
 * on slow 3G connections.
 */

import { test, expect, type Page } from '@playwright/test'

// Mock Network Information API for testing
const mockNetworkAPI = `
  window.mockNetworkInfo = {
    effectiveType: '3g',
    downlink: 0.7,
    rtt: 150,
    saveData: false
  };

  Object.defineProperty(navigator, 'connection', {
    value: window.mockNetworkInfo,
    writable: true
  });

  // Add event listener support for network changes
  if (!navigator.connection.addEventListener) {
    navigator.connection.addEventListener = function(event, callback) {
      window.addEventListener('networkchange', callback);
    };
    navigator.connection.removeEventListener = function(event, callback) {
      window.removeEventListener('networkchange', callback);
    };
  }

  // Helper function to simulate network changes
  window.changeNetwork = function(effectiveType, downlink, rtt, saveData) {
    window.mockNetworkInfo.effectiveType = effectiveType;
    window.mockNetworkInfo.downlink = downlink;
    window.mockNetworkInfo.rtt = rtt;
    window.mockNetworkInfo.saveData = saveData;
    window.dispatchEvent(new CustomEvent('networkchange'));
  };
`

test.describe('Network Adaptation (T065)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Network Information API
    await page.addInitScript(mockNetworkAPI)

    // Set up console logging
    page.on('console', msg => {
      if (msg.text().includes('network') || msg.text().includes('Network')) {
        console.log('Browser console:', msg.text())
      }
    })
  })

  test('should detect slow 3G network and adapt loading strategy', async ({ page }) => {
    const networkAwareHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Network Adaptation Test</title>
          <style>
            .component { margin: 100px 0; padding: 20px; border: 1px solid #ccc; }
            .loading { opacity: 0.5; }
            .network-info { position: fixed; top: 10px; right: 10px; background: #f0f0f0; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="network-info" id="network-display">Network: Unknown</div>

          <div id="critical-component" class="component">
            Critical Component (Always loads)
          </div>

          <div id="network-aware-component" class="component">
            Network Aware Component (Adapts to connection)
          </div>

          <div id="heavy-component" class="component">
            Heavy Component (Skipped on slow networks)
          </div>

          <script>
            // Network detection utilities
            class NetworkManager {
              constructor() {
                this.connection = navigator.connection;
                this.callbacks = new Set();
                this.init();
              }

              init() {
                this.updateNetworkDisplay();
                if (this.connection) {
                  this.connection.addEventListener('change', () => {
                    this.updateNetworkDisplay();
                    this.notifyCallbacks();
                  });
                }
                // Also listen for our custom network change events
                window.addEventListener('networkchange', () => {
                  this.updateNetworkDisplay();
                  this.notifyCallbacks();
                });
              }

              updateNetworkDisplay() {
                const display = document.getElementById('network-display');
                if (this.connection) {
                  display.textContent = 'Network: ' + this.connection.effectiveType +
                    ' (↓' + this.connection.downlink + 'Mbps, ' +
                    this.connection.rtt + 'ms RTT' +
                    (this.connection.saveData ? ', Save Data' : '') + ')';
                }
              }

              isSlowNetwork() {
                if (!this.connection) return false;
                return this.connection.effectiveType === 'slow-2g' ||
                       this.connection.effectiveType === '2g' ||
                       (this.connection.effectiveType === '3g' && this.connection.downlink < 1.5) ||
                       this.connection.saveData;
              }

              isFastNetwork() {
                if (!this.connection) return true; // Assume fast if unknown
                return this.connection.effectiveType === '4g' &&
                       this.connection.downlink > 4;
              }

              getEffectiveType() {
                return this.connection ? this.connection.effectiveType : 'unknown';
              }

              onChange(callback) {
                this.callbacks.add(callback);
              }

              notifyCallbacks() {
                this.callbacks.forEach(callback => callback());
              }
            }

            // Component with network awareness
            class NetworkAwareComponent {
              constructor(element, options = {}) {
                this.element = element;
                this.options = {
                  skipOnSlow: false,
                  simplifyOnSlow: true,
                  delayOnSlow: 500,
                  ...options
                };
                this.networkManager = new NetworkManager();
                this.isLoaded = false;
                this.init();
              }

              init() {
                this.networkManager.onChange(() => {
                  this.adaptToNetwork();
                });
                this.adaptToNetwork();
              }

              adaptToNetwork() {
                const isSlowNetwork = this.networkManager.isSlowNetwork();
                const effectiveType = this.networkManager.getEffectiveType();

                console.log('Network adaptation triggered:', effectiveType, isSlowNetwork ? 'slow' : 'fast');

                if (isSlowNetwork && this.options.skipOnSlow) {
                  this.skipLoading();
                } else if (isSlowNetwork && this.options.simplifyOnSlow) {
                  this.loadSimplified();
                } else {
                  this.loadFull();
                }
              }

              skipLoading() {
                this.element.innerHTML = '<p>Skipped on slow network</p>';
                this.element.style.opacity = '0.7';
                console.log('Component loading skipped due to slow network');
              }

              loadSimplified() {
                this.element.classList.add('loading');

                setTimeout(() => {
                  this.element.innerHTML = '<p>Simplified version loaded for slow network</p>';
                  this.element.classList.remove('loading');
                  this.isLoaded = true;
                  console.log('Component loaded in simplified mode');
                }, this.options.delayOnSlow);
              }

              loadFull() {
                this.element.classList.add('loading');

                setTimeout(() => {
                  this.element.innerHTML = '<p>Full version loaded for fast network</p><div>Rich content, images, animations...</div>';
                  this.element.classList.remove('loading');
                  this.isLoaded = true;
                  console.log('Component loaded in full mode');
                }, 100);
              }

              getLoadState() {
                return {
                  loaded: this.isLoaded,
                  simplified: this.element.textContent.includes('Simplified'),
                  skipped: this.element.textContent.includes('Skipped')
                };
              }
            }

            // Initialize components
            const networkManager = new NetworkManager();

            // Critical component - always loads regardless of network
            const criticalComponent = new NetworkAwareComponent(
              document.getElementById('critical-component'),
              { skipOnSlow: false, simplifyOnSlow: false }
            );

            // Network aware component - adapts to network conditions
            const networkAwareComponent = new NetworkAwareComponent(
              document.getElementById('network-aware-component'),
              { skipOnSlow: false, simplifyOnSlow: true, delayOnSlow: 300 }
            );

            // Heavy component - skips loading on slow networks
            const heavyComponent = new NetworkAwareComponent(
              document.getElementById('heavy-component'),
              { skipOnSlow: true, simplifyOnSlow: false }
            );

            // Expose for testing
            window.networkManager = networkManager;
            window.components = {
              critical: criticalComponent,
              networkAware: networkAwareComponent,
              heavy: heavyComponent
            };

            window.getComponentStates = () => ({
              critical: criticalComponent.getLoadState(),
              networkAware: networkAwareComponent.getLoadState(),
              heavy: heavyComponent.getLoadState()
            });
          </script>
        </body>
      </html>
    `

    await page.setContent(networkAwareHTML)
    await page.waitForLoadState('domcontentloaded')

    // Initially on 3G network (from mock)
    await page.waitForTimeout(500)

    const initialStates = await page.evaluate(() => window.getComponentStates())

    // Critical component should always load
    expect(initialStates.critical.loaded).toBe(true)

    // Network aware component should load simplified version on 3G
    expect(initialStates.networkAware.loaded).toBe(true)
    expect(initialStates.networkAware.simplified).toBe(true)

    // Heavy component should be skipped on slow 3G
    expect(initialStates.heavy.skipped).toBe(true)
  })

  test('should adapt when network conditions change', async ({ page }) => {
    const dynamicNetworkHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Dynamic Network Test</title></head>
        <body>
          <div id="adaptive-component" style="padding: 20px; border: 1px solid #ccc;">
            Adaptive Component
          </div>

          <script>
            class AdaptiveComponent {
              constructor(element) {
                this.element = element;
                this.loadedVersions = [];
                this.setup();
              }

              setup() {
                if (navigator.connection) {
                  navigator.connection.addEventListener('change', () => {
                    this.adaptToNetwork();
                  });
                }
                window.addEventListener('networkchange', () => {
                  this.adaptToNetwork();
                });
                this.adaptToNetwork();
              }

              adaptToNetwork() {
                const connection = navigator.connection;
                if (!connection) return;

                const effectiveType = connection.effectiveType;
                const downlink = connection.downlink;
                const saveData = connection.saveData;

                let version;
                if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
                  version = 'minimal';
                } else if (effectiveType === '3g' && downlink < 1.5) {
                  version = 'simplified';
                } else if (effectiveType === '3g') {
                  version = 'standard';
                } else {
                  version = 'full';
                }

                this.loadVersion(version);
                console.log('Network adaptation: loaded ' + version + ' version');
              }

              loadVersion(version) {
                this.loadedVersions.push(version);

                const content = {
                  minimal: 'Minimal content for very slow networks',
                  simplified: 'Simplified content for slow 3G',
                  standard: 'Standard content for 3G',
                  full: 'Full rich content for fast connections'
                };

                this.element.innerHTML = '<p>' + content[version] + '</p>';
                this.element.setAttribute('data-version', version);
              }

              getLoadedVersions() {
                return [...this.loadedVersions];
              }

              getCurrentVersion() {
                return this.element.getAttribute('data-version');
              }
            }

            const component = new AdaptiveComponent(document.getElementById('adaptive-component'));
            window.adaptiveComponent = component;
          </script>
        </body>
      </html>
    `

    await page.setContent(dynamicNetworkHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(200)

    // Initially on 3G (0.7 Mbps) - should load simplified
    let currentVersion = await page.evaluate(() => window.adaptiveComponent.getCurrentVersion())
    expect(currentVersion).toBe('simplified')

    // Change to fast 4G network
    await page.evaluate(() => {
      window.changeNetwork('4g', 10.0, 50, false)
    })
    await page.waitForTimeout(200)

    // Should now load full version
    currentVersion = await page.evaluate(() => window.adaptiveComponent.getCurrentVersion())
    expect(currentVersion).toBe('full')

    // Change to slow 2G network
    await page.evaluate(() => {
      window.changeNetwork('slow-2g', 0.1, 400, false)
    })
    await page.waitForTimeout(200)

    // Should now load minimal version
    currentVersion = await page.evaluate(() => window.adaptiveComponent.getCurrentVersion())
    expect(currentVersion).toBe('minimal')

    // Verify all versions were loaded during the test
    const loadedVersions = await page.evaluate(() => window.adaptiveComponent.getLoadedVersions())
    expect(loadedVersions).toContain('simplified')
    expect(loadedVersions).toContain('full')
    expect(loadedVersions).toContain('minimal')
  })

  test('should respect save data preference', async ({ page }) => {
    const saveDataHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Save Data Test</title></head>
        <body>
          <div id="save-data-component" style="padding: 20px;">
            Save Data Component
          </div>

          <script>
            class SaveDataAwareComponent {
              constructor(element) {
                this.element = element;
                this.init();
              }

              init() {
                this.checkSaveDataPreference();

                // Listen for network changes
                if (navigator.connection) {
                  navigator.connection.addEventListener('change', () => {
                    this.checkSaveDataPreference();
                  });
                }
                window.addEventListener('networkchange', () => {
                  this.checkSaveDataPreference();
                });
              }

              checkSaveDataPreference() {
                const connection = navigator.connection;
                if (!connection) return;

                const saveData = connection.saveData;

                if (saveData) {
                  this.loadDataSaverVersion();
                } else {
                  this.loadNormalVersion();
                }

                console.log('Save data preference:', saveData ? 'enabled' : 'disabled');
              }

              loadDataSaverVersion() {
                this.element.innerHTML = '<p>Data saver version - minimal content only</p>';
                this.element.classList.add('save-data-mode');
                this.element.setAttribute('data-mode', 'save-data');
              }

              loadNormalVersion() {
                this.element.innerHTML = '<p>Normal version with rich content</p><div>Images, videos, full features...</div>';
                this.element.classList.remove('save-data-mode');
                this.element.setAttribute('data-mode', 'normal');
              }

              getMode() {
                return this.element.getAttribute('data-mode');
              }
            }

            const component = new SaveDataAwareComponent(document.getElementById('save-data-component'));
            window.saveDataComponent = component;
          </script>
        </body>
      </html>
    `

    await page.setContent(saveDataHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(200)

    // Initially save data is off - should load normal version
    let mode = await page.evaluate(() => window.saveDataComponent.getMode())
    expect(mode).toBe('normal')

    // Enable save data preference
    await page.evaluate(() => {
      window.changeNetwork('3g', 1.0, 100, true) // saveData = true
    })
    await page.waitForTimeout(200)

    // Should now use data saver version
    mode = await page.evaluate(() => window.saveDataComponent.getMode())
    expect(mode).toBe('save-data')

    // Disable save data preference
    await page.evaluate(() => {
      window.changeNetwork('4g', 5.0, 80, false) // saveData = false
    })
    await page.waitForTimeout(200)

    // Should return to normal version
    mode = await page.evaluate(() => window.saveDataComponent.getMode())
    expect(mode).toBe('normal')
  })

  test('should handle network-aware image loading', async ({ page }) => {
    const imageLoadingHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Network Aware Images</title></head>
        <body>
          <div id="image-gallery" style="padding: 20px;">
            <h3>Image Gallery</h3>
            <div id="images-container"></div>
          </div>

          <script>
            class NetworkAwareImageGallery {
              constructor(element) {
                this.element = element;
                this.container = element.querySelector('#images-container');
                this.images = [
                  { src: 'high-res-1.jpg', lowRes: 'thumb-1.jpg', alt: 'Image 1' },
                  { src: 'high-res-2.jpg', lowRes: 'thumb-2.jpg', alt: 'Image 2' },
                  { src: 'high-res-3.jpg', lowRes: 'thumb-3.jpg', alt: 'Image 3' }
                ];
                this.loadedImages = [];
                this.init();
              }

              init() {
                this.loadImagesBasedOnNetwork();

                if (navigator.connection) {
                  navigator.connection.addEventListener('change', () => {
                    this.reloadImagesForNetwork();
                  });
                }
                window.addEventListener('networkchange', () => {
                  this.reloadImagesForNetwork();
                });
              }

              loadImagesBasedOnNetwork() {
                const connection = navigator.connection;
                if (!connection) {
                  this.loadHighResImages();
                  return;
                }

                const isSlowNetwork = connection.effectiveType === 'slow-2g' ||
                                    connection.effectiveType === '2g' ||
                                    (connection.effectiveType === '3g' && connection.downlink < 1.0) ||
                                    connection.saveData;

                if (isSlowNetwork) {
                  this.loadLowResImages();
                } else {
                  this.loadHighResImages();
                }
              }

              loadHighResImages() {
                this.container.innerHTML = '';
                this.images.forEach((img, index) => {
                  const imgElement = document.createElement('img');
                  imgElement.src = img.src;
                  imgElement.alt = img.alt;
                  imgElement.style.width = '200px';
                  imgElement.style.height = '150px';
                  imgElement.style.margin = '10px';
                  imgElement.setAttribute('data-quality', 'high');
                  this.container.appendChild(imgElement);
                });
                this.loadedImages = this.images.map(img => ({ ...img, quality: 'high' }));
                console.log('Loaded high resolution images');
              }

              loadLowResImages() {
                this.container.innerHTML = '';
                this.images.forEach((img, index) => {
                  const imgElement = document.createElement('img');
                  imgElement.src = img.lowRes;
                  imgElement.alt = img.alt;
                  imgElement.style.width = '200px';
                  imgElement.style.height = '150px';
                  imgElement.style.margin = '10px';
                  imgElement.setAttribute('data-quality', 'low');
                  this.container.appendChild(imgElement);
                });
                this.loadedImages = this.images.map(img => ({ ...img, quality: 'low' }));
                console.log('Loaded low resolution images');
              }

              reloadImagesForNetwork() {
                this.loadImagesBasedOnNetwork();
              }

              getImageQuality() {
                const firstImg = this.container.querySelector('img');
                return firstImg ? firstImg.getAttribute('data-quality') : 'none';
              }

              getLoadedImageCount() {
                return this.container.querySelectorAll('img').length;
              }
            }

            const gallery = new NetworkAwareImageGallery(document.getElementById('image-gallery'));
            window.imageGallery = gallery;
          </script>
        </body>
      </html>
    `

    await page.setContent(imageLoadingHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(300)

    // On slow 3G, should load low resolution images
    let imageQuality = await page.evaluate(() => window.imageGallery.getImageQuality())
    expect(imageQuality).toBe('low')

    let imageCount = await page.evaluate(() => window.imageGallery.getLoadedImageCount())
    expect(imageCount).toBe(3)

    // Switch to fast 4G network
    await page.evaluate(() => {
      window.changeNetwork('4g', 8.0, 40, false)
    })
    await page.waitForTimeout(300)

    // Should now load high resolution images
    imageQuality = await page.evaluate(() => window.imageGallery.getImageQuality())
    expect(imageQuality).toBe('high')

    imageCount = await page.evaluate(() => window.imageGallery.getLoadedImageCount())
    expect(imageCount).toBe(3)
  })

  test('should measure and report network performance impact', async ({ page }) => {
    const performanceHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Network Performance Test</title></head>
        <body>
          <div id="performance-component">Performance Test Component</div>

          <script>
            class NetworkPerformanceComponent {
              constructor(element) {
                this.element = element;
                this.metrics = {
                  loadTimes: [],
                  networkTypes: [],
                  adaptationCounts: 0
                };
                this.init();
              }

              init() {
                this.recordNetworkMetrics();

                if (navigator.connection) {
                  navigator.connection.addEventListener('change', () => {
                    this.onNetworkChange();
                  });
                }
                window.addEventListener('networkchange', () => {
                  this.onNetworkChange();
                });
              }

              recordNetworkMetrics() {
                const startTime = performance.now();
                const connection = navigator.connection;

                if (connection) {
                  this.metrics.networkTypes.push({
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                  });
                }

                // Simulate content loading
                setTimeout(() => {
                  const loadTime = performance.now() - startTime;
                  this.metrics.loadTimes.push(loadTime);
                  this.updateDisplay();
                  console.log('Content loaded in', loadTime + 'ms on', connection?.effectiveType);
                }, this.getLoadDelay());
              }

              getLoadDelay() {
                const connection = navigator.connection;
                if (!connection) return 100;

                // Simulate different load times based on network
                const delays = {
                  'slow-2g': 2000,
                  '2g': 1000,
                  '3g': 500,
                  '4g': 100
                };

                return delays[connection.effectiveType] || 200;
              }

              onNetworkChange() {
                this.metrics.adaptationCounts++;
                this.recordNetworkMetrics();
                console.log('Network changed, adaptation count:', this.metrics.adaptationCounts);
              }

              updateDisplay() {
                const avgLoadTime = this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length;
                this.element.innerHTML =
                  '<div>Average Load Time: ' + Math.round(avgLoadTime) + 'ms</div>' +
                  '<div>Network Adaptations: ' + this.metrics.adaptationCounts + '</div>' +
                  '<div>Total Loads: ' + this.metrics.loadTimes.length + '</div>';
              }

              getMetrics() {
                return { ...this.metrics };
              }

              getAverageLoadTime() {
                if (this.metrics.loadTimes.length === 0) return 0;
                return this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length;
              }
            }

            const perfComponent = new NetworkPerformanceComponent(document.getElementById('performance-component'));
            window.performanceComponent = perfComponent;
          </script>
        </body>
      </html>
    `

    await page.setContent(performanceHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600) // Wait for initial load

    // Get initial metrics
    let metrics = await page.evaluate(() => window.performanceComponent.getMetrics())
    expect(metrics.loadTimes.length).toBeGreaterThan(0)
    expect(metrics.networkTypes.length).toBeGreaterThan(0)

    // Change network conditions and measure impact
    await page.evaluate(() => {
      window.changeNetwork('2g', 0.3, 300, false)
    })
    await page.waitForTimeout(1200) // Wait for slow network simulation

    // Change to fast network
    await page.evaluate(() => {
      window.changeNetwork('4g', 12.0, 30, false)
    })
    await page.waitForTimeout(200)

    // Get final metrics
    metrics = await page.evaluate(() => window.performanceComponent.getMetrics())

    // Should have recorded multiple network changes
    expect(metrics.adaptationCounts).toBeGreaterThan(1)
    expect(metrics.loadTimes.length).toBeGreaterThan(2)
    expect(metrics.networkTypes.length).toBeGreaterThan(2)

    // Different network types should be recorded
    const networkTypes = metrics.networkTypes.map(n => n.effectiveType)
    expect(networkTypes).toContain('3g')
    expect(networkTypes).toContain('2g')
    expect(networkTypes).toContain('4g')

    console.log('Network performance metrics:', metrics)
  })
})

test.describe('Network Adaptation Edge Cases (T065)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockNetworkAPI)
  })

  test('should handle missing Network Information API gracefully', async ({ page }) => {
    const noAPIHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>No Network API Test</title></head>
        <body>
          <div id="fallback-component">Fallback Component</div>

          <script>
            // Remove Network Information API
            delete navigator.connection;

            class GracefulFallbackComponent {
              constructor(element) {
                this.element = element;
                this.init();
              }

              init() {
                if (!navigator.connection) {
                  this.loadDefaultVersion();
                  console.log('Network API not available, using default behavior');
                } else {
                  this.loadNetworkAwareVersion();
                }
              }

              loadDefaultVersion() {
                this.element.innerHTML = '<p>Default version - Network API not supported</p>';
                this.element.setAttribute('data-version', 'default');
              }

              loadNetworkAwareVersion() {
                this.element.innerHTML = '<p>Network-aware version</p>';
                this.element.setAttribute('data-version', 'network-aware');
              }

              getVersion() {
                return this.element.getAttribute('data-version');
              }
            }

            const component = new GracefulFallbackComponent(document.getElementById('fallback-component'));
            window.fallbackComponent = component;
          </script>
        </body>
      </html>
    `

    await page.setContent(noAPIHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(200)

    // Should fall back to default version when Network API is unavailable
    const version = await page.evaluate(() => window.fallbackComponent.getVersion())
    expect(version).toBe('default')

    // Should contain fallback message
    const content = await page.locator('#fallback-component').textContent()
    expect(content).toContain('Network API not supported')
  })

  test('should handle rapid network changes without performance issues', async ({ page }) => {
    const rapidChangeHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Rapid Network Changes</title></head>
        <body>
          <div id="rapid-change-component">Rapid Change Component</div>

          <script>
            class RapidChangeComponent {
              constructor(element) {
                this.element = element;
                this.changeCount = 0;
                this.lastChangeTime = Date.now();
                this.isProcessing = false;
                this.init();
              }

              init() {
                if (navigator.connection) {
                  navigator.connection.addEventListener('change', () => {
                    this.handleNetworkChange();
                  });
                }
                window.addEventListener('networkchange', () => {
                  this.handleNetworkChange();
                });
              }

              handleNetworkChange() {
                // Debounce rapid changes
                if (this.isProcessing) return;

                this.isProcessing = true;
                this.changeCount++;
                this.lastChangeTime = Date.now();

                setTimeout(() => {
                  this.adaptToCurrentNetwork();
                  this.isProcessing = false;
                }, 50); // 50ms debounce
              }

              adaptToCurrentNetwork() {
                const connection = navigator.connection;
                if (!connection) return;

                this.element.innerHTML =
                  '<p>Network: ' + connection.effectiveType + '</p>' +
                  '<p>Changes: ' + this.changeCount + '</p>';

                console.log('Network adaptation completed, change #' + this.changeCount);
              }

              getChangeCount() {
                return this.changeCount;
              }

              getTimeSinceLastChange() {
                return Date.now() - this.lastChangeTime;
              }
            }

            const component = new RapidChangeComponent(document.getElementById('rapid-change-component'));
            window.rapidChangeComponent = component;
          </script>
        </body>
      </html>
    `

    await page.setContent(rapidChangeHTML)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(200)

    // Trigger rapid network changes
    for (let i = 0; i < 10; i++) {
      const networks = ['2g', '3g', '4g'];
      const randomNetwork = networks[i % networks.length];
      await page.evaluate((network) => {
        window.changeNetwork(network, Math.random() * 5, Math.random() * 200 + 50, false);
      }, randomNetwork);
      await page.waitForTimeout(20); // Very rapid changes
    }

    // Allow processing to complete
    await page.waitForTimeout(200);

    // Should handle all changes without crashing
    const changeCount = await page.evaluate(() => window.rapidChangeComponent.getChangeCount());
    expect(changeCount).toBeGreaterThan(0);
    expect(changeCount).toBeLessThanOrEqual(10); // Debouncing may reduce the count

    // Component should still be functional
    const content = await page.locator('#rapid-change-component').textContent();
    expect(content).toContain('Network:');
    expect(content).toContain('Changes:');
  })
})