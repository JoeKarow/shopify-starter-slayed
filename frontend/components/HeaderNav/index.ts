/**
 * HeaderNav Component
 *
 * Critical navigation component that loads immediately on all pages.
 * Handles main navigation, mobile menu, search toggle, and cart interactions.
 *
 * Uses @Critical decorator to ensure immediate loading for above-the-fold content.
 * This component is essential for user interaction and should never be lazy-loaded.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { Critical } from '@lib/shopify-decorator-system/index.js'

export interface HeaderNavOptions {
  mobileBreakpoint?: number
  searchSelector?: string
  cartSelector?: string
  menuToggleSelector?: string
  mobileMenuSelector?: string
  stickyOffset?: number
  enableScrollHiding?: boolean
}

/**
 * Header Navigation Component
 *
 * Critical component that handles main site navigation, mobile menu interactions,
 * sticky header behavior, and integration with cart and search functionality.
 */
@Critical()
export class HeaderNav {
  private header: HTMLElement | null = null
  private nav: HTMLElement | null = null
  private menuToggle: HTMLElement | null = null
  private mobileMenu: HTMLElement | null = null
  private searchToggle: HTMLElement | null = null
  private cartToggle: HTMLElement | null = null
  private isMenuOpen: boolean = false
  private isSticky: boolean = false
  private lastScrollY: number = 0
  private options: HeaderNavOptions
  private resizeObserver: ResizeObserver | null = null
  private mediaQuery: MediaQueryList | null = null

  constructor(options: HeaderNavOptions = {}) {
    this.options = {
      mobileBreakpoint: 768,
      searchSelector: '[data-search-toggle]',
      cartSelector: '[data-cart-toggle]',
      menuToggleSelector: '[data-menu-toggle]',
      mobileMenuSelector: '[data-mobile-menu]',
      stickyOffset: 100,
      enableScrollHiding: true,
      ...options
    }

    // Initialize immediately since this is critical
    this.init()
  }

  /**
   * Initialize the header navigation
   */
  private init(): void {
    this.findElements()
    this.bindEvents()
    this.setupMediaQueries()
    this.setupAccessibility()
    this.initStickyBehavior()

    // Emit initialization event
    this.dispatchEvent('headerNav:initialized', {
      hasSearch: !!this.searchToggle,
      hasCart: !!this.cartToggle,
      isMobile: this.isMobile()
    })
  }

  /**
   * Find and cache DOM elements
   */
  private findElements(): void {
    this.header = document.querySelector('header') || document.querySelector('[data-header]')
    this.nav = document.querySelector('nav') || this.header?.querySelector('nav') || null
    this.menuToggle = document.querySelector(this.options.menuToggleSelector || '[data-menu-toggle]')
    this.mobileMenu = document.querySelector(this.options.mobileMenuSelector || '[data-mobile-menu]')
    this.searchToggle = document.querySelector(this.options.searchSelector || '[data-search-toggle]')
    this.cartToggle = document.querySelector(this.options.cartSelector || '[data-cart-toggle]')

    if (!this.header) {
      console.warn('HeaderNav: Header element not found')
      return
    }
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    // Mobile menu toggle
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleMobileMenu()
      })
    }

    // Search toggle
    if (this.searchToggle) {
      this.searchToggle.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleSearch()
      })
    }

    // Cart toggle
    if (this.cartToggle) {
      this.cartToggle.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleCart()
      })
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e))

    // Scroll behavior
    if (this.options.enableScrollHiding) {
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true })
    }

    // Outside click to close mobile menu
    document.addEventListener('click', (e) => this.handleOutsideClick(e))

    // Window resize
    window.addEventListener('resize', () => this.handleResize())
  }

  /**
   * Setup media query listeners
   */
  private setupMediaQueries(): void {
    if (!window.matchMedia) return

    this.mediaQuery = window.matchMedia(`(max-width: ${this.options.mobileBreakpoint}px)`)

    // Use the modern syntax if available
    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', (e) => this.handleMediaChange(e))
    } else {
      // Fallback for older browsers
      this.mediaQuery.addListener((e) => this.handleMediaChange(e))
    }

    // Initial check
    this.handleMediaChange(this.mediaQuery)
  }

  /**
   * Setup accessibility attributes
   */
  private setupAccessibility(): void {
    if (this.menuToggle) {
      this.menuToggle.setAttribute('aria-label', 'Toggle navigation menu')
      this.menuToggle.setAttribute('aria-expanded', 'false')
      this.menuToggle.setAttribute('aria-controls', 'mobile-menu')
    }

    if (this.mobileMenu) {
      this.mobileMenu.setAttribute('id', 'mobile-menu')
      this.mobileMenu.setAttribute('aria-hidden', 'true')
    }

    if (this.searchToggle) {
      this.searchToggle.setAttribute('aria-label', 'Toggle search')
    }

    if (this.cartToggle) {
      this.cartToggle.setAttribute('aria-label', 'Open shopping cart')
    }

    // Add focus management for navigation links
    this.setupFocusManagement()
  }

  /**
   * Setup focus management for keyboard navigation
   */
  private setupFocusManagement(): void {
    const navLinks = this.nav?.querySelectorAll('a, button')
    if (!navLinks) return

    navLinks.forEach((link, index) => {
      link.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'ArrowRight' || keyEvent.key === 'ArrowDown') {
          keyEvent.preventDefault()
          const nextIndex = (index + 1) % navLinks.length
          ;(navLinks[nextIndex] as HTMLElement).focus()
        } else if (keyEvent.key === 'ArrowLeft' || keyEvent.key === 'ArrowUp') {
          keyEvent.preventDefault()
          const prevIndex = index === 0 ? navLinks.length - 1 : index - 1
          ;(navLinks[prevIndex] as HTMLElement).focus()
        }
      })
    })
  }

  /**
   * Initialize sticky header behavior
   */
  private initStickyBehavior(): void {
    if (!this.header) return

    // Add initial sticky class if needed
    this.updateStickyState()

    // Setup resize observer for dynamic header height
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateHeaderHeight()
      })
      this.resizeObserver.observe(this.header)
    }
  }

  /**
   * Toggle mobile menu
   */
  private toggleMobileMenu(): void {
    this.isMenuOpen = !this.isMenuOpen
    this.updateMobileMenuState()
  }

  /**
   * Update mobile menu state
   */
  private updateMobileMenuState(): void {
    if (!this.mobileMenu || !this.menuToggle) return

    this.mobileMenu.classList.toggle('open', this.isMenuOpen)
    this.menuToggle.classList.toggle('active', this.isMenuOpen)

    // Update ARIA attributes
    this.menuToggle.setAttribute('aria-expanded', this.isMenuOpen ? 'true' : 'false')
    this.mobileMenu.setAttribute('aria-hidden', this.isMenuOpen ? 'false' : 'true')

    // Manage body scroll
    document.body.classList.toggle('mobile-menu-open', this.isMenuOpen)

    // Focus management
    if (this.isMenuOpen) {
      this.focusFirstMenuItem()
    } else {
      this.menuToggle.focus()
    }

    // Emit event
    this.dispatchEvent('headerNav:mobileMenuToggled', {
      isOpen: this.isMenuOpen
    })
  }

  /**
   * Focus first menu item when mobile menu opens
   */
  private focusFirstMenuItem(): void {
    if (!this.mobileMenu) return

    const firstFocusable = this.mobileMenu.querySelector('a, button, [tabindex]:not([tabindex="-1"])')
    if (firstFocusable) {
      ;(firstFocusable as HTMLElement).focus()
    }
  }

  /**
   * Close mobile menu
   */
  public closeMobileMenu(): void {
    if (this.isMenuOpen) {
      this.isMenuOpen = false
      this.updateMobileMenuState()
    }
  }

  /**
   * Toggle search
   */
  private toggleSearch(): void {
    this.dispatchEvent('headerNav:searchToggled', {
      timestamp: Date.now()
    })

    // If there's a search modal or drawer, trigger it
    const searchModal = document.querySelector('[data-search-modal]')
    if (searchModal) {
      searchModal.classList.toggle('open')
    }
  }

  /**
   * Toggle cart
   */
  private toggleCart(): void {
    this.dispatchEvent('headerNav:cartToggled', {
      timestamp: Date.now()
    })

    // If there's a cart drawer, trigger it
    const cartDrawer = document.querySelector('[data-cart-drawer]')
    if (cartDrawer) {
      cartDrawer.classList.toggle('open')
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    // Close mobile menu with Escape
    if (e.key === 'Escape' && this.isMenuOpen) {
      this.closeMobileMenu()
    }

    // Quick access keys
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'k': // Cmd/Ctrl + K for search
          if (this.searchToggle) {
            e.preventDefault()
            this.toggleSearch()
          }
          break
      }
    }
  }

  /**
   * Handle scroll events
   */
  private handleScroll(): void {
    const currentScrollY = window.scrollY

    // Update sticky state
    this.updateStickyState()

    // Hide/show header based on scroll direction
    if (this.options.enableScrollHiding && this.header) {
      const scrollDiff = currentScrollY - this.lastScrollY

      if (scrollDiff > 10 && currentScrollY > 100) {
        // Scrolling down - hide header
        this.header.classList.add('header-hidden')
      } else if (scrollDiff < -10) {
        // Scrolling up - show header
        this.header.classList.remove('header-hidden')
      }
    }

    this.lastScrollY = currentScrollY
  }

  /**
   * Update sticky header state
   */
  private updateStickyState(): void {
    if (!this.header) return

    const shouldBeSticky = window.scrollY > (this.options.stickyOffset || 100)

    if (shouldBeSticky !== this.isSticky) {
      this.isSticky = shouldBeSticky
      this.header.classList.toggle('sticky', this.isSticky)

      this.dispatchEvent('headerNav:stickyStateChanged', {
        isSticky: this.isSticky,
        scrollY: window.scrollY
      })
    }
  }

  /**
   * Update header height CSS custom property
   */
  private updateHeaderHeight(): void {
    if (!this.header) return

    const height = this.header.offsetHeight
    document.documentElement.style.setProperty('--header-height', `${height}px`)
  }

  /**
   * Handle outside click to close mobile menu
   */
  private handleOutsideClick(e: Event): void {
    if (!this.isMenuOpen || !this.mobileMenu) return

    const target = e.target as Node
    if (!this.header?.contains(target)) {
      this.closeMobileMenu()
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    // Close mobile menu on resize to desktop
    if (!this.isMobile() && this.isMenuOpen) {
      this.closeMobileMenu()
    }

    this.updateHeaderHeight()
  }

  /**
   * Handle media query changes
   */
  private handleMediaChange(mq: MediaQueryListEvent | MediaQueryList): void {
    const isMobile = mq.matches

    // Close mobile menu when switching to desktop
    if (!isMobile && this.isMenuOpen) {
      this.closeMobileMenu()
    }

    this.dispatchEvent('headerNav:breakpointChanged', {
      isMobile,
      breakpoint: this.options.mobileBreakpoint
    })
  }

  /**
   * Check if currently in mobile view
   */
  private isMobile(): boolean {
    return window.innerWidth <= (this.options.mobileBreakpoint || 768)
  }

  /**
   * Get current navigation state
   */
  public getState(): {
    isMenuOpen: boolean
    isSticky: boolean
    isMobile: boolean
    scrollY: number
  } {
    return {
      isMenuOpen: this.isMenuOpen,
      isSticky: this.isSticky,
      isMobile: this.isMobile(),
      scrollY: window.scrollY
    }
  }

  /**
   * Programmatically open mobile menu
   */
  public openMobileMenu(): void {
    if (!this.isMenuOpen) {
      this.toggleMobileMenu()
    }
  }

  /**
   * Update cart count (called by cart system)
   */
  public updateCartCount(count: number): void {
    if (!this.cartToggle) return

    const countElement = this.cartToggle.querySelector('[data-cart-count]')
    if (countElement) {
      countElement.textContent = count.toString()
      countElement.classList.toggle('has-items', count > 0)
    }

    // Update ARIA label
    this.cartToggle.setAttribute('aria-label', `Shopping cart with ${count} items`)
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
    this.header?.dispatchEvent(event)
  }

  /**
   * Clean up event listeners and observers
   */
  public destroy(): void {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // Clean up media query listener
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', (e) => this.handleMediaChange(e))
      } else {
        // Fallback for older browsers
        this.mediaQuery.removeListener((e) => this.handleMediaChange(e))
      }
    }

    // Remove global event listeners
    document.removeEventListener('keydown', (e) => this.handleKeydown(e))
    document.removeEventListener('click', (e) => this.handleOutsideClick(e))
    window.removeEventListener('scroll', () => this.handleScroll())
    window.removeEventListener('resize', () => this.handleResize())

    // Emit destroy event
    this.dispatchEvent('headerNav:destroyed', {
      timestamp: Date.now()
    })
  }
}