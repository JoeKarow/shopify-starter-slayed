/**
 * TypeScript types for the Shopify decorator system
 */

export interface ComponentMetadata {
  name: string
  constructor: new (...args: any[]) => any
  templates?: string[]
  lazy?: boolean
  critical?: boolean
  networkAware?: boolean
  conditions?: ConditionConfig[]
  loadingStrategy?: LoadingStrategy
}

export interface LoadingStrategy {
  type: 'eager' | 'lazy' | 'idle' | 'interaction' | 'viewport'
  options?: {
    rootMargin?: string
    threshold?: number
    timeout?: number
    events?: string[]
  }
}

export interface NetworkCondition {
  slowThreshold?: number  // Connection RTT threshold in ms
  fastThreshold?: number  // Connection RTT threshold in ms
  saveData?: boolean      // Respect save-data header
  effectiveType?: '2g' | '3g' | '4g' // Connection effective type
}

export interface TemplateCondition {
  include?: string[]      // Template names to include
  exclude?: string[]      // Template names to exclude
  suffix?: string         // Template suffix matching
  handle?: string         // Template handle matching
}

export interface ConditionalConfig {
  media?: string          // CSS media query
  feature?: string        // Feature detection
  custom?: () => boolean  // Custom condition function
}

export interface ConditionConfig {
  type: 'template' | 'network' | 'feature' | 'custom'
  config: TemplateCondition | NetworkCondition | ConditionalConfig
}

export interface DecoratorOptions {
  // Template decorator options
  templates?: string[]
  exclude?: string[]

  // LazyLoad decorator options
  rootMargin?: string
  threshold?: number
  timeout?: number

  // NetworkAware decorator options
  slowThreshold?: number
  saveData?: boolean

  // Critical decorator options
  priority?: number
  inline?: boolean

  // Conditional decorator options
  condition?: () => boolean
  media?: string
  feature?: string

  // Utility decorator options
  delay?: number
  leading?: boolean
  trailing?: boolean
  maxAge?: number
}

export interface ComponentLoadEvent {
  name: string
  template: string
  loadTime: number
  strategy: LoadingStrategy['type']
  fromCache: boolean
}

export interface PerformanceMetrics {
  componentsLoaded: number
  totalLoadTime: number
  cacheHits: number
  networkRequests: number
  bytesTransferred: number
}