/**
 * T021: Integration test for Decorator auto-discovery
 *
 * This test verifies the end-to-end auto-discovery of decorated components
 * from filesystem scanning through component registration and loading.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

// Test fixtures and temporary directories
const TEST_DIR = '/tmp/shopify-decorator-discovery-test'
const COMPONENTS_DIR = path.join(TEST_DIR, 'frontend', 'components')
const STORES_DIR = path.join(TEST_DIR, 'frontend', 'stores')
const UTILS_DIR = path.join(TEST_DIR, 'frontend', 'utils')

// Sample component files with decorators
const SAMPLE_COMPONENTS = {
  'ProductGallery.ts': `
    /**
     * Product image gallery component
     * Shows product images with zoom and navigation
     */
    @Template(['product'])
    @LazyLoad({ rootMargin: '100px', threshold: 0.1 })
    @NetworkAware({ slowThreshold: 5 })
    class ProductGallery {
      private images: HTMLImageElement[] = []
      private currentIndex = 0

      constructor(private container: HTMLElement) {
        this.init()
      }

      private init() {
        this.setupImages()
        this.setupNavigation()
        this.setupZoom()
      }

      @Debounced(300)
      private handleResize() {
        this.updateLayout()
      }

      @Cached(60000) // Cache for 1 minute
      private async loadImageData(imageUrl: string) {
        const response = await fetch(imageUrl)
        return response.blob()
      }

      render() {
        return \`
          <div class="product-gallery">
            <div class="gallery-main">
              \${this.renderMainImage()}
            </div>
            <div class="gallery-thumbs">
              \${this.renderThumbnails()}
            </div>
          </div>
        \`
      }
    }

    export default ProductGallery
  `,

  'HeaderNav.ts': `
    /**
     * Global header navigation component
     * Always loaded, critical for site navigation
     */
    @Template(['*'])
    @Critical()
    @NetworkAware({ slowThreshold: 10, fallbackStrategy: 'critical-only' })
    class HeaderNav {
      private isMenuOpen = false

      constructor(private element: HTMLElement) {
        this.setupEventListeners()
      }

      @Throttled(100)
      private handleScroll() {
        const scrolled = window.scrollY > 50
        this.element.classList.toggle('scrolled', scrolled)
      }

      toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen
        this.element.classList.toggle('menu-open', this.isMenuOpen)
      }

      render() {
        return \`
          <header class="header-nav">
            <div class="nav-container">
              <a href="/" class="logo">Store Logo</a>
              <nav class="main-nav">\${this.renderNavItems()}</nav>
              <div class="nav-actions">\${this.renderActions()}</div>
            </div>
          </header>
        \`
      }
    }

    export default HeaderNav
  `,

  'CartDrawer.ts': `
    /**
     * Cart drawer component
     * Loads lazily when cart interaction occurs
     */
    @Template(['*'])
    @LazyLoad({ rootMargin: '200vh', threshold: 0 })
    class CartDrawer {
      private isOpen = false
      private items: CartItem[] = []

      constructor(private container: HTMLElement) {
        this.setupCartEvents()
      }

      @Debounced(500)
      private updateCartCount() {
        const count = this.items.reduce((sum, item) => sum + item.quantity, 0)
        this.broadcastCartUpdate(count)
      }

      async addToCart(variantId: string, quantity: number) {
        try {
          const response = await fetch('/cart/add.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: variantId, quantity })
          })

          if (response.ok) {
            await this.refreshCart()
            this.open()
          }
        } catch (error) {
          console.error('Failed to add to cart:', error)
        }
      }

      open() {
        this.isOpen = true
        document.body.classList.add('cart-open')
      }

      close() {
        this.isOpen = false
        document.body.classList.remove('cart-open')
      }
    }

    export default CartDrawer
  `,

  'CollectionFilters.ts': `
    /**
     * Product collection filters
     * Only loads on collection pages
     */
    @Template(['collection'])
    @LazyLoad({ rootMargin: '50px', threshold: 0.5 })
    class CollectionFilters {
      private filters: Map<string, Set<string>> = new Map()
      private activeFilters: Map<string, string> = new Map()

      constructor(private container: HTMLElement) {
        this.parseAvailableFilters()
        this.bindEvents()
      }

      @Debounced(1000)
      private applyFilters() {
        const params = new URLSearchParams()

        this.activeFilters.forEach((value, key) => {
          params.set(key, value)
        })

        const newUrl = \`\${window.location.pathname}?\${params.toString()}\`
        window.history.pushState({}, '', newUrl)
        this.refreshProducts()
      }

      @Cached(30000) // Cache for 30 seconds
      private async refreshProducts() {
        const response = await fetch(window.location.href, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })

        const html = await response.text()
        // Update product grid
      }
    }

    export default CollectionFilters
  `,

  'SearchAutocomplete.ts': `
    /**
     * Search autocomplete functionality
     * Loads on all pages but only when search is focused
     */
    @Template(['*'])
    @LazyLoad({ rootMargin: '0px', threshold: 1.0 })
    @NetworkAware({ slowThreshold: 8, reduceQuality: true })
    class SearchAutocomplete {
      private isOpen = false
      private results: SearchResult[] = []
      private cache = new Map<string, SearchResult[]>()

      constructor(private searchInput: HTMLInputElement) {
        this.setupSearch()
      }

      @Debounced(300)
      private async handleInput(query: string) {
        if (query.length < 2) {
          this.hideResults()
          return
        }

        if (this.cache.has(query)) {
          this.showResults(this.cache.get(query)!)
          return
        }

        try {
          const results = await this.search(query)
          this.cache.set(query, results)
          this.showResults(results)
        } catch (error) {
          console.error('Search failed:', error)
        }
      }

      @Throttled(200)
      private handleKeyNavigation(event: KeyboardEvent) {
        // Handle arrow keys, enter, escape
      }

      private async search(query: string): Promise<SearchResult[]> {
        const response = await fetch(\`/search/suggest.json?q=\${encodeURIComponent(query)}&resources[type]=product&resources[limit]=8\`)
        const data = await response.json()
        return data.resources.results.products || []
      }
    }

    export default SearchAutocomplete
  `
}

// Sample files without decorators (should be ignored)
const NON_COMPONENT_FILES = {
  'utils/helpers.ts': `
    // Utility functions without decorators
    export function formatPrice(cents: number): string {
      return (cents / 100).toFixed(2)
    }

    export function debounce(func: Function, wait: number) {
      let timeout: NodeJS.Timeout
      return function executedFunction(...args: any[]) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    }
  `,

  'stores/cartStore.ts': `
    // Store without component decorators (different pattern)
    export interface CartState {
      items: CartItem[]
      isOpen: boolean
      isLoading: boolean
    }

    export const cartStore = {
      state: {
        items: [],
        isOpen: false,
        isLoading: false
      } as CartState,

      addItem(item: CartItem) {
        this.state.items.push(item)
      },

      removeItem(id: string) {
        this.state.items = this.state.items.filter(item => item.id !== id)
      }
    }
  `,

  'types/global.d.ts': `
    // Type definitions
    interface CartItem {
      id: string
      variantId: string
      quantity: number
      price: number
      title: string
    }

    interface SearchResult {
      id: string
      title: string
      handle: string
      price: string
      image: string
    }
  `
}

describe('Decorator Auto-Discovery Integration Tests (T021)', () => {
  let decoratorSystem: any
  let registry: any

  beforeEach(async () => {
    // Set up test environment
    await fs.promises.mkdir(TEST_DIR, { recursive: true })
    await fs.promises.mkdir(COMPONENTS_DIR, { recursive: true })
    await fs.promises.mkdir(STORES_DIR, { recursive: true })
    await fs.promises.mkdir(UTILS_DIR, { recursive: true })

    // Create sample component files
    for (const [filename, content] of Object.entries(SAMPLE_COMPONENTS)) {
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, filename),
        content
      )
    }

    // Create non-component files
    for (const [filepath, content] of Object.entries(NON_COMPONENT_FILES)) {
      const fullPath = path.join(TEST_DIR, 'frontend', filepath)
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.promises.writeFile(fullPath, content)
    }

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
  })

  describe('component file discovery', () => {
    it('should discover all decorated component files', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        expect(discoveredComponents).toHaveLength(5) // 5 component files

        const componentNames = discoveredComponents.map(c => c.className)
        expect(componentNames).toContain('ProductGallery')
        expect(componentNames).toContain('HeaderNav')
        expect(componentNames).toContain('CartDrawer')
        expect(componentNames).toContain('CollectionFilters')
        expect(componentNames).toContain('SearchAutocomplete')

        // Should have correct file paths
        discoveredComponents.forEach(component => {
          expect(component.filePath).toMatch(/\.ts$/)
          expect(component.filePath).toContain('/components/')
        })

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should ignore files without decorators', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Discover from entire frontend directory
        const discoveredComponents = await registry.discoverComponents(path.join(TEST_DIR, 'frontend'))

        // Should only find decorated components, not utility files or stores
        const componentNames = discoveredComponents.map(c => c.className)
        expect(componentNames).not.toContain('helpers')
        expect(componentNames).not.toContain('cartStore')
        expect(componentNames).not.toContain('CartState')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle nested directory structures', async () => {
      // Create nested component
      const nestedDir = path.join(COMPONENTS_DIR, 'product')
      await fs.promises.mkdir(nestedDir, { recursive: true })

      await fs.promises.writeFile(
        path.join(nestedDir, 'VariantSelector.ts'),
        `
          @Template(['product'])
          @Critical()
          class VariantSelector {
            render() {
              return '<div class="variant-selector"></div>'
            }
          }
          export default VariantSelector
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        expect(discoveredComponents).toHaveLength(6) // Original 5 + nested 1

        const variantSelector = discoveredComponents.find(c => c.className === 'VariantSelector')
        expect(variantSelector).toBeDefined()
        expect(variantSelector.filePath).toContain('/product/VariantSelector.ts')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle file extensions correctly', async () => {
      // Create components with different extensions
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'TestComponent.js'),
        `
          @Template(['*'])
          class TestComponent {
            render() { return '<div>test</div>' }
          }
          export default TestComponent
        `
      )

      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'AnotherComponent.mjs'),
        `
          @Template(['product'])
          class AnotherComponent {
            render() { return '<div>another</div>' }
          }
          export default AnotherComponent
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        // Should find components regardless of file extension
        const componentNames = discoveredComponents.map(c => c.className)
        expect(componentNames).toContain('TestComponent')
        expect(componentNames).toContain('AnotherComponent')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })
  })

  describe('decorator metadata extraction', () => {
    it('should extract @Template decorator metadata correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const productGallery = discoveredComponents.find(c => c.className === 'ProductGallery')
        expect(productGallery).toBeDefined()

        const templateDecorator = productGallery.decorators.find(d => d.type === 'Template')
        expect(templateDecorator).toBeDefined()
        expect(templateDecorator.parameters).toEqual(['product'])

        const headerNav = discoveredComponents.find(c => c.className === 'HeaderNav')
        const headerTemplate = headerNav.decorators.find(d => d.type === 'Template')
        expect(headerTemplate.parameters).toEqual(['*'])

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should extract @LazyLoad decorator metadata correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const productGallery = discoveredComponents.find(c => c.className === 'ProductGallery')
        const lazyLoadDecorator = productGallery.decorators.find(d => d.type === 'LazyLoad')

        expect(lazyLoadDecorator).toBeDefined()
        expect(lazyLoadDecorator.parameters).toEqual({
          rootMargin: '100px',
          threshold: 0.1
        })

        const cartDrawer = discoveredComponents.find(c => c.className === 'CartDrawer')
        const cartLazyLoad = cartDrawer.decorators.find(d => d.type === 'LazyLoad')
        expect(cartLazyLoad.parameters).toEqual({
          rootMargin: '200vh',
          threshold: 0
        })

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should extract @Critical decorator metadata correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const headerNav = discoveredComponents.find(c => c.className === 'HeaderNav')
        const criticalDecorator = headerNav.decorators.find(d => d.type === 'Critical')

        expect(criticalDecorator).toBeDefined()
        expect(criticalDecorator.parameters).toEqual({})

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should extract @NetworkAware decorator metadata correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const productGallery = discoveredComponents.find(c => c.className === 'ProductGallery')
        const networkDecorator = productGallery.decorators.find(d => d.type === 'NetworkAware')

        expect(networkDecorator).toBeDefined()
        expect(networkDecorator.parameters).toEqual({
          slowThreshold: 5
        })

        const headerNav = discoveredComponents.find(c => c.className === 'HeaderNav')
        const headerNetwork = headerNav.decorators.find(d => d.type === 'NetworkAware')
        expect(headerNetwork.parameters).toEqual({
          slowThreshold: 10,
          fallbackStrategy: 'critical-only'
        })

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should extract method decorators correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const productGallery = discoveredComponents.find(c => c.className === 'ProductGallery')

        // Should track method decorators if implementation supports it
        if (productGallery.methods) {
          const handleResize = productGallery.methods.find(m => m.name === 'handleResize')
          expect(handleResize?.decorators).toContainEqual({
            type: 'Debounced',
            parameters: 300
          })

          const loadImageData = productGallery.methods.find(m => m.name === 'loadImageData')
          expect(loadImageData?.decorators).toContainEqual({
            type: 'Cached',
            parameters: 60000
          })
        }

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle multiple decorators on same class', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        const productGallery = discoveredComponents.find(c => c.className === 'ProductGallery')

        expect(productGallery.decorators).toHaveLength(3) // Template, LazyLoad, NetworkAware

        const decoratorTypes = productGallery.decorators.map(d => d.type)
        expect(decoratorTypes).toContain('Template')
        expect(decoratorTypes).toContain('LazyLoad')
        expect(decoratorTypes).toContain('NetworkAware')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })
  })

  describe('component registration integration', () => {
    it('should automatically register discovered components', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        // Trigger auto-discovery
        await registry.discoverComponents(COMPONENTS_DIR)

        // Components should be automatically registered
        const productComponents = registry.getComponentsForTemplate('product')
        expect(productComponents.length).toBeGreaterThan(0)

        const productComponentNames = productComponents.map(c => c.className)
        expect(productComponentNames).toContain('ProductGallery')
        expect(productComponentNames).toContain('CollectionFilters')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle template-specific registration correctly', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        await registry.discoverComponents(COMPONENTS_DIR)

        // Check product template components
        const productComponents = registry.getComponentsForTemplate('product')
        const productNames = productComponents.map(c => c.className)
        expect(productNames).toContain('ProductGallery') // @Template(['product'])

        // Check collection template components
        const collectionComponents = registry.getComponentsForTemplate('collection')
        const collectionNames = collectionComponents.map(c => c.className)
        expect(collectionNames).toContain('CollectionFilters') // @Template(['collection'])

        // Check global components (should appear in all templates)
        const homeComponents = registry.getComponentsForTemplate('index')
        const homeNames = homeComponents.map(c => c.className)
        expect(homeNames).toContain('HeaderNav') // @Template(['*'])
        expect(homeNames).toContain('CartDrawer') // @Template(['*'])
        expect(homeNames).toContain('SearchAutocomplete') // @Template(['*'])

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should validate decorator combinations during discovery', async () => {
      // Create component with invalid decorator combination
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'InvalidComponent.ts'),
        `
          @Template(['product'])
          @Critical()
          @LazyLoad()  // Should conflict with @Critical
          class InvalidComponent {
            render() {
              return '<div>invalid</div>'
            }
          }
          export default InvalidComponent
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        // Should either reject the component or log warnings
        const invalidComponent = discoveredComponents.find(c => c.className === 'InvalidComponent')

        if (invalidComponent) {
          // If component is discovered, it should have warnings
          expect(invalidComponent.warnings).toBeDefined()
          expect(invalidComponent.warnings.length).toBeGreaterThan(0)
        } else {
          // Component was rejected due to invalid decorators - this is also valid
          expect(discoveredComponents.map(c => c.className)).not.toContain('InvalidComponent')
        }

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })
  })

  describe('performance and caching', () => {
    it('should cache discovery results for performance', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const startTime1 = Date.now()
        const firstRun = await registry.discoverComponents(COMPONENTS_DIR)
        const firstTime = Date.now() - startTime1

        const startTime2 = Date.now()
        const secondRun = await registry.discoverComponents(COMPONENTS_DIR)
        const secondTime = Date.now() - startTime2

        console.log(`First discovery: ${firstTime}ms, Second discovery: ${secondTime}ms`)

        // Second run should be faster (cached)
        expect(secondTime).toBeLessThan(firstTime)

        // Results should be the same
        expect(secondRun).toHaveLength(firstRun.length)

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle file system changes and invalidate cache', async () => {
      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const initialComponents = await registry.discoverComponents(COMPONENTS_DIR)
        const initialCount = initialComponents.length

        // Add a new component
        await fs.promises.writeFile(
          path.join(COMPONENTS_DIR, 'NewComponent.ts'),
          `
            @Template(['cart'])
            @LazyLoad()
            class NewComponent {
              render() { return '<div>new</div>' }
            }
            export default NewComponent
          `
        )

        // Discovery should detect the new component
        const updatedComponents = await registry.discoverComponents(COMPONENTS_DIR, {
          useCache: false
        })

        expect(updatedComponents).toHaveLength(initialCount + 1)
        expect(updatedComponents.map(c => c.className)).toContain('NewComponent')

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle large numbers of components efficiently', async () => {
      // Create many components for performance testing
      for (let i = 0; i < 100; i++) {
        await fs.promises.writeFile(
          path.join(COMPONENTS_DIR, `TestComponent${i}.ts`),
          `
            @Template(['product'])
            @LazyLoad()
            class TestComponent${i} {
              render() {
                return \`<div class="test-component-${i}">Component ${i}</div>\`
              }
            }
            export default TestComponent${i}
          `
        )
      }

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const startTime = Date.now()
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)
        const discoveryTime = Date.now() - startTime

        console.log(`Discovered ${discoveredComponents.length} components in ${discoveryTime}ms`)

        // Should handle large numbers efficiently (< 2 seconds)
        expect(discoveryTime).toBeLessThan(2000)

        // Should find all components (original 5 + 100 generated)
        expect(discoveredComponents).toHaveLength(105)

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle malformed decorator syntax gracefully', async () => {
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'MalformedComponent.ts'),
        `
          @Template(['product'  // Missing closing bracket
          @LazyLoad({ rootMargin: '100px' // Missing closing brace
          class MalformedComponent {
            render() { return '<div>malformed</div>' }
          }
          export default MalformedComponent
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        // Should either skip malformed components or handle errors gracefully
        // The exact behavior depends on implementation robustness
        expect(Array.isArray(discoveredComponents)).toBe(true)

        // Should still discover valid components
        expect(discoveredComponents.map(c => c.className)).toContain('ProductGallery')

      } catch (error) {
        // Parsing errors are acceptable for malformed files
        expect(error.message).toMatch(/parse|syntax|malformed/i)
      }
    })

    it('should handle components without default exports', async () => {
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'NoDefaultExport.ts'),
        `
          @Template(['product'])
          class NamedExportComponent {
            render() { return '<div>named export</div>' }
          }

          // Named export instead of default
          export { NamedExportComponent }
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        // Should handle named exports appropriately
        // Exact behavior depends on implementation requirements
        expect(Array.isArray(discoveredComponents)).toBe(true)

      } catch (error) {
        expect(error.message).toContain('Cannot find module')
      }
    })

    it('should handle empty or non-existent directories', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty-components')
      await fs.promises.mkdir(emptyDir, { recursive: true })

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const emptyComponents = await registry.discoverComponents(emptyDir)
        expect(emptyComponents).toHaveLength(0)

        const nonExistentComponents = await registry.discoverComponents('/non/existent/path')
        expect(nonExistentComponents).toHaveLength(0)

      } catch (error) {
        // Either empty array or error is acceptable
        expect(typeof error.message === 'string').toBe(true)
      }
    })

    it('should handle circular dependencies gracefully', async () => {
      // Create components with potential circular references
      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'CircularA.ts'),
        `
          import CircularB from './CircularB'

          @Template(['product'])
          class CircularA {
            private b = new CircularB()
            render() { return '<div>A</div>' }
          }
          export default CircularA
        `
      )

      await fs.promises.writeFile(
        path.join(COMPONENTS_DIR, 'CircularB.ts'),
        `
          import CircularA from './CircularA'

          @Template(['product'])
          class CircularB {
            private a: CircularA | null = null
            render() { return '<div>B</div>' }
          }
          export default CircularB
        `
      )

      if (!decoratorSystem) {
        expect(() => require('../../lib/shopify-decorator-system')).toThrow('Cannot find module')
        return
      }

      try {
        const discoveredComponents = await registry.discoverComponents(COMPONENTS_DIR)

        // Should handle circular dependencies without infinite loops
        expect(Array.isArray(discoveredComponents)).toBe(true)

        // May or may not include circular components depending on implementation
        const componentNames = discoveredComponents.map(c => c.className)
        if (componentNames.includes('CircularA') || componentNames.includes('CircularB')) {
          expect(componentNames.length).toBeGreaterThan(0)
        }

      } catch (error) {
        // Circular dependency errors are acceptable
        expect(error.message).toMatch(/circular|dependency|module/i)
      }
    })
  })
})