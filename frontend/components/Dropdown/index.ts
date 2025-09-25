/**
 * Dropdown Component
 *
 * A reusable dropdown component migrated from Alpine.js to TypeScript decorators.
 * Maintains all Alpine.js functionality while adding performance optimizations.
 *
 * Uses @Template decorator to load on specific templates where dropdowns are needed.
 * Originally used in product pages for variant selection.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { Template, LazyLoad } from '@lib/shopify-decorator-system/index.js'

export interface DropdownOptions {
  triggerSelector?: string
  contentSelector?: string
  autoClose?: boolean
  closeOnOutsideClick?: boolean
  animationDuration?: number
}

/**
 * Dropdown Component
 *
 * Provides dropdown functionality with keyboard navigation, accessibility support,
 * and customizable behavior. Compatible with existing Alpine.js markup patterns.
 */
@Template(['product', 'collection', 'cart'])
@LazyLoad({
  rootMargin: '50px',     // Load when close to viewport
  threshold: 0.1          // Load when 10% visible
})
export class Dropdown {
  private container: HTMLElement | null = null
  private trigger: HTMLElement | null = null
  private content: HTMLElement | null = null
  private options: DropdownOptions
  private isOpen: boolean = false
  private openChangeCallbacks: Array<(open: boolean) => void> = []

  // Alpine.js compatibility - expose data properties
  public open: boolean = false

  constructor(options: DropdownOptions = {}) {
    this.options = {
      triggerSelector: '[data-dropdown-trigger]',
      contentSelector: '[data-dropdown-content]',
      autoClose: true,
      closeOnOutsideClick: true,
      animationDuration: 300,
      ...options
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initComponent())
    } else {
      this.initComponent()
    }
  }

  /**
   * Initialize the dropdown component
   */
  private initComponent(): void {
    this.findElements()
    this.bindEvents()
    this.setupAccessibility()

    // Emit custom event for other components (Alpine.js compatibility)
    this.dispatchEvent('dropdown:initialized', {
      autoClose: this.options.autoClose
    })

    console.log('Slayed Dropdown Component Initialized.')
  }

  /**
   * Find and cache DOM elements
   */
  private findElements(): void {
    // Look for x-data="dropdown" elements for Alpine.js compatibility
    const alpineDropdowns = document.querySelectorAll('[x-data*="dropdown"]')

    if (alpineDropdowns.length > 0) {
      this.container = alpineDropdowns[0] as HTMLElement
      this.trigger = this.container.querySelector('[x-on\\:click*="toggle"], [\\@click*="toggle"]') as HTMLElement
      this.content = this.container.querySelector('[x-show*="open"]') as HTMLElement
    } else {
      // Fallback to data attribute selectors
      this.trigger = document.querySelector(this.options.triggerSelector || '[data-dropdown-trigger]')
      this.content = document.querySelector(this.options.contentSelector || '[data-dropdown-content]')
      this.container = this.trigger?.closest('[data-dropdown]') || this.trigger?.parentElement || null
    }

    if (!this.trigger || !this.content) {
      console.warn('Dropdown: Required elements not found (trigger and content required)')
      return
    }
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.trigger || !this.content) return

    // Trigger click event
    this.trigger.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggle()
    })

    // Keyboard navigation
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.toggle()
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })

    // Close on outside click
    if (this.options.closeOnOutsideClick) {
      document.addEventListener('click', (e) => {
        if (this.isOpen && this.container && !this.container.contains(e.target as Node)) {
          this.close()
        }
      })
    }

    // Close on escape key (global)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })

    // Handle focus management
    if (this.content) {
      this.content.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          this.handleTabNavigation(e)
        }
      })
    }
  }

  /**
   * Setup accessibility attributes
   */
  private setupAccessibility(): void {
    if (!this.trigger || !this.content) return

    // Generate unique IDs if not present
    const triggerId = this.trigger.id || `dropdown-trigger-${Math.random().toString(36).substr(2, 9)}`
    const contentId = this.content.id || `dropdown-content-${Math.random().toString(36).substr(2, 9)}`

    this.trigger.id = triggerId
    this.content.id = contentId

    // ARIA attributes
    this.trigger.setAttribute('aria-haspopup', 'true')
    this.trigger.setAttribute('aria-expanded', 'false')
    this.trigger.setAttribute('aria-controls', contentId)

    this.content.setAttribute('role', 'menu')
    this.content.setAttribute('aria-labelledby', triggerId)
    this.content.setAttribute('tabindex', '-1')

    // Ensure trigger is focusable
    if (!this.trigger.hasAttribute('tabindex')) {
      this.trigger.setAttribute('tabindex', '0')
    }
  }

  /**
   * Toggle dropdown state (Alpine.js compatibility method)
   */
  public toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.openDropdown()
    }
  }

  /**
   * Open dropdown (Alpine.js compatibility method name conflict resolved)
   */
  public openDropdown(): void {
    if (this.isOpen || !this.content) return

    this.isOpen = true
    this.open = true // Alpine.js compatibility

    // Update ARIA
    this.trigger?.setAttribute('aria-expanded', 'true')

    // Show content with animation
    this.content.style.display = 'block'
    this.content.classList.add('dropdown-opening')

    // Trigger reflow for animation
    this.content.offsetHeight

    this.content.classList.add('dropdown-open')
    this.content.classList.remove('dropdown-opening')

    // Focus management
    this.content.focus()

    // Auto close timer
    if (this.options.autoClose) {
      setTimeout(() => {
        if (this.isOpen) this.close()
      }, 5000) // Auto close after 5 seconds
    }

    // Notify callbacks
    this.notifyOpenChange(true)

    // Emit custom event
    this.dispatchEvent('dropdown:opened', {
      trigger: this.trigger,
      content: this.content
    })
  }

  /**
   * Close dropdown
   */
  public close(): void {
    if (!this.isOpen || !this.content) return

    this.isOpen = false
    this.open = false // Alpine.js compatibility

    // Update ARIA
    this.trigger?.setAttribute('aria-expanded', 'false')

    // Hide content with animation
    this.content.classList.remove('dropdown-open')
    this.content.classList.add('dropdown-closing')

    setTimeout(() => {
      if (this.content && !this.isOpen) {
        this.content.style.display = 'none'
        this.content.classList.remove('dropdown-closing')
      }
    }, this.options.animationDuration || 300)

    // Return focus to trigger
    this.trigger?.focus()

    // Notify callbacks
    this.notifyOpenChange(false)

    // Emit custom event
    this.dispatchEvent('dropdown:closed', {
      trigger: this.trigger,
      content: this.content
    })
  }

  /**
   * Handle tab navigation within dropdown
   */
  private handleTabNavigation(e: KeyboardEvent): void {
    if (!this.content) return

    const focusableElements = this.content.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }

  /**
   * Register callback for open state changes (Alpine.js compatibility)
   */
  public onOpenChange(callback: (open: boolean) => void): void {
    this.openChangeCallbacks.push(callback)
  }

  /**
   * Notify open change callbacks
   */
  private notifyOpenChange(open: boolean): void {
    this.openChangeCallbacks.forEach(callback => callback(open))
  }

  /**
   * Get current state
   */
  public getState(): { isOpen: boolean; trigger: HTMLElement | null; content: HTMLElement | null } {
    return {
      isOpen: this.isOpen,
      trigger: this.trigger,
      content: this.content
    }
  }

  /**
   * Set auto-close behavior
   */
  public setAutoClose(enabled: boolean): void {
    this.options.autoClose = enabled
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
    this.container?.dispatchEvent(event)
  }

  /**
   * Clean up event listeners (called automatically by decorator system)
   */
  public destroy(): void {
    // Close dropdown if open
    if (this.isOpen) {
      this.close()
    }

    // Clear callbacks
    this.openChangeCallbacks = []

    // Emit destroy event
    this.dispatchEvent('dropdown:destroyed', {
      trigger: this.trigger,
      content: this.content
    })
  }

  // Alpine.js compatibility - expose methods that Alpine components might use
  public init() {
    // Already handled in constructor, but available for Alpine.js compatibility
    this.initComponent()
    return this
  }
}

/**
 * Alpine.js Data Factory (for backward compatibility)
 *
 * This maintains compatibility with existing Alpine.js markup that uses:
 * x-data="dropdown"
 */
export function createAlpineDropdownData() {
  return {
    open: false,

    init() {
      console.log('Slayed Dropdown Component Initialized.')
    },

    toggle() {
      this.open = !this.open
    },

    close() {
      this.open = false
    },

    openDropdown() {
      this.open = true
    }
  }
}

// Register with Alpine.js if available
if (typeof window !== 'undefined' && (window as any).Alpine) {
  document.addEventListener('alpine:init', () => {
    (window as any).Alpine.data('dropdown', createAlpineDropdownData)
  })
}