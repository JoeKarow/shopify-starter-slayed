/**
 * Shopify Decorator System Usage Examples
 *
 * This file demonstrates how to use the TypeScript decorators for
 * performance-optimized component loading in Shopify themes.
 */

import {
  Template,
  LazyLoad,
  Critical,
  NetworkAware,
  Debounced,
  Cached
} from './index.js'

/**
 * Example 1: Critical component that loads immediately on all templates
 */
@Critical()
@Template(['*'])
class HeaderNavigation {
  private menuOpen = false

  constructor() {
    this.init()
  }

  private init() {
    console.log('HeaderNavigation initialized immediately (critical)')
  }

  @Debounced(300)
  toggleMenu() {
    this.menuOpen = !this.menuOpen
    console.log('Menu toggled:', this.menuOpen)
  }

  @Cached(30000) // Cache for 30 seconds
  getMenuItems() {
    console.log('Fetching menu items...')
    return ['Home', 'Products', 'About', 'Contact']
  }
}

/**
 * Example 2: Product gallery that lazy loads on product pages
 */
@Template(['product'])
@LazyLoad({
  rootMargin: '200px',
  threshold: 0.1,
  placeholder: 'skeleton-gallery'
})
class ProductGallery {
  private images: HTMLImageElement[] = []

  constructor() {
    console.log('ProductGallery initialized via lazy loading')
    this.loadImages()
  }

  @Debounced({ delay: 500, leading: false, trailing: true })
  private loadImages() {
    console.log('Loading product images...')
    // Image loading logic here
  }

  @Cached({ ttl: 60000, key: (productId) => `gallery-${productId}` })
  getProductImages(productId: string) {
    console.log(`Fetching images for product ${productId}`)
    return [`image1-${productId}.jpg`, `image2-${productId}.jpg`]
  }
}

/**
 * Example 3: Network-aware component that adapts to connection speed
 */
@Template(['product', 'collection'])
@NetworkAware({
  slowThreshold: 5, // 5 Mbps
  fallbackStrategy: 'defer',
  reduceQuality: true
})
class ProductRecommendations {
  private recommendations: any[] = []

  constructor() {
    console.log('ProductRecommendations initialized with network awareness')
    this.loadRecommendations()
  }

  @Debounced(1000)
  private loadRecommendations() {
    // Load recommendations based on network speed
    console.log('Loading product recommendations...')
  }

  @Cached(300000) // Cache for 5 minutes
  fetchRecommendations(productId: string, limit = 6) {
    console.log(`Fetching ${limit} recommendations for ${productId}`)
    return Array.from({ length: limit }, (_, i) => ({
      id: `rec-${productId}-${i}`,
      title: `Recommended Product ${i + 1}`
    }))
  }
}

/**
 * Example 4: Template-specific component for cart functionality
 */
@Template(['cart'])
@Critical() // Critical for cart page UX
class CartManager {
  private items: any[] = []

  constructor() {
    console.log('CartManager initialized for cart template')
    this.initializeCart()
  }

  private initializeCart() {
    this.loadCartItems()
    this.setupEventListeners()
  }

  @Debounced({ delay: 500, leading: true, trailing: false })
  updateQuantity(itemId: string, quantity: number) {
    console.log(`Updating item ${itemId} quantity to ${quantity}`)
    // Update cart item quantity
  }

  @Cached(10000) // Cache for 10 seconds
  calculateTotals() {
    console.log('Calculating cart totals...')
    return {
      subtotal: 99.99,
      tax: 8.99,
      shipping: 5.99,
      total: 114.97
    }
  }

  private loadCartItems() {
    // Load cart items from Shopify Cart API
  }

  private setupEventListeners() {
    // Setup quantity change, remove item listeners
  }
}

/**
 * Example 5: Global utility component with multiple decorators
 */
@Template(['*']) // Load on all templates
@LazyLoad({ rootMargin: '50vh', threshold: 0.05 })
@NetworkAware({ slowThreshold: 2, fallbackStrategy: 'simplify' })
class AnalyticsTracker {
  private events: any[] = []

  constructor() {
    console.log('AnalyticsTracker initialized')
    this.initialize()
  }

  private initialize() {
    // Setup analytics tracking
  }

  @Debounced(2000) // Batch events every 2 seconds
  trackEvent(event: string, data: any) {
    console.log('Tracking event:', event, data)
    this.events.push({ event, data, timestamp: Date.now() })
    this.sendEvents()
  }

  @Cached({ ttl: 5000, key: () => 'session-data' })
  getSessionData() {
    return {
      sessionId: 'sess-123',
      userId: 'user-456',
      pageViews: 5
    }
  }

  private sendEvents() {
    if (this.events.length > 0) {
      console.log('Sending batched events:', this.events)
      this.events = []
    }
  }
}

/**
 * Example 6: Search functionality for specific templates
 */
@Template(['search', 'collection'])
@LazyLoad({ rootMargin: '100px' })
@NetworkAware({ slowThreshold: 3, fallbackStrategy: 'defer' })
class SearchManager {
  private searchQuery = ''
  private results: any[] = []

  constructor() {
    console.log('SearchManager initialized for search/collection pages')
    this.setupSearch()
  }

  private setupSearch() {
    // Initialize search functionality
  }

  @Debounced({ delay: 300, trailing: true })
  performSearch(query: string) {
    console.log('Performing search for:', query)
    this.searchQuery = query
    return this.fetchResults(query)
  }

  @Cached({ ttl: 60000, key: (query) => `search-${query}` })
  private fetchResults(query: string) {
    console.log('Fetching search results for:', query)
    // Mock search results
    return Array.from({ length: 5 }, (_, i) => ({
      id: `result-${i}`,
      title: `Search Result ${i + 1} for "${query}"`
    }))
  }
}

/**
 * How to initialize the decorator system:
 *
 * import { discoverAndRegister, registry } from './lib/shopify-decorator-system'
 *
 * // Auto-discover and register all decorated components
 * await discoverAndRegister()
 *
 * // Initialize components for current template
 * const currentTemplate = document.body.className.match(/template-(\w+)/)?.[1] || 'index'
 * await registry.initializeForTemplate(currentTemplate)
 *
 * // Monitor network changes
 * onNetworkChange((status) => {
 *   console.log('Network status changed:', status)
 *   // Potentially re-evaluate loading strategies
 * })
 */