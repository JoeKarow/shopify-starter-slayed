/**
 * Test Directive Component
 *
 * A test directive migrated from Alpine.js to TypeScript decorators.
 * Provides click event logging and debugging functionality.
 *
 * Uses @GlobalTemplate decorator for availability on all templates for testing.
 * Uses @LazyLoad decorator since it's only for debugging/development.
 *
 * Decorators are auto-imported via Vite configuration.
 */

import { GlobalTemplate, LazyLoad } from '@lib/shopify-decorator-system/index.js'

export interface TestDirectiveOptions {
  enableLogging?: boolean
  logLevel?: 'info' | 'debug' | 'warn' | 'error'
  logEvents?: string[]
  addVisualIndicator?: boolean
}

/**
 * Test Directive Component
 *
 * Provides debugging and testing functionality for elements.
 * Can log various events and add visual indicators for development.
 */
@GlobalTemplate()
@LazyLoad({
  rootMargin: '100vh',  // Load when close to viewport
  threshold: 0.1
})
export class TestDirective {
  private options: TestDirectiveOptions
  private elements: Map<HTMLElement, { expression: string; modifiers: string[] }> = new Map()
  private eventListeners: Map<HTMLElement, { [key: string]: EventListener }> = new Map()

  constructor(options: TestDirectiveOptions = {}) {
    this.options = {
      enableLogging: process.env.NODE_ENV === 'development',
      logLevel: 'info',
      logEvents: ['click'],
      addVisualIndicator: false,
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
   * Initialize the test directive
   */
  public init(): void {
    this.findTestElements()
    this.bindEvents()
    this.setupGlobalTestFunction()

    // Emit custom event
    this.dispatchEvent('testDirective:initialized', {
      elementsCount: this.elements.size,
      options: this.options
    })

    console.log('Slayed Test Directive Initialized.', {
      elements: this.elements.size,
      enabled: this.options.enableLogging
    })
  }

  /**
   * Find elements with test directive attributes
   */
  private findTestElements(): void {
    // Look for elements with data-test-directive attribute
    const testElements = document.querySelectorAll('[data-test-directive]')

    testElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      const expression = htmlElement.getAttribute('data-test-directive') || ''
      const modifiersAttr = htmlElement.getAttribute('data-test-modifiers') || ''
      const modifiers = modifiersAttr.split(',').map(m => m.trim()).filter(Boolean)

      this.elements.set(htmlElement, { expression, modifiers })

      if (this.options.addVisualIndicator) {
        this.addVisualIndicator(htmlElement)
      }
    })

    // Also look for Alpine.js x-test directive for backward compatibility
    const alpineTestElements = document.querySelectorAll('[x-test]')

    alpineTestElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      const expression = htmlElement.getAttribute('x-test') || ''
      const modifiers: string[] = []

      // Parse Alpine.js modifiers from the attribute name
      const attributes = Array.from(htmlElement.attributes)
      attributes.forEach(attr => {
        const match = attr.name.match(/^x-test\.(.+)$/)
        if (match) {
          modifiers.push(match[1])
        }
      })

      this.elements.set(htmlElement, { expression, modifiers })

      if (this.options.addVisualIndicator) {
        this.addVisualIndicator(htmlElement)
      }
    })
  }

  /**
   * Bind event listeners to test elements
   */
  private bindEvents(): void {
    if (!this.options.enableLogging) return

    this.elements.forEach(({ expression, modifiers }, element) => {
      const listeners: { [key: string]: EventListener } = {}

      // Bind configured events
      this.options.logEvents?.forEach(eventType => {
        const listener = (event: Event) => {
          this.logEvent(element, event, expression, modifiers)
        }

        listeners[eventType] = listener
        element.addEventListener(eventType, listener)
      })

      // Store listeners for cleanup
      this.eventListeners.set(element, listeners)

      // Handle specific modifiers
      if (modifiers.includes('hover')) {
        const hoverListener = (event: Event) => {
          this.logEvent(element, event, expression, ['hover'])
        }
        listeners['mouseenter'] = hoverListener
        element.addEventListener('mouseenter', hoverListener)
      }

      if (modifiers.includes('focus')) {
        const focusListener = (event: Event) => {
          this.logEvent(element, event, expression, ['focus'])
        }
        listeners['focus'] = focusListener
        element.addEventListener('focus', focusListener)
      }

      if (modifiers.includes('keydown')) {
        const keyListener = (event: Event) => {
          const keyEvent = event as KeyboardEvent
          this.logEvent(element, event, expression, ['keydown', keyEvent.key])
        }
        listeners['keydown'] = keyListener
        element.addEventListener('keydown', keyListener)
      }
    })
  }

  /**
   * Log event information
   */
  private logEvent(
    element: HTMLElement,
    event: Event,
    expression: string,
    modifiers: string[]
  ): void {
    const logData = {
      event: event.type,
      element: {
        tagName: element.tagName,
        id: element.id || 'no-id',
        className: element.className || 'no-class',
        textContent: element.textContent?.trim().substring(0, 50) || 'no-text'
      },
      expression,
      modifiers,
      timestamp: new Date().toISOString(),
      eventDetails: this.getEventDetails(event)
    }

    // Log based on configured level
    switch (this.options.logLevel) {
      case 'debug':
        console.debug('🧪 Test Directive:', logData)
        break
      case 'warn':
        console.warn('🧪 Test Directive:', logData)
        break
      case 'error':
        console.error('🧪 Test Directive:', logData)
        break
      default:
        console.info('🧪 Test Directive:', logData)
    }

    // Emit custom event with log data
    this.dispatchEvent('testDirective:eventLogged', logData)
  }

  /**
   * Extract relevant details from different event types
   */
  private getEventDetails(event: Event): Record<string, any> {
    const details: Record<string, any> = {}

    if (event instanceof MouseEvent) {
      details.mouse = {
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons
      }
    }

    if (event instanceof KeyboardEvent) {
      details.keyboard = {
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey
      }
    }

    if (event instanceof TouchEvent) {
      details.touch = {
        touches: event.touches.length,
        changedTouches: event.changedTouches.length
      }
    }

    if (event instanceof FocusEvent) {
      details.focus = {
        relatedTarget: event.relatedTarget ? (event.relatedTarget as Element).tagName : null
      }
    }

    return details
  }

  /**
   * Add visual indicator to test elements
   */
  private addVisualIndicator(element: HTMLElement): void {
    element.style.outline = '2px dashed purple'
    element.style.outlineOffset = '2px'
    element.setAttribute('title', `Test Directive: ${element.getAttribute('data-test-directive') || element.getAttribute('x-test') || ''}`)

    // Add a small badge
    const badge = document.createElement('div')
    badge.textContent = 'TEST'
    badge.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      background: purple;
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 2px;
      z-index: 9999;
      pointer-events: none;
    `
    badge.className = 'test-directive-badge'

    // Position the parent element if needed
    const computedStyle = window.getComputedStyle(element)
    if (computedStyle.position === 'static') {
      element.style.position = 'relative'
    }

    element.appendChild(badge)
  }

  /**
   * Setup global test function for runtime testing
   */
  private setupGlobalTestFunction(): void {
    if (typeof window === 'undefined') return

    (window as any).testDirective = {
      logLevel: (level: 'info' | 'debug' | 'warn' | 'error') => {
        this.options.logLevel = level
        console.log(`🧪 Test Directive log level set to: ${level}`)
      },

      toggle: () => {
        this.options.enableLogging = !this.options.enableLogging
        console.log(`🧪 Test Directive logging ${this.options.enableLogging ? 'enabled' : 'disabled'}`)
      },

      addIndicators: () => {
        this.elements.forEach((_, element) => {
          this.addVisualIndicator(element)
        })
        console.log('🧪 Test Directive visual indicators added')
      },

      removeIndicators: () => {
        document.querySelectorAll('.test-directive-badge').forEach(badge => {
          badge.remove()
        })
        this.elements.forEach((_, element) => {
          element.style.outline = ''
          element.style.outlineOffset = ''
        })
        console.log('🧪 Test Directive visual indicators removed')
      },

      getElements: () => {
        return Array.from(this.elements.entries()).map(([element, data]) => ({
          element,
          expression: data.expression,
          modifiers: data.modifiers
        }))
      },

      getStats: () => {
        return {
          elementsCount: this.elements.size,
          options: { ...this.options },
          isActive: this.options.enableLogging
        }
      }
    }
  }

  /**
   * Add test directive to element programmatically
   */
  public addTestDirective(
    element: HTMLElement,
    expression: string,
    modifiers: string[] = []
  ): void {
    if (this.elements.has(element)) {
      console.warn('🧪 Test Directive already exists on element', element)
      return
    }

    this.elements.set(element, { expression, modifiers })

    // Bind events
    const listeners: { [key: string]: EventListener } = {}

    this.options.logEvents?.forEach(eventType => {
      const listener = (event: Event) => {
        this.logEvent(element, event, expression, modifiers)
      }

      listeners[eventType] = listener
      element.addEventListener(eventType, listener)
    })

    this.eventListeners.set(element, listeners)

    if (this.options.addVisualIndicator) {
      this.addVisualIndicator(element)
    }

    console.log('🧪 Test Directive added to element', { element, expression, modifiers })
  }

  /**
   * Remove test directive from element
   */
  public removeTestDirective(element: HTMLElement): void {
    const listeners = this.eventListeners.get(element)
    if (listeners) {
      Object.entries(listeners).forEach(([eventType, listener]) => {
        element.removeEventListener(eventType, listener)
      })
      this.eventListeners.delete(element)
    }

    this.elements.delete(element)

    // Remove visual indicators
    element.style.outline = ''
    element.style.outlineOffset = ''
    element.querySelectorAll('.test-directive-badge').forEach(badge => {
      badge.remove()
    })

    console.log('🧪 Test Directive removed from element', element)
  }

  /**
   * Update options
   */
  public updateOptions(newOptions: Partial<TestDirectiveOptions>): void {
    this.options = { ...this.options, ...newOptions }
    console.log('🧪 Test Directive options updated', this.options)
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
    // Remove all event listeners
    this.eventListeners.forEach((listeners, element) => {
      Object.entries(listeners).forEach(([eventType, listener]) => {
        element.removeEventListener(eventType, listener)
      })
    })

    // Clear visual indicators
    document.querySelectorAll('.test-directive-badge').forEach(badge => {
      badge.remove()
    })

    this.elements.forEach((_, element) => {
      element.style.outline = ''
      element.style.outlineOffset = ''
    })

    // Clear data
    this.elements.clear()
    this.eventListeners.clear()

    // Clean up global function
    if (typeof window !== 'undefined' && (window as any).testDirective) {
      delete (window as any).testDirective
    }

    // Emit destroy event
    this.dispatchEvent('testDirective:destroyed', {})
  }
}

/**
 * Alpine.js Directive Factory (for backward compatibility)
 *
 * This maintains compatibility with existing Alpine.js markup that uses:
 * x-test="expression"
 */
export function createAlpineTestDirective() {
  const testDirective = new TestDirective()

  return (el: HTMLElement, { value, modifiers, expression }: any) => {
    testDirective.addTestDirective(el, expression || value || '', modifiers || [])
  }
}

// Register with Alpine.js if available
if (typeof window !== 'undefined' && (window as any).Alpine) {
  document.addEventListener('alpine:init', () => {
    (window as any).Alpine.directive('test', createAlpineTestDirective())
  })
}