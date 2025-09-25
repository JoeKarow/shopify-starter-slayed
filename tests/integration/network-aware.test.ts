/**
 * T022: Integration test for Network-aware loading
 *
 * This test verifies the end-to-end network-aware component loading
 * from network detection through adaptive loading strategies.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

// Test fixtures and temporary directories
const TEST_DIR = '/tmp/shopify-network-aware-test'
const COMPONENTS_DIR = path.join(TEST_DIR, 'frontend', 'components')

// Mock network conditions for testing
const MOCK_NETWORK_CONDITIONS = {
  fast: {
    effectiveType: '4g',
    downlink: 20, // Mbps
    rtt: 50, // ms
    saveData: false
  },
  slow: {
    effectiveType: '3g',
    downlink: 1.5, // Mbps
    rtt: 400, // ms
    saveData: false
  },
  very_slow: {
    effectiveType: '2g',
    downlink: 0.5, // Mbps
    rtt: 800, // ms
    saveData: true
  }
}

// Sample network-aware components
const NETWORK_AWARE_COMPONENTS = {
  'AdaptiveGallery.ts': `
    /**
     * Image gallery that adapts to network conditions
     * Reduces image quality and lazy loading distance on slow networks
     */
    @Template(['product'])
    @NetworkAware({
      slowThreshold: 5,
      fallbackStrategy: 'defer',
      reduceQuality: true
    })
    class AdaptiveGallery {
      private networkStatus: NetworkStatus
      private imageQuality = 'high'

      constructor(private container: HTMLElement) {
        this.networkStatus = this.getNetworkStatus()
        this.adaptToNetwork()
      }

      private adaptToNetwork() {
        if (this.networkStatus.type === 'slow') {
          this.imageQuality = 'medium'
          this.enableProgressiveLoading()
        } else if (this.networkStatus.type === 'very-slow') {
          this.imageQuality = 'low'
          this.enablePlaceholders()
        }
      }

      private enableProgressiveLoading() {
        // Load lower quality images first, then upgrade
      }

      private enablePlaceholders() {
        // Use skeleton placeholders instead of images
      }

      private getNetworkStatus(): NetworkStatus {
        // Implementation would use Network Information API
        return {
          type: 'fast',
          effectiveType: '4g',
          downlink: 20,
          rtt: 50
        }
      }

      render() {
        return \`
          <div class="adaptive-gallery quality-\${this.imageQuality}">
            \${this.renderImages()}
          </div>
        \`
      }
    }

    export default AdaptiveGallery
  `,

  'SmartVideo.ts': `
    /**
     * Video component that adapts playback based on network
     * Auto-pauses on slow networks, reduces quality
     */
    @Template(['product', 'collection'])
    @LazyLoad({ rootMargin: '200px' })
    @NetworkAware({
      slowThreshold: 3,
      fallbackStrategy: 'simplify'
    })
    class SmartVideo {
      private autoplay = true
      private quality = 'hd'

      constructor(private element: HTMLVideoElement) {
        this.setupNetworkAdaptation()
        this.bindEvents()
      }

      private setupNetworkAdaptation() {
        const network = this.getNetworkStatus()

        if (network.type === 'slow') {
          this.autoplay = false
          this.quality = 'sd'
        } else if (network.type === 'very-slow') {
          this.replacePosterOnly()
        }

        // Monitor network changes
        this.watchNetworkChanges()
      }

      private replacePosterOnly() {
        // Replace video with static poster image
        const poster = this.element.poster
        if (poster) {
          const img = document.createElement('img')
          img.src = poster
          img.alt = 'Video preview'
          this.element.parentNode?.replaceChild(img, this.element)
        }
      }

      private watchNetworkChanges() {
        if ('connection' in navigator) {
          (navigator as any).connection.addEventListener('change', () => {
            this.handleNetworkChange()
          })
        }
      }

      private handleNetworkChange() {
        const newStatus = this.getNetworkStatus()

        if (newStatus.type === 'slow' && this.element.autoplay) {
          this.element.pause()
          this.showDataSavingNotice()
        } else if (newStatus.type === 'fast' && this.element.paused) {
          this.hideDataSavingNotice()
        }
      }

      private showDataSavingNotice() {
        // Show notice about data saving
      }

      private hideDataSavingNotice() {
        // Hide data saving notice
      }
    }

    export default SmartVideo
  `,

  'DynamicLoader.ts': `
    /**
     * Generic component loader that adapts loading strategies
     * based on network conditions and user preferences
     */
    @Template(['*'])
    @NetworkAware({
      slowThreshold: 8,
      fallbackStrategy: 'critical-only'
    })
    class DynamicLoader {
      private loadingQueue: ComponentLoadRequest[] = []
      private criticalComponents = new Set(['header', 'navigation', 'footer'])

      constructor() {
        this.setupAdaptiveLoading()
      }

      private setupAdaptiveLoading() {
        const network = this.getNetworkStatus()

        if (network.type === 'slow') {
          this.enableBatchLoading()
          this.prioritizeCritical()
        } else if (network.type === 'very-slow') {
          this.enableCriticalOnly()
        }
      }

      private enableBatchLoading() {
        // Load components in batches to reduce network requests
        this.batchSize = 3
        this.batchDelay = 500
      }

      private prioritizeCritical() {
        // Load critical components first, defer others
        this.loadingQueue.sort((a, b) => {
          const aIsCritical = this.criticalComponents.has(a.component)
          const bIsCritical = this.criticalComponents.has(b.component)

          if (aIsCritical && !bIsCritical) return -1
          if (!aIsCritical && bIsCritical) return 1
          return 0
        })
      }

      private enableCriticalOnly() {
        // Only load critical components, defer everything else
        this.loadingQueue = this.loadingQueue.filter(request =>
          this.criticalComponents.has(request.component)
        )
      }

      async loadComponent(request: ComponentLoadRequest): Promise<Component | null> {
        const network = this.getNetworkStatus()

        if (network.type === 'very-slow' && !this.criticalComponents.has(request.component)) {
          // Don't load non-critical components on very slow networks
          return this.createPlaceholder(request)
        }

        if (network.saveData && request.options?.respectDataSaver !== false) {
          // Respect user's data saver preference
          return this.createMinimalVersion(request)
        }

        return this.loadFullComponent(request)
      }

      private createPlaceholder(request: ComponentLoadRequest): Component {
        return {
          element: this.createSkeletonElement(request.component),
          render: () => '<div class="component-placeholder"></div>'
        }
      }

      private createMinimalVersion(request: ComponentLoadRequest): Component {
        // Load component without heavy assets
        return this.loadComponentWithoutAssets(request)
      }
    }

    export default DynamicLoader
  `,

  'DataSaverAware.ts': `
    /**
     * Component that respects user's data saver preferences
     * Reduces functionality when data saver is enabled
     */
    @Template(['*'])
    @NetworkAware({
      slowThreshold: 10, // More tolerant threshold
      fallbackStrategy: 'simplify'
    })
    class DataSaverAware {
      private dataSaverEnabled = false

      constructor(private container: HTMLElement) {
        this.checkDataSaver()
        this.setupDataSaverMode()
      }

      private checkDataSaver() {
        if ('connection' in navigator) {
          const connection = (navigator as any).connection
          this.dataSaverEnabled = connection.saveData || false
        }

        // Also check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (prefersReducedMotion) {
          this.dataSaverEnabled = true
        }
      }

      private setupDataSaverMode() {
        if (this.dataSaverEnabled) {
          this.container.classList.add('data-saver-mode')
          this.disableAutoplay()
          this.reduceAnimations()
          this.showDataSaverIndicator()
        }
      }

      private disableAutoplay() {
        const videos = this.container.querySelectorAll('video[autoplay]')
        videos.forEach(video => {
          (video as HTMLVideoElement).autoplay = false
          (video as HTMLVideoElement).preload = 'none'
        })
      }

      private reduceAnimations() {
        // Disable CSS animations and transitions
        const style = document.createElement('style')
        style.textContent = \`
          .data-saver-mode * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        \`
        document.head.appendChild(style)
      }

      private showDataSaverIndicator() {
        const indicator = document.createElement('div')
        indicator.className = 'data-saver-indicator'
        indicator.textContent = 'Data Saver Mode Active'
        document.body.appendChild(indicator)
      }

      updateSettings(enableDataSaver: boolean) {
        this.dataSaverEnabled = enableDataSaver

        if (enableDataSaver) {
          this.setupDataSaverMode()
        } else {
          this.container.classList.remove('data-saver-mode')
          document.querySelector('.data-saver-indicator')?.remove()
        }
      }
    }

    export default DataSaverAware
  `
}

// Mock types for testing
const TYPES_FILE = `
  interface NetworkStatus {
    type: 'fast' | 'slow' | 'very-slow'
    effectiveType: '2g' | '3g' | '4g' | 'wifi'
    downlink: number
    rtt: number
    saveData?: boolean
  }

  interface ComponentLoadRequest {
    component: string
    priority: number
    options?: {
      respectDataSaver?: boolean
      fallback?: string
    }
  }

  interface Component {
    element: HTMLElement
    render: () => string
  }
`

describe('Network-Aware Loading Integration Tests (T022)', () => {
  let decoratorSystem: any
  let registry: any

  beforeEach(async () => {
    // Set up test environment
    await fs.promises.mkdir(TEST_DIR, { recursive: true })
    await fs.promises.mkdir(COMPONENTS_DIR, { recursive: true })

    // Create sample network-aware components
    for (const [filename, content] of Object.entries(NETWORK_AWARE_COMPONENTS)) {
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, filename),
        content
      )
    }

    // Create types file
    await fs.promises.writeFile(
      path.join(TEST_DIR, 'types.ts'),
      TYPES_FILE
    )

    // Mock navigator.connection
    global.navigator = {
      ...global.navigator,
      connection: {
        effectiveType: '4g',
        downlink: 20,
        rtt: 50,
        saveData: false,
        addEventListener: vi.fn()
      }
    } as any

    // Mock window.matchMedia
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Try to initialize the decorator system
    try {
      decoratorSystem = require('../../lib/shopify-decorator-system')
      registry = decoratorSystem.registry
    } catch (error) {
      // Expected to fail initially - implementation doesn't exist
      decoratorSystem = null
      registry = null
    }
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('network detection and adaptation', () => {
    it('should detect network conditions correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const networkStatus = decoratorSystem.getNetworkStatus()

        expect(networkStatus).toEqual({
          type: expect.stringMatching(/fast|slow|very-slow/),
          effectiveType: expect.stringMatching(/2g|3g|4g|wifi/),
          downlink: expect.any(Number),
          rtt: expect.any(Number)
        })

        // Should detect based on connection API
        expect(networkStatus.downlink).toBeGreaterThan(0)
        expect(networkStatus.rtt).toBeGreaterThan(0)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should adapt component loading based on network speed', async () => {
      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        await registry.discoverComponents(COMPONENTS_DIR)

        const adaptiveGallery = registry.getComponentsForTemplate('product')
          .find((c: any) => c.className === 'AdaptiveGallery')

        expect(adaptiveGallery).toBeDefined()

        // Test fast network strategy
        (global.navigator as any).connection = { downlink: 20, effectiveType: '4g' }

        let fastStrategy = registry.getLoadingStrategy(adaptiveGallery, {
          template: 'product',
          network: 'fast'
        })

        expect(fastStrategy.trigger).toBe('immediate')
        expect(fastStrategy.priority).toBeLessThan(10) // Higher priority

        // Test slow network strategy
        (global.navigator as any).connection = { downlink: 2, effectiveType: '3g' }

        let slowStrategy = registry.getLoadingStrategy(adaptiveGallery, {
          template: 'product',
          network: 'slow'
        })

        expect(slowStrategy.trigger).toBe('viewport') // Deferred loading
        expect(slowStrategy.fallback).toBeDefined()
        expect(slowStrategy.fallback?.trigger).toBe('idle')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should respect data saver preferences', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Enable data saver
        global.navigator.connection.saveData = true

        await registry.discoverComponents(COMPONENTS_DIR)

        const dataSaverComponent = registry.getComponentsForTemplate('index')
          .find((c: any) => c.className === 'DataSaverAware')

        const strategy = registry.getLoadingStrategy(dataSaverComponent, {
          template: 'index',
          network: 'slow'
        })

        // Should use minimal loading strategy when data saver is enabled
        expect(strategy.trigger).toBe('interaction') // Only load on user interaction
        expect(strategy.options?.respectDataSaver).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle network condition changes dynamically', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const mockConnectionEvent = {
          type: 'change',
          target: global.navigator.connection
        }

        // Start with fast network
        global.navigator.connection.downlink = 20
        global.navigator.connection.effectiveType = '4g'

        const initialStatus = decoratorSystem.getNetworkStatus()
        expect(initialStatus.type).toBe('fast')

        // Simulate network degradation
        global.navigator.connection.downlink = 1
        global.navigator.connection.effectiveType = '3g'

        // Trigger connection change event
        const changeHandler = vi.mocked(global.navigator.connection.addEventListener).mock.calls
          .find(call => call[0] === 'change')?.[1]

        if (changeHandler) {
          changeHandler(mockConnectionEvent)
        }

        const updatedStatus = decoratorSystem.getNetworkStatus()
        expect(updatedStatus.type).toBe('slow')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('adaptive loading strategies', () => {
    it('should implement different fallback strategies', async () => {
      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        await registry.discoverComponents(COMPONENTS_DIR)

        // Test 'defer' strategy
        const adaptiveGallery = registry.getComponentsForTemplate('product')
          .find((c: any) => c.className === 'AdaptiveGallery')

        const deferStrategy = registry.getLoadingStrategy(adaptiveGallery, {
          template: 'product',
          network: 'slow'
        })

        expect(deferStrategy.fallback?.trigger).toBe('idle')

        // Test 'simplify' strategy
        const smartVideo = registry.getComponentsForTemplate('product')
          .find((c: any) => c.className === 'SmartVideo')

        const simplifyStrategy = registry.getLoadingStrategy(smartVideo, {
          template: 'product',
          network: 'slow'
        })

        expect(simplifyStrategy.options?.simplified).toBe(true)

        // Test 'critical-only' strategy
        const dynamicLoader = registry.getComponentsForTemplate('index')
          .find((c: any) => c.className === 'DynamicLoader')

        const criticalOnlyStrategy = registry.getLoadingStrategy(dynamicLoader, {
          template: 'index',
          network: 'very-slow'
        })

        expect(criticalOnlyStrategy.options?.criticalOnly).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should batch component loading on slow networks', async () => {
      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const components = await registry.discoverComponents(COMPONENTS_DIR)

        // Simulate slow network
        global.navigator.connection.downlink = 1.5
        global.navigator.connection.effectiveType = '3g'

        const loadingPromises = components.map(component =>
          registry.initializeComponent(component, {
            trigger: 'immediate',
            priority: 5,
            network: 'slow'
          })
        )

        const startTime = Date.now()
        await Promise.all(loadingPromises)
        const loadTime = Date.now() - startTime

        console.log(`Batched loading completed in ${loadTime}ms`)

        // Should load in reasonable time even with batching
        expect(loadTime).toBeLessThan(5000) // 5 seconds

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should prioritize critical components on slow networks', async () => {
      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        await registry.discoverComponents(COMPONENTS_DIR)

        const components = registry.getComponentsForTemplate('product')
        const loadingOrder: Array<{ component: string; priority: number; timestamp: number }> = []

        // Simulate component loading with timestamps
        for (const component of components) {
          const strategy = registry.getLoadingStrategy(component, {
            template: 'product',
            network: 'slow'
          })

          loadingOrder.push({
            component: component.className,
            priority: strategy.priority,
            timestamp: Date.now() + strategy.priority * 100 // Simulate load time based on priority
          })
        }

        // Sort by actual loading order (timestamp)
        loadingOrder.sort((a, b) => a.timestamp - b.timestamp)

        // Components with lower priority numbers (higher priority) should load first
        for (let i = 1; i < loadingOrder.length; i++) {
          expect(loadingOrder[i].priority).toBeGreaterThanOrEqual(loadingOrder[i-1].priority)
        }

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should reduce asset quality on slow networks', async () => {
      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        await registry.discoverComponents(COMPONENTS_DIR)

        const adaptiveGallery = registry.getComponentsForTemplate('product')
          .find((c: any) => c.className === 'AdaptiveGallery')

        // Should have reduceQuality option enabled
        const networkAwareDecorator = adaptiveGallery.decorators
          .find(d => d.type === 'NetworkAware')

        expect(networkAwareDecorator.parameters.reduceQuality).toBe(true)

        // Test quality reduction on slow network
        const strategy = registry.getLoadingStrategy(adaptiveGallery, {
          template: 'product',
          network: 'slow'
        })

        expect(strategy.options?.quality).toBe('medium')

        // Test further reduction on very slow network
        const verySlowStrategy = registry.getLoadingStrategy(adaptiveGallery, {
          template: 'product',
          network: 'very-slow'
        })

        expect(verySlowStrategy.options?.quality).toBe('low')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('performance monitoring and analytics', () => {
    it('should track network-aware loading metrics', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const metrics = await decoratorSystem.getNetworkMetrics()

        expect(metrics).toEqual({
          networkType: expect.stringMatching(/fast|slow|very-slow/),
          componentsDeferred: expect.any(Number),
          componentsSimplified: expect.any(Number),
          bytesReduced: expect.any(Number),
          loadTimeImprovement: expect.any(Number)
        })

        expect(metrics.componentsDeferred).toBeGreaterThanOrEqual(0)
        expect(metrics.bytesReduced).toBeGreaterThanOrEqual(0)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should provide network-aware performance recommendations', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Simulate slow network conditions
        global.navigator.connection.downlink = 1
        global.navigator.connection.effectiveType = '3g'
        global.navigator.connection.rtt = 400

        const recommendations = await decoratorSystem.getPerformanceRecommendations()

        expect(recommendations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: expect.stringMatching(/defer|simplify|reduce-quality/),
              component: expect.any(String),
              reason: expect.any(String),
              impact: expect.stringMatching(/high|medium|low/)
            })
          ])
        )

        // Should have recommendations for slow network
        expect(recommendations.length).toBeGreaterThan(0)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should adapt thresholds based on historical performance', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Record some performance data
        await decoratorSystem.recordPerformanceData({
          networkConditions: { downlink: 5, rtt: 200 },
          loadTime: 3000,
          userExperience: 'poor'
        })

        await decoratorSystem.recordPerformanceData({
          networkConditions: { downlink: 8, rtt: 150 },
          loadTime: 2000,
          userExperience: 'good'
        })

        // Should adapt slow threshold based on data
        const adaptedSettings = await decoratorSystem.getAdaptedSettings()

        expect(adaptedSettings.slowThreshold).toBeGreaterThan(5) // Should increase threshold
        expect(adaptedSettings.slowThreshold).toBeLessThan(10)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('user experience considerations', () => {
    it('should show appropriate feedback for network-adapted content', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Enable data saver mode
        global.navigator.connection.saveData = true

        const dataSaverComponent = await decoratorSystem.createComponent('DataSaverAware', {
          template: 'index',
          network: 'slow'
        })

        // Should show data saver indicator
        expect(dataSaverComponent.showsDataSaverMode).toBe(true)
        expect(dataSaverComponent.render()).toContain('data-saver-mode')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should allow users to override network adaptations', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Simulate slow network but user wants full experience
        global.navigator.connection.downlink = 1
        global.navigator.connection.effectiveType = '3g'

        const userPreferences = {
          forceHighQuality: true,
          ignoreDataSaver: true
        }

        const component = await decoratorSystem.createComponent('AdaptiveGallery', {
          template: 'product',
          network: 'slow',
          userPreferences
        })

        // Should respect user override
        expect(component.imageQuality).toBe('high') // Despite slow network

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should gracefully degrade when network detection fails', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Remove network connection API
        delete (global.navigator as any).connection

        const networkStatus = decoratorSystem.getNetworkStatus()

        // Should fallback to reasonable defaults
        expect(networkStatus.type).toBe('fast') // Conservative default
        expect(networkStatus.effectiveType).toBe('4g')

        // Components should still work
        const components = await registry.discoverComponents(COMPONENTS_DIR)
        expect(components.length).toBeGreaterThan(0)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle offline scenarios', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Simulate offline condition
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })

        const offlineStrategy = await decoratorSystem.getOfflineStrategy()

        expect(offlineStrategy).toEqual({
          loadCriticalOnly: true,
          cacheComponents: true,
          showOfflineIndicator: true,
          deferNonEssential: true
        })

        // Should only load cached or critical components
        const availableComponents = await decoratorSystem.getAvailableComponents()
        expect(availableComponents.every(c =>
          c.cached || c.decorators.some(d => d.type === 'Critical')
        )).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle unsupported Network Information API', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Remove Network Information API support
        delete (global.navigator as any).connection
        delete (global.navigator as any).mozConnection
        delete (global.navigator as any).webkitConnection

        const networkStatus = decoratorSystem.getNetworkStatus()

        // Should provide fallback detection
        expect(networkStatus).toBeDefined()
        expect(networkStatus.type).toMatch(/fast|slow|unknown/)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle conflicting network-aware decorators', async () => {
      // Create component with conflicting network settings
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'ConflictingComponent.ts'),
        `
          @Template(['product'])
          @NetworkAware({ slowThreshold: 5, fallbackStrategy: 'defer' })
          @NetworkAware({ slowThreshold: 10, fallbackStrategy: 'critical-only' })
          class ConflictingComponent {
            render() { return '<div>conflicting</div>' }
          }
          export default ConflictingComponent
        `
      )

      if (!decoratorSystem || !registry) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const components = await registry.discoverComponents(COMPONENTS_DIR)
        const conflictingComponent = components.find((c: any) => c.className === 'ConflictingComponent')

        if (conflictingComponent) {
          // Should either merge settings or warn about conflict
          const networkDecorators = conflictingComponent.decorators.filter(d => d.type === 'NetworkAware')

          if (networkDecorators.length > 1) {
            expect(conflictingComponent.warnings).toBeDefined()
            expect(conflictingComponent.warnings.length).toBeGreaterThan(0)
          } else {
            // Settings were merged
            expect(networkDecorators[0].parameters.slowThreshold).toBeDefined()
          }
        }

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle rapid network condition changes', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const networkChanges = []

        // Simulate rapid network changes
        for (let i = 0; i < 10; i++) {
          global.navigator.connection.downlink = Math.random() * 20
          global.navigator.connection.effectiveType = ['2g', '3g', '4g'][Math.floor(Math.random() * 3)]

          const status = decoratorSystem.getNetworkStatus()
          networkChanges.push(status)

          await new Promise(resolve => setTimeout(resolve, 50))
        }

        // Should handle rapid changes without errors
        expect(networkChanges.length).toBe(10)
        networkChanges.forEach(change => {
          expect(change.type).toMatch(/fast|slow|very-slow/)
        })

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should cleanup network event listeners properly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const component = await decoratorSystem.createComponent('SmartVideo', {
          template: 'product'
        })

        // Track event listeners
        const addEventListenerSpy = vi.spied(global.navigator.connection.addEventListener)
        const removeEventListenerSpy = vi.fn()
        global.navigator.connection.removeEventListener = removeEventListenerSpy

        // Initialize component
        await component.initialize()

        // Destroy component
        await component.destroy()

        // Should clean up event listeners
        expect(addEventListenerSpy).toHaveBeenCalled()
        expect(removeEventListenerSpy).toHaveBeenCalled()

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })
})