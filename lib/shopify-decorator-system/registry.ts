/**
 * Component Registry
 *
 * Central registry for managing decorated components and their metadata
 */

import 'reflect-metadata'
import type { TemplateDecoratorOptions } from './decorators/template.js'
import type { LazyLoadDecoratorOptions } from './decorators/lazyload.js'
import type { NetworkAwareDecoratorOptions } from './decorators/network-aware.js'

// Contract-based interfaces
export interface ComponentMetadata {
  className: string
  filePath: string
  decorators: DecoratorMetadata[]
  instance?: unknown
}

export type DecoratorMetadata =
  | { type: 'Template'; parameters: TemplateDecoratorOptions }
  | { type: 'LazyLoad'; parameters: LazyLoadDecoratorOptions }
  | { type: 'Critical'; parameters: {} }
  | { type: 'NetworkAware'; parameters: NetworkAwareDecoratorOptions }

export interface LoadingStrategy {
  trigger: 'immediate' | 'viewport' | 'interaction' | 'idle'
  priority: number  // Lower = higher priority
  conditions?: {
    viewport?: {
      rootMargin: string
      threshold: number
    }
    network?: {
      minSpeed: number
    }
  }
  fallback?: LoadingStrategy
}

export interface PerformanceMetrics {
  componentsLoaded: number
  totalLoadTime: number
  cacheHits: number
  networkRequests: number
  bytesTransferred: number
}

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
   * Register a component with its decorators
   */
  register(component: ComponentMetadata): void {
    this.components.set(component.className, component)

    // Check if component is critical and should load immediately
    const criticalDecorator = component.decorators.find(d => d.type === 'Critical')
    if (criticalDecorator) {
      this.initializeComponent(component, this.getLoadingStrategy(component, {
        template: 'unknown'
      })).catch(error => {
        console.error(`Failed to load critical component ${component.className}:`, error)
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
  getComponentsForTemplate(template: string): ComponentMetadata[] {
    return Array.from(this.components.values()).filter(component => {
      const templateDecorator = component.decorators.find(d => d.type === 'Template') as
        { type: 'Template'; parameters: TemplateDecoratorOptions } | undefined
      if (!templateDecorator) return false

      const templates = templateDecorator.parameters.templates === '*'
        ? ['*']
        : Array.isArray(templateDecorator.parameters.templates)
          ? templateDecorator.parameters.templates
          : [templateDecorator.parameters.templates]

      return templates.includes(template) || templates.includes('*')
    })
  }

  /**
   * Get loading strategy for a component
   */
  getLoadingStrategy(component: ComponentMetadata, context: {
    template: string
    network?: 'slow' | 'fast'
    viewport?: DOMRect
  }): LoadingStrategy {
    const criticalDecorator = component.decorators.find(d => d.type === 'Critical') as
      { type: 'Critical'; parameters: {} } | undefined
    const lazyDecorator = component.decorators.find(d => d.type === 'LazyLoad') as
      { type: 'LazyLoad'; parameters: LazyLoadDecoratorOptions } | undefined
    const networkDecorator = component.decorators.find(d => d.type === 'NetworkAware') as
      { type: 'NetworkAware'; parameters: NetworkAwareDecoratorOptions } | undefined

    // Critical components load immediately
    if (criticalDecorator) {
      return {
        trigger: 'immediate',
        priority: 1
      }
    }

    // Lazy load components wait for viewport intersection
    if (lazyDecorator) {
      return {
        trigger: 'viewport',
        priority: 10,
        conditions: {
          viewport: {
            rootMargin: lazyDecorator.parameters.rootMargin || '100vh',
            threshold: lazyDecorator.parameters.threshold || 0.1
          }
        }
      }
    }

    // Network aware components adapt to connection speed
    if (networkDecorator && context.network === 'slow') {
      const fallbackStrategy = networkDecorator.parameters.fallbackStrategy || 'defer'

      switch (fallbackStrategy) {
        case 'defer':
          return {
            trigger: 'idle',
            priority: 20
          }
        case 'critical-only':
          return {
            trigger: 'interaction',
            priority: 30
          }
        default:
          return {
            trigger: 'immediate',
            priority: 15
          }
      }
    }

    // Default strategy
    return {
      trigger: 'immediate',
      priority: 5
    }
  }

  /**
   * Initialize component based on strategy
   */
  async initializeComponent(component: ComponentMetadata, strategy: LoadingStrategy): Promise<void> {
    const startTime = performance.now()

    if (this.loadedComponents.has(component.className)) {
      this.performanceMetrics.cacheHits++
      return
    }

    try {
      // Component already has instance created during decoration
      if (!component.instance) {
        throw new Error(`Component ${component.className} has no instance`)
      }

      this.loadedComponents.add(component.className)

      // Update performance metrics
      const loadTime = performance.now() - startTime
      this.performanceMetrics.componentsLoaded++
      this.performanceMetrics.totalLoadTime += loadTime

      // Emit load event for debugging
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('component:loaded', {
          detail: {
            className: component.className,
            loadTime,
            strategy: strategy.trigger,
            fromCache: false,
          }
        }))
      }
    } catch (error) {
      console.error(`Failed to initialize component ${component.className}:`, error)
      throw error
    }
  }

  /**
   * Auto-discover all decorated components in the codebase
   */
  async discoverComponents(): Promise<ComponentMetadata[]> {
    // This will be implemented in the discovery module
    // For now, return already registered components
    return Array.from(this.components.values())
  }

  /**
   * Initialize components for current template
   */
  async initializeForTemplate(template: string): Promise<void> {
    const components = this.getComponentsForTemplate(template)
    const initPromises: Promise<void>[] = []

    for (const component of components) {
      const strategy = this.getLoadingStrategy(component, { template })

      if (strategy.trigger === 'immediate') {
        initPromises.push(this.initializeComponent(component, strategy))
      } else if (strategy.trigger === 'viewport') {
        this.setupLazyLoading(component, strategy)
      }
    }

    await Promise.all(initPromises)
  }

  /**
   * Setup lazy loading for component
   */
  private setupLazyLoading(component: ComponentMetadata, strategy: LoadingStrategy): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: initialize immediately if no IntersectionObserver
      this.initializeComponent(component, strategy)
      return
    }

    const viewport = strategy.conditions?.viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.initializeComponent(component, strategy)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: viewport?.rootMargin || '100vh',
        threshold: viewport?.threshold || 0.1,
      }
    )

    // Observe elements that might trigger this component
    const elements = document.querySelectorAll(`[data-component="${component.className}"]`)
    elements.forEach(element => observer.observe(element))

    // If no specific elements found, observe the document body
    if (elements.length === 0) {
      observer.observe(document.body)
    }
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

  /**
   * Clear all registered components (for testing)
   */
  clear(): void {
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
}

// Singleton instance - global registry as per contract
export const registry = ComponentRegistry.getInstance()


/**
 * Register a component with the global registry
 */
export function registerComponent(componentData: {
  name: string
  constructor: new (...args: unknown[]) => unknown
  conditions?: Array<{
    type: 'custom' | 'feature'
    config: unknown
  }>
  loadingStrategy?: {
    type: 'lazy' | 'critical'
  }
}): void {
  const decorators: DecoratorMetadata[] = []

  if (componentData.conditions) {
    for (const condition of componentData.conditions) {
      if (condition.type === 'custom' || condition.type === 'feature') {
        decorators.push({
          type: 'Template', // Map generic condition to Template for now
          parameters: condition.config as TemplateDecoratorOptions
        })
      }
    }
  }

  if (componentData.loadingStrategy?.type === 'lazy') {
    decorators.push({
      type: 'LazyLoad',
      parameters: {}
    })
  }

  if (componentData.loadingStrategy?.type === 'critical') {
    decorators.push({
      type: 'Critical',
      parameters: {}
    })
  }

  const metadata: ComponentMetadata = {
    className: componentData.name,
    filePath: 'unknown',
    decorators,
    instance: new componentData.constructor()
  }

  registry.register(metadata)
}