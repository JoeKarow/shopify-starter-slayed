/**
 * Global Store Component
 *
 * A global state management component migrated from Alpine.js store to TypeScript decorators.
 * Handles mobile menu visibility, cart state, scroll behavior, and promo bar controls.
 *
 * Uses @GlobalTemplate decorator to load on all templates.
 * Uses @Critical decorator for immediate availability as it manages core UI state.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { GlobalTemplate, Critical } from '@lib/shopify-decorator-system/index.js'

export interface GlobalStoreOptions {
  throttleDelay?: number
  promoBarScrollThreshold?: number
  mobileMenuCloseOnResize?: boolean
  enableScrollClasses?: boolean
}

/**
 * Global Store Component
 *
 * Manages global application state including mobile menu visibility,
 * cart drawer state, scroll behavior, and promo bar controls.
 * Integrates with Liquid Ajax Cart v2 for cart functionality.
 */
@GlobalTemplate()
@Critical()
export class GlobalStore {
  private options: GlobalStoreOptions
  private throttleTimer: number | null = null
  private cart: any = null

  // Alpine.js compatibility - expose data properties
  public isMobileMenuVisible: boolean = false
  public isMinicartVisible: boolean = false
  public isPredictiveSearchVisible: boolean = false
  public isPromoBarVisible: boolean = true
  public isWindowScrolled: boolean = false

  constructor(options: GlobalStoreOptions = {}) {
    this.options = {
      throttleDelay: 200,
      promoBarScrollThreshold: 100,
      mobileMenuCloseOnResize: true,
      enableScrollClasses: true,
      ...options
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  /**
   * Initialize the global store
   */
  public init(): void {
    this.bindScrollListener()
    this.bindResizeListener()
    this.initLiquidAjaxCart()
    this.setupKeyboardControls()

    // Apply initial body classes
    this.updateBodyClasses()

    // Emit custom event for other components
    this.dispatchEvent('globalStore:initialized', {
      state: this.getState()
    })

    console.log('Slayed Global Store Initialized.')
  }

  /**
   * Get body classes based on current state (Alpine.js compatibility)
   */
  public get bodyClasses(): string {
    const classes: string[] = []

    if (this.isMobileMenuVisible) {
      classes.push('mobile-menu-visible')
    }

    if (this.isMinicartVisible) {
      classes.push('minicart-visible')
    }

    if (this.isPredictiveSearchVisible) {
      classes.push('predictive-search-visible')
    }

    if (this.isWindowScrolled) {
      classes.push('scrolled')
    }

    if (!this.isPromoBarVisible) {
      classes.push('promo-bar-hidden')
    }

    return classes.join(' ')
  }

  /**
   * Open mobile menu
   */
  public openMobileMenu(): void {
    this.isMobileMenuVisible = true
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:mobileMenuOpened', {})
  }

  /**
   * Close mobile menu
   */
  public closeMobileMenu(): void {
    this.isMobileMenuVisible = false
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:mobileMenuClosed', {})
  }

  /**
   * Toggle mobile menu state
   */
  public toggleMobileMenu(): void {
    if (this.isMobileMenuVisible) {
      this.closeMobileMenu()
    } else {
      this.openMobileMenu()
    }
  }

  /**
   * Open minicart/cart drawer
   */
  public openMinicart(): void {
    this.isMinicartVisible = true
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:minicartOpened', {})
  }

  /**
   * Close minicart/cart drawer
   */
  public closeMinicart(): void {
    this.isMinicartVisible = false
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:minicartClosed', {})
  }

  /**
   * Toggle minicart state
   */
  public toggleMinicart(): void {
    if (this.isMinicartVisible) {
      this.closeMinicart()
    } else {
      this.openMinicart()
    }
  }

  /**
   * Open predictive search
   */
  public openPredictiveSearch(): void {
    this.isPredictiveSearchVisible = true
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:predictiveSearchOpened', {})
  }

  /**
   * Close predictive search
   */
  public closePredictiveSearch(): void {
    this.isPredictiveSearchVisible = false
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:predictiveSearchClosed', {})
  }

  /**
   * Toggle predictive search state
   */
  public togglePredictiveSearch(): void {
    if (this.isPredictiveSearchVisible) {
      this.closePredictiveSearch()
    } else {
      this.openPredictiveSearch()
    }
  }

  /**
   * Show promo bar
   */
  public showPromoBar(): void {
    this.isPromoBarVisible = true
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:promoBarShown', {})
  }

  /**
   * Hide promo bar
   */
  public hidePromoBar(): void {
    this.isPromoBarVisible = false
    this.updateBodyClasses()
    this.dispatchEvent('globalStore:promoBarHidden', {})
  }

  /**
   * Initialize Liquid Ajax Cart v2 integration
   */
  public initLiquidAjaxCart(): void {
    document.addEventListener("liquid-ajax-cart:request-end", (event: any) => {
      const { requestState, cart, previousCart, sections } = event.detail

      if (requestState.requestType === 'add') {
        if (requestState.responseData?.ok) {
          this.isMinicartVisible = true
          this.updateBodyClasses()
        }
      }

      this.cart = cart

      // Emit cart update event
      this.dispatchEvent('globalStore:cartUpdated', {
        cart,
        previousCart,
        requestState
      })
    })

    // Handle cart errors
    document.addEventListener("liquid-ajax-cart:request-error", (event: any) => {
      console.error('Cart request error:', event.detail)
      this.dispatchEvent('globalStore:cartError', event.detail)
    })
  }

  /**
   * Bind scroll event listener with throttling
   */
  private bindScrollListener(): void {
    if (!this.options.enableScrollClasses) return

    const handleScroll = () => {
      if (this.throttleTimer) return

      this.throttleTimer = window.setTimeout(() => {
        this.onWindowScrollHandler()
        this.throttleTimer = null
      }, this.options.throttleDelay)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  /**
   * Handle window scroll events
   */
  public onWindowScrollHandler(): void {
    const scrollY = window.scrollY
    const isScrolled = scrollY > 0

    // Hide promo bar when scrolling down more than threshold
    if (scrollY > (this.options.promoBarScrollThreshold || 100)) {
      this.isPromoBarVisible = false
    } else if (scrollY < 60) {
      this.isPromoBarVisible = true
    }

    // Update scroll state
    this.isWindowScrolled = isScrolled

    // Update body classes
    this.updateBodyClasses()

    // Emit scroll event
    this.dispatchEvent('globalStore:scroll', {
      scrollY,
      isScrolled,
      isPromoBarVisible: this.isPromoBarVisible
    })
  }

  /**
   * Bind window resize listener
   */
  private bindResizeListener(): void {
    if (!this.options.mobileMenuCloseOnResize) return

    let resizeTimer: number | null = null

    window.addEventListener('resize', () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }

      resizeTimer = window.setTimeout(() => {
        // Close mobile menu on desktop breakpoint
        if (window.innerWidth >= 768 && this.isMobileMenuVisible) {
          this.closeMobileMenu()
        }
        resizeTimer = null
      }, 250)
    })
  }

  /**
   * Setup keyboard controls for accessibility
   */
  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Escape key closes open overlays
      if (e.key === 'Escape') {
        if (this.isMobileMenuVisible) {
          this.closeMobileMenu()
        } else if (this.isMinicartVisible) {
          this.closeMinicart()
        } else if (this.isPredictiveSearchVisible) {
          this.closePredictiveSearch()
        }
      }
    })
  }

  /**
   * Update body classes based on current state
   */
  private updateBodyClasses(): void {
    const classes = this.bodyClasses.split(' ').filter(cls => cls.length > 0)

    // Remove existing classes
    document.body.classList.remove(
      'mobile-menu-visible',
      'minicart-visible',
      'predictive-search-visible',
      'scrolled',
      'promo-bar-hidden'
    )

    // Add current classes
    if (classes.length > 0) {
      document.body.classList.add(...classes)
    }

    // Legacy compatibility - maintain 'scrolled' class on body
    if (this.options.enableScrollClasses) {
      document.body.classList.toggle('scrolled', this.isWindowScrolled)
    }
  }

  /**
   * Open modal (Alpine.js compatibility)
   */
  public openModal(): void {
    document.dispatchEvent(new CustomEvent('show-modal'))
  }

  /**
   * Close all overlays
   */
  public closeAllOverlays(): void {
    this.closeMobileMenu()
    this.closeMinicart()
    this.closePredictiveSearch()
  }

  /**
   * Get current global state
   */
  public getState(): {
    isMobileMenuVisible: boolean
    isMinicartVisible: boolean
    isPredictiveSearchVisible: boolean
    isPromoBarVisible: boolean
    isWindowScrolled: boolean
    cart: any
  } {
    return {
      isMobileMenuVisible: this.isMobileMenuVisible,
      isMinicartVisible: this.isMinicartVisible,
      isPredictiveSearchVisible: this.isPredictiveSearchVisible,
      isPromoBarVisible: this.isPromoBarVisible,
      isWindowScrolled: this.isWindowScrolled,
      cart: this.cart
    }
  }

  /**
   * Update configuration
   */
  public updateOptions(newOptions: Partial<GlobalStoreOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)
  }

  /**
   * Clean up event listeners (called automatically by decorator system)
   */
  public destroy(): void {
    // Clear throttle timer
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer)
      this.throttleTimer = null
    }

    // Close all overlays
    this.closeAllOverlays()

    // Emit destroy event
    this.dispatchEvent('globalStore:destroyed', {
      finalState: this.getState()
    })
  }
}

/**
 * Alpine.js Data Factory (for backward compatibility)
 *
 * This maintains compatibility with existing Alpine.js markup that uses:
 * Alpine.store('global', ...)
 */
export function createAlpineGlobalStore() {
  return {
    isMobileMenuVisible: false,
    isMinicartVisible: false,
    isPredictiveSearchVisible: false,
    isPromoBarVisible: true,
    isWindowScrolled: false,
    cart: null,

    init() {
      console.log('Slayed Global Store Initialized.')

      // Use a helper for throttling
      const throttle = (func: Function, delay: number) => {
        let timeoutId: number
        let lastExecTime = 0
        return function (this: any, ...args: any[]) {
          const currentTime = Date.now()
          if (currentTime - lastExecTime > delay) {
            func.apply(this, args)
            lastExecTime = currentTime
          } else {
            clearTimeout(timeoutId)
            timeoutId = window.setTimeout(() => {
              func.apply(this, args)
              lastExecTime = Date.now()
            }, delay)
          }
        }
      }

      window.addEventListener('scroll', throttle(this.onWindowScrollHandler.bind(this), 200))
      this.initLiquidAjaxCart()
    },

    get bodyClasses() {
      let classes = []

      if (this.isMobileMenuVisible) {
        classes.push('mobile-menu-visible')
      }

      return classes.join(' ') || ''
    },

    openMobileMenu() {
      this.isMobileMenuVisible = true
    },

    closeMobileMenu() {
      this.isMobileMenuVisible = false
    },

    toggleMobileMenu() {
      this.isMobileMenuVisible = !this.isMobileMenuVisible
    },

    initLiquidAjaxCart() {
      document.addEventListener("liquid-ajax-cart:request-end", (event: any) => {
        const { requestState, cart, previousCart, sections } = event.detail

        if (requestState.requestType === 'add') {
          if (requestState.responseData?.ok) {
            this.isMinicartVisible = true
          }
        }

        this.cart = cart
      })
    },

    onWindowScrollHandler() {
      const isScrolled = window.scrollY > 0

      // Hide promo bar when scrolling down more than 100px
      if (window.scrollY > 100) {
        this.isPromoBarVisible = false
      } else if (window.scrollY < 60) {
        this.isPromoBarVisible = true
      }

      this.isWindowScrolled = isScrolled
      document.body.classList.toggle('scrolled', isScrolled)
    },

    openModal() {
      document.dispatchEvent(new CustomEvent('show-modal'))
    }
  }
}

// Register with Alpine.js if available
if (typeof window !== 'undefined' && (window as any).Alpine) {
  document.addEventListener('alpine:init', () => {
    (window as any).Alpine.store('global', createAlpineGlobalStore())
  })
}