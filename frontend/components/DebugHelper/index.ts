/**
 * Debug Helper Component
 *
 * A global debugging utility migrated from Alpine.js store to TypeScript decorators.
 * Provides accessibility debugging tools and keyboard navigation helpers.
 *
 * Uses @GlobalTemplate decorator to load on all templates for debugging.
 * Uses @Critical decorator for immediate availability during development.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { GlobalTemplate, Critical } from '@lib/shopify-decorator-system/index.js'

export interface DebugHelperOptions {
  enabled?: boolean
  logFocus?: boolean
  highlightFocusable?: boolean
  showOutlines?: boolean
  verboseMode?: boolean
}

/**
 * Debug Helper Component
 *
 * Provides debugging utilities for accessibility, focus management,
 * and keyboard navigation. Only enabled in development or when explicitly activated.
 */
@GlobalTemplate()
@Critical()
export class DebugHelper {
  private options: DebugHelperOptions
  private focusableElements: HTMLElement[] = []
  private isInitialized: boolean = false

  // Alpine.js compatibility - expose data properties
  public enabled: boolean = false

  constructor(options: DebugHelperOptions = {}) {
    this.options = {
      enabled: false,
      logFocus: true,
      highlightFocusable: false,
      showOutlines: false,
      verboseMode: false,
      ...options
    }

    this.enabled = this.options.enabled || false

    // Auto-enable in development
    if (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true')) {
      this.enabled = true
      this.options.enabled = true
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  /**
   * Initialize the debug helper
   */
  public init(): void {
    if (this.isInitialized) return

    this.isInitialized = true

    if (this.enabled) {
      this.initA11yDebugging()
      this.setupKeyboardShortcuts()
      this.logInitialization()
    }

    // Emit custom event for other components
    this.dispatchEvent('debugHelper:initialized', {
      enabled: this.enabled,
      options: this.options
    })

    console.log('Slayed Debug Helper Initialized.', { enabled: this.enabled })
  }

  /**
   * Initialize accessibility debugging
   */
  public initA11yDebugging(): void {
    if (!this.enabled) return

    this.focusableElements = this.getKeyboardFocusableElements()

    this.focusableElements.forEach((element) => {
      element.addEventListener('focus', (e) => {
        this.handleFocusEvent(e)
      })

      element.addEventListener('blur', (e) => {
        this.handleBlurEvent(e)
      })

      // Add visual indicators if enabled
      if (this.options.highlightFocusable) {
        element.style.outline = '2px dashed orange'
        element.style.outlineOffset = '2px'
      }
    })

    if (this.options.verboseMode) {
      console.log('Debug Helper: Found focusable elements:', this.focusableElements.length)
      console.table(this.focusableElements.map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        tabIndex: el.tabIndex
      })))
    }
  }

  /**
   * Handle focus events for debugging
   */
  private handleFocusEvent(e: Event): void {
    if (!this.options.logFocus) return

    const target = e.target as HTMLElement
    const info = {
      element: target,
      tagName: target.tagName,
      id: target.id || 'no-id',
      className: target.className || 'no-class',
      ariaLabel: target.getAttribute('aria-label') || 'no-aria-label',
      tabIndex: target.tabIndex,
      role: target.getAttribute('role') || 'no-role'
    }

    console.log('🎯 Focus:', info)

    // Visual feedback
    if (this.options.showOutlines) {
      target.style.outline = '3px solid lime'
      target.style.outlineOffset = '2px'
    }
  }

  /**
   * Handle blur events for cleanup
   */
  private handleBlurEvent(e: Event): void {
    if (!this.options.showOutlines) return

    const target = e.target as HTMLElement
    target.style.outline = ''
    target.style.outlineOffset = ''
  }

  /**
   * Get all keyboard focusable elements
   */
  public getKeyboardFocusableElements(element: Document | HTMLElement = document): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      'details',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'iframe',
    ].join(', ')

    const allElements = element.querySelectorAll(focusableSelectors) as NodeListOf<HTMLElement>

    return Array.from(allElements).filter(el =>
      !el.hasAttribute('disabled') &&
      !el.getAttribute('aria-hidden') &&
      el.offsetParent !== null // Exclude hidden elements
    )
  }

  /**
   * Setup keyboard shortcuts for debugging
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Alt + D = Toggle debug mode
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        this.toggleDebugMode()
      }

      // Alt + F = Show focusable elements
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        this.highlightFocusableElements()
      }

      // Alt + A = Run accessibility audit
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        this.runAccessibilityAudit()
      }

      // Alt + C = Clear console
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        console.clear()
        console.log('🧹 Console cleared by Debug Helper')
      }
    })
  }

  /**
   * Toggle debug mode on/off
   */
  public toggleDebugMode(): void {
    this.enabled = !this.enabled
    this.options.enabled = this.enabled

    if (this.enabled) {
      this.initA11yDebugging()
      console.log('🐛 Debug mode enabled')
    } else {
      this.clearDebugIndicators()
      console.log('🐛 Debug mode disabled')
    }

    // Emit toggle event
    this.dispatchEvent('debugHelper:toggled', {
      enabled: this.enabled
    })
  }

  /**
   * Clear all debug visual indicators
   */
  public clearDebugIndicators(): void {
    this.focusableElements.forEach(element => {
      element.style.outline = ''
      element.style.outlineOffset = ''
    })
  }

  /**
   * Temporarily highlight all focusable elements
   */
  public highlightFocusableElements(): void {
    const elements = this.getKeyboardFocusableElements()

    console.log(`🔍 Found ${elements.length} focusable elements`)

    elements.forEach((element, index) => {
      element.style.outline = '3px solid cyan'
      element.style.outlineOffset = '2px'
      element.setAttribute('data-debug-index', index.toString())

      // Add temporary label
      const label = document.createElement('div')
      label.textContent = `${index}`
      label.style.position = 'absolute'
      label.style.background = 'cyan'
      label.style.color = 'black'
      label.style.padding = '2px 6px'
      label.style.fontSize = '12px'
      label.style.fontWeight = 'bold'
      label.style.borderRadius = '3px'
      label.style.zIndex = '10000'
      label.style.pointerEvents = 'none'
      label.className = 'debug-helper-label'

      const rect = element.getBoundingClientRect()
      label.style.left = `${rect.left + window.scrollX}px`
      label.style.top = `${rect.top + window.scrollY - 20}px`

      document.body.appendChild(label)
    })

    // Clear after 5 seconds
    setTimeout(() => {
      elements.forEach(element => {
        element.style.outline = ''
        element.style.outlineOffset = ''
        element.removeAttribute('data-debug-index')
      })

      document.querySelectorAll('.debug-helper-label').forEach(label => {
        label.remove()
      })

      console.log('🔍 Focusable element highlights cleared')
    }, 5000)
  }

  /**
   * Run basic accessibility audit
   */
  public runAccessibilityAudit(): void {
    const issues: string[] = []
    const warnings: string[] = []

    // Check for missing alt text on images
    const images = document.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
        issues.push(`Image ${index + 1} missing alt text`)
      }
    })

    // Check for empty links
    const links = document.querySelectorAll('a')
    links.forEach((link, index) => {
      if (!link.textContent?.trim() && !link.getAttribute('aria-label') && !link.getAttribute('aria-labelledby')) {
        issues.push(`Link ${index + 1} has no accessible text`)
      }
    })

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button')
    buttons.forEach((button, index) => {
      if (!button.textContent?.trim() && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')) {
        issues.push(`Button ${index + 1} has no accessible name`)
      }
    })

    // Check for missing form labels
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach((input, index) => {
      const id = input.id
      if (id && !document.querySelector(`label[for="${id}"]`) && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        warnings.push(`Form control ${index + 1} may be missing a label`)
      }
    })

    // Check for headings hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    let previousLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      if (level > previousLevel + 1) {
        warnings.push(`Heading ${index + 1} skips from h${previousLevel} to h${level}`)
      }
      previousLevel = level
    })

    console.group('🔍 Accessibility Audit Results')
    console.log('Issues found:', issues.length)
    console.log('Warnings:', warnings.length)

    if (issues.length > 0) {
      console.group('❌ Issues')
      issues.forEach(issue => console.log('•', issue))
      console.groupEnd()
    }

    if (warnings.length > 0) {
      console.group('⚠️ Warnings')
      warnings.forEach(warning => console.log('•', warning))
      console.groupEnd()
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ No obvious accessibility issues found!')
    }

    console.groupEnd()

    // Emit audit results
    this.dispatchEvent('debugHelper:auditComplete', {
      issues,
      warnings
    })
  }

  /**
   * Log initialization info
   */
  private logInitialization(): void {
    if (!this.options.verboseMode) return

    console.group('🐛 Debug Helper Initialized')
    console.log('Options:', this.options)
    console.log('Focusable elements:', this.focusableElements.length)
    console.log('Keyboard shortcuts:')
    console.log('  Alt + D: Toggle debug mode')
    console.log('  Alt + F: Show focusable elements')
    console.log('  Alt + A: Run accessibility audit')
    console.log('  Alt + C: Clear console')
    console.groupEnd()
  }

  /**
   * Enable debug mode
   */
  public enable(): void {
    if (!this.enabled) {
      this.toggleDebugMode()
    }
  }

  /**
   * Disable debug mode
   */
  public disable(): void {
    if (this.enabled) {
      this.toggleDebugMode()
    }
  }

  /**
   * Get current state
   */
  public getState(): {
    enabled: boolean
    focusableCount: number
    options: DebugHelperOptions
  } {
    return {
      enabled: this.enabled,
      focusableCount: this.focusableElements.length,
      options: { ...this.options }
    }
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
    this.clearDebugIndicators()

    // Remove any temporary labels
    document.querySelectorAll('.debug-helper-label').forEach(label => {
      label.remove()
    })

    // Emit destroy event
    this.dispatchEvent('debugHelper:destroyed', {
      enabled: this.enabled
    })
  }
}

/**
 * Alpine.js Data Factory (for backward compatibility)
 *
 * This maintains compatibility with existing Alpine.js markup that uses:
 * x-data="debug"
 */
export function createAlpineDebugData() {
  return {
    enabled: false,

    init() {
      if (this.enabled) {
        this.initA11yDebugging()
      }
    },

    initA11yDebugging() {
      const focusable = this.getKeyboardFocusableElements()

      focusable.forEach((element: HTMLElement) => {
        element.addEventListener('focus', function(e) {
          console.log(e.target)
        })
      })
    },

    getKeyboardFocusableElements(element: Document | HTMLElement = document): HTMLElement[] {
      return [...element.querySelectorAll(
        'a[href], button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>]
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute("aria-hidden"))
    }
  }
}

// Register with Alpine.js if available
if (typeof window !== 'undefined' && (window as any).Alpine) {
  document.addEventListener('alpine:init', () => {
    (window as any).Alpine.store('debug', createAlpineDebugData())
  })
}