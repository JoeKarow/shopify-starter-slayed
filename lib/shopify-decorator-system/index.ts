/**
 * Shopify Decorator System
 *
 * A TypeScript decorator system for performance-optimized component loading
 * in Shopify themes. Provides decorators for template-specific loading,
 * lazy loading, and network-aware optimizations.
 */

export { ComponentRegistry } from './registry.js'

// Core decorators
export { Template } from './decorators/template.js'
export { LazyLoad } from './decorators/lazy-load.js'
export { Critical } from './decorators/critical.js'
export { NetworkAware } from './decorators/network-aware.js'
export { Conditional } from './decorators/conditional.js'

// Utility decorators
export { Debounce } from './decorators/debounce.js'
export { Throttle } from './decorators/throttle.js'
export { Memoize } from './decorators/memoize.js'

// Types
export type {
  ComponentMetadata,
  LoadingStrategy,
  NetworkCondition,
  TemplateCondition,
  DecoratorOptions,
} from './types.js'

// Registry functions
export {
  registerComponent,
  getComponent,
  initializeComponents,
  getComponentsByTemplate,
} from './registry.js'