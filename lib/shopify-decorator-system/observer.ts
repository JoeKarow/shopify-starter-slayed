/**
 * IntersectionObserver Manager for Lazy Loading
 *
 * Centralized management of IntersectionObserver instances for efficient
 * viewport-based component loading
 */

import type { ComponentMetadata, LoadingStrategy } from './registry.js'

export interface ObserverConfig {
  rootMargin: string
  threshold: number | number[]
  root?: Element | null
}

export interface ObservationTarget {
  element: Element
  component: ComponentMetadata
  strategy: LoadingStrategy
  callback: (entry: IntersectionObserverEntry) => void
}

/**
 * Singleton IntersectionObserver Manager
 */
export class IntersectionObserverManager {
  private static instance: IntersectionObserverManager
  private observers = new Map<string, IntersectionObserver>()
  private targets = new Map<Element, ObservationTarget>()
  private configCache = new Map<string, ObserverConfig>()

  static getInstance(): IntersectionObserverManager {
    if (!IntersectionObserverManager.instance) {
      IntersectionObserverManager.instance = new IntersectionObserverManager()
    }
    return IntersectionObserverManager.instance
  }

  /**
   * Observe an element for viewport intersection
   */
  observe(
    element: Element,
    component: ComponentMetadata,
    strategy: LoadingStrategy,
    callback: (entry: IntersectionObserverEntry) => void
  ): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      callback({
        isIntersecting: true,
        target: element
      } as IntersectionObserverEntry)
      return
    }

    const config = this.extractObserverConfig(strategy)
    const configKey = this.getConfigKey(config)

    // Get or create observer for this configuration
    let observer = this.observers.get(configKey)
    if (!observer) {
      observer = this.createObserver(config)
      this.observers.set(configKey, observer)
    }

    // Store target information
    const target: ObservationTarget = {
      element,
      component,
      strategy,
      callback
    }
    this.targets.set(element, target)

    // Start observing
    observer.observe(element)
  }

  /**
   * Stop observing an element
   */
  unobserve(element: Element): void {
    const target = this.targets.get(element)
    if (!target) return

    const config = this.extractObserverConfig(target.strategy)
    const configKey = this.getConfigKey(config)
    const observer = this.observers.get(configKey)

    if (observer) {
      observer.unobserve(element)
    }

    this.targets.delete(element)
  }

  /**
   * Observe a component based on its strategy
   */
  observeComponent(
    component: ComponentMetadata,
    strategy: LoadingStrategy,
    callback: () => void
  ): void {
    // Find elements associated with this component
    const elements = this.findComponentElements(component)

    if (elements.length === 0) {
      // No specific elements found, observe body as fallback
      this.observe(document.body, component, strategy, () => callback())
      return
    }

    // Observe all found elements
    elements.forEach(element => {
      this.observe(element, component, strategy, () => callback())
    })
  }

  /**
   * Find DOM elements associated with a component
   */
  private findComponentElements(component: ComponentMetadata): Element[] {
    const selectors = [
      `[data-component="${component.className}"]`,
      `[data-${component.className.toLowerCase()}]`,
      `.${component.className}`,
      `.${component.className.toLowerCase()}`,
      `#${component.className}`,
      `#${component.className.toLowerCase()}`
    ]

    const elements: Element[] = []

    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector)
        elements.push(...Array.from(found))
      } catch (error) {
        // Invalid selector, skip
        continue
      }
    }

    // Remove duplicates
    return Array.from(new Set(elements))
  }

  /**
   * Create a new IntersectionObserver with the given configuration
   */
  private createObserver(config: ObserverConfig): IntersectionObserver {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const target = this.targets.get(entry.target)
          if (target && entry.isIntersecting) {
            target.callback(entry)
            // Automatically unobserve after triggering (one-time lazy loading)
            this.unobserve(entry.target)
          }
        })
      },
      {
        root: config.root,
        rootMargin: config.rootMargin,
        threshold: config.threshold
      }
    )
  }

  /**
   * Extract observer configuration from loading strategy
   */
  private extractObserverConfig(strategy: LoadingStrategy): ObserverConfig {
    const viewport = strategy.conditions?.viewport

    return {
      rootMargin: viewport?.rootMargin || '100vh',
      threshold: viewport?.threshold || 0.1,
      root: null // Use viewport as root
    }
  }

  /**
   * Generate a unique key for observer configuration
   */
  private getConfigKey(config: ObserverConfig): string {
    return `${config.rootMargin}|${Array.isArray(config.threshold) ? config.threshold.join(',') : config.threshold}|${config.root ? 'custom' : 'viewport'}`
  }

  /**
   * Clean up unused observers
   */
  cleanup(): void {
    // Find observers with no active targets
    const activeConfigs = new Set<string>()

    for (const target of this.targets.values()) {
      const config = this.extractObserverConfig(target.strategy)
      const configKey = this.getConfigKey(config)
      activeConfigs.add(configKey)
    }

    // Disconnect and remove unused observers
    for (const [configKey, observer] of this.observers.entries()) {
      if (!activeConfigs.has(configKey)) {
        observer.disconnect()
        this.observers.delete(configKey)
      }
    }
  }

  /**
   * Get statistics about observed elements
   */
  getStats(): {
    observerCount: number
    targetCount: number
    configCount: number
  } {
    return {
      observerCount: this.observers.size,
      targetCount: this.targets.size,
      configCount: this.configCache.size
    }
  }

  /**
   * Force check visibility for all targets (useful for debugging)
   */
  forceCheck(): void {
    for (const [configKey, observer] of this.observers.entries()) {
      // Trigger intersection check by temporarily disconnecting and reconnecting
      const elements = Array.from(this.targets.keys()).filter(element => {
        const target = this.targets.get(element)
        if (!target) return false

        const config = this.extractObserverConfig(target.strategy)
        return this.getConfigKey(config) === configKey
      })

      observer.disconnect()

      elements.forEach(element => observer.observe(element))
    }
  }
}

/**
 * Global observer manager instance
 */
export const observerManager = IntersectionObserverManager.getInstance()

/**
 * Utility function to observe an element for lazy loading
 */
export function observeForLazyLoad(
  element: Element,
  callback: () => void,
  options: {
    rootMargin?: string
    threshold?: number
  } = {}
): void {
  const config: ObserverConfig = {
    rootMargin: options.rootMargin || '100vh',
    threshold: options.threshold || 0.1
  }

  if (!('IntersectionObserver' in window)) {
    callback()
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback()
          observer.disconnect()
        }
      })
    },
    config
  )

  observer.observe(element)
}

/**
 * Check if an element is currently in the viewport
 */
export function isInViewport(
  element: Element,
  options: {
    rootMargin?: string
    threshold?: number
  } = {}
): Promise<boolean> {
  return new Promise(resolve => {
    if (!('IntersectionObserver' in window)) {
      resolve(true) // Assume visible if no support
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        resolve(entry.isIntersecting)
        observer.disconnect()
      },
      {
        rootMargin: options.rootMargin || '0px',
        threshold: options.threshold || 0
      }
    )

    observer.observe(element)
  })
}