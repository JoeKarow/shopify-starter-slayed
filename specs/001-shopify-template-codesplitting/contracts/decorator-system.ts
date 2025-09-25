/**
 * TypeScript Decorator System Contract
 * Defines interfaces for component decorators and registration
 *
 * All decorators are made globally available through:
 * - Vite configuration that auto-imports from lib/shopify-decorator-system
 * - TypeScript ambient module declarations
 * - No manual imports needed in component files
 */

export interface ComponentMetadata {
  className: string
  filePath: string
  decorators: DecoratorMetadata[]
  instance?: any
}

export interface DecoratorMetadata {
  type: 'Template' | 'LazyLoad' | 'Critical' | 'NetworkAware'
  parameters: any
}

/**
 * Template decorator - specifies which Shopify templates load this component
 */
export interface TemplateDecoratorOptions {
  templates: string[] | '*'  // '*' for all templates
}

export function Template(options: string[] | TemplateDecoratorOptions): ClassDecorator

/**
 * LazyLoad decorator - enables viewport-based lazy loading
 */
export interface LazyLoadDecoratorOptions {
  rootMargin?: string     // Default: '100vh'
  threshold?: number      // Default: 0.1
  placeholder?: string    // Optional placeholder component
}

export function LazyLoad(options?: LazyLoadDecoratorOptions): ClassDecorator

/**
 * Critical decorator - marks component as critical path
 * Cannot be used with @LazyLoad
 */
export function Critical(): ClassDecorator

/**
 * NetworkAware decorator - adapts loading based on network speed
 */
export interface NetworkAwareDecoratorOptions {
  slowThreshold?: number      // Mbps, default: 10
  fallbackStrategy?: 'defer' | 'simplify' | 'critical-only'
  reduceQuality?: boolean     // Reduce asset quality on slow networks
}

export function NetworkAware(options?: NetworkAwareDecoratorOptions): ClassDecorator

/**
 * Method Decorators - for optimizing individual methods
 */

/**
 * Debounced decorator - delays method execution
 */
export interface DebouncedOptions {
  delay: number  // milliseconds
  leading?: boolean
  trailing?: boolean
}

export function Debounced(delay: number | DebouncedOptions): MethodDecorator

/**
 * Cached decorator - caches method results
 */
export interface CachedOptions {
  ttl: number  // milliseconds
  key?: (...args: any[]) => string
}

export function Cached(ttl: number | CachedOptions): MethodDecorator

/**
 * Throttled decorator - limits execution frequency
 */
export function Throttled(limit: number): MethodDecorator

/**
 * Component Registry - manages decorated components
 */
export interface ComponentRegistry {
  /**
   * Register a component with its decorators
   */
  register(component: ComponentMetadata): void

  /**
   * Get all components for a specific template
   */
  getComponentsForTemplate(template: string): ComponentMetadata[]

  /**
   * Get loading strategy for a component
   */
  getLoadingStrategy(component: ComponentMetadata, context: {
    template: string
    network?: 'slow' | 'fast'
    viewport?: DOMRect
  }): LoadingStrategy

  /**
   * Initialize component based on strategy
   */
  initializeComponent(component: ComponentMetadata, strategy: LoadingStrategy): Promise<void>

  /**
   * Auto-discover all decorated components in the codebase
   */
  discoverComponents(): Promise<ComponentMetadata[]>
}

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

/**
 * Global registry instance
 */
export const registry: ComponentRegistry

/**
 * Initialization function for the decorator system
 */
export interface DecoratorSystemInit {
  /**
   * Initialize the decorator system
   */
  init(options?: {
    autoDiscover?: boolean
    lazyLoadRoot?: string
    networkDetection?: boolean
  }): Promise<void>

  /**
   * Start observing for lazy-loaded components
   */
  startObserving(): void

  /**
   * Get current network status
   */
  getNetworkStatus(): {
    type: 'slow' | 'fast'
    effectiveType?: '3g' | '4g' | 'wifi'
    downlink?: number
    rtt?: number
  }
}

/**
 * Expected usage:
 *
 * @Template(['product', 'collection'])
 * @LazyLoad({ rootMargin: '200px' })
 * class ProductGallery {
 *   // Component implementation
 * }
 *
 * @Critical()
 * @NetworkAware({ slowThreshold: 5 })
 * class HeaderNav {
 *   // Critical component that adapts to network
 * }
 */