/**
 * Component Registry
 *
 * Central registry for managing decorated components and their metadata
 */

import type { ComponentMetadata, LoadingStrategy, PerformanceMetrics } from './types.js'

export class ComponentRegistry {
  private static instance: ComponentRegistry
  private components = new Map<string, ComponentMetadata>()
  private loadedComponents = new Set<string>()
  private performanceMetrics: PerformanceMetrics = {
    componentsLoaded: 0,
    totalLoadTime: 0,
    cacheHits: 0,
    networkRequests: 0,
    bytesTransferred: 0,
  }

  static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry()
    }
    return ComponentRegistry.instance
  }

  /**
   * Register a component with metadata
   */
  register(metadata: ComponentMetadata): void {
    this.components.set(metadata.name, metadata)

    if (metadata.critical) {
      // Load critical components immediately
      this.loadComponent(metadata.name).catch(error => {
        console.error(`Failed to load critical component ${metadata.name}:`, error)
      })
    }
  }

  /**
   * Get component metadata by name
   */
  get(name: string): ComponentMetadata | undefined {
    return this.components.get(name)
  }

  /**
   * Get all components for a specific template
   */
  getByTemplate(template: string): ComponentMetadata[] {
    return Array.from(this.components.values()).filter(component =>
      component.templates?.includes(template) ||
      component.templates?.includes('*') ||
      !component.templates // Global components
    )
  }

  /**
   * Load component instance
   */
  async loadComponent(name: string): Promise<any> {
    const startTime = performance.now()
    const metadata = this.components.get(name)

    if (!metadata) {
      throw new Error(`Component ${name} not found in registry`)
    }

    if (this.loadedComponents.has(name)) {
      this.performanceMetrics.cacheHits++
      return metadata.constructor
    }

    try {
      // Initialize component
      const instance = new metadata.constructor()
      this.loadedComponents.add(name)

      // Update performance metrics
      const loadTime = performance.now() - startTime
      this.performanceMetrics.componentsLoaded++
      this.performanceMetrics.totalLoadTime += loadTime

      // Emit load event for debugging
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('component:loaded', {
          detail: {
            name,
            loadTime,
            strategy: metadata.loadingStrategy?.type || 'eager',
            fromCache: false,
          }
        }))
      }

      return instance
    } catch (error) {
      console.error(`Failed to load component ${name}:`, error)
      throw error
    }
  }

  /**
   * Initialize components for current template
   */
  async initializeForTemplate(template: string): Promise<void> {
    const components = this.getByTemplate(template)
    const initPromises: Promise<any>[] = []

    for (const component of components) {
      if (component.loadingStrategy?.type === 'eager' || component.critical) {
        initPromises.push(this.loadComponent(component.name))
      } else if (component.loadingStrategy?.type === 'lazy') {
        this.setupLazyLoading(component)
      }
    }

    await Promise.all(initPromises)
  }

  /**
   * Setup lazy loading for component
   */
  private setupLazyLoading(component: ComponentMetadata): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: load immediately if no IntersectionObserver
      this.loadComponent(component.name)
      return
    }

    const options = component.loadingStrategy?.options
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadComponent(component.name)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: options?.rootMargin || '50px',
        threshold: options?.threshold || 0.1,
      }
    )

    // Observe elements that might trigger this component
    const elements = document.querySelectorAll(`[data-component="${component.name}"]`)
    elements.forEach(element => observer.observe(element))
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.components.clear()
    this.loadedComponents.clear()
    this.performanceMetrics = {
      componentsLoaded: 0,
      totalLoadTime: 0,
      cacheHits: 0,
      networkRequests: 0,
      bytesTransferred: 0,
    }
  }

  /**
   * List all registered components
   */
  list(): ComponentMetadata[] {
    return Array.from(this.components.values())
  }
}

// Singleton instance
const registry = ComponentRegistry.getInstance()

// Exported functions for convenience
export function registerComponent(metadata: ComponentMetadata): void {
  registry.register(metadata)
}

export function getComponent(name: string): ComponentMetadata | undefined {
  return registry.get(name)
}

export function getComponentsByTemplate(template: string): ComponentMetadata[] {
  return registry.getByTemplate(template)
}

export function initializeComponents(template?: string): Promise<void> {
  const currentTemplate = template || getCurrentTemplate()
  return registry.initializeForTemplate(currentTemplate)
}

/**
 * Get current Shopify template from document
 */
function getCurrentTemplate(): string {
  if (typeof document === 'undefined') return 'unknown'

  // Try to get template from body class
  const bodyClasses = document.body?.className || ''
  const templateMatch = bodyClasses.match(/template-(\w+)/)
  if (templateMatch) {
    return templateMatch[1]
  }

  // Fallback: try to get from meta tag
  const metaTemplate = document.querySelector('meta[name="shopify-template"]')
  if (metaTemplate) {
    return metaTemplate.getAttribute('content') || 'unknown'
  }

  return 'unknown'
}