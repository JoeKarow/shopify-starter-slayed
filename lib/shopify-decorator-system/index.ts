/**
 * Shopify Decorator System
 *
 * A TypeScript decorator system for performance-optimized component loading
 * in Shopify themes. Provides decorators for template-specific loading,
 * lazy loading, and network-aware optimizations.
 */

// Component Registry
export { ComponentRegistry, registry } from './registry.js'

// Core Class Decorators
export { Template, ExcludeTemplate, GlobalTemplate } from './decorators/template.js'
export { LazyLoad } from './decorators/lazy-load.js'
export { Critical } from './decorators/critical.js'
export { NetworkAware } from './decorators/network-aware.js'

// Method Decorators
export { Debounced, DebounceQuick, DebounceLeading, DebounceBoth } from './decorators/debounced.js'
export { Cached, CacheLong, CacheShort, CacheWithKey } from './decorators/cached.js'

// Legacy decorators (backward compatibility)
export { Debounce } from './decorators/debounce.js'
export { Throttle } from './decorators/throttle.js'
export { Memoize } from './decorators/memoize.js'
export { Conditional } from './decorators/conditional.js'

// Infrastructure
export { discoverComponents, discoverComponentsInDir, discoverAndRegister, watchForComponents } from './discovery.js'
export { calculateLoadingStrategy, calculatePriority, shouldPreload, estimateLoadingTime } from './strategies.js'
export { IntersectionObserverManager, observerManager, observeForLazyLoad, isInViewport } from './observer.js'
export { NetworkManager, networkManager, isOnline, isSlowNetwork, isFastNetwork, getNetworkSpeed, isSaveDataEnabled, onNetworkChange, waitForNetwork, estimateDataUsage } from './network.js'

// Types from Registry
export type {
  ComponentMetadata,
  DecoratorMetadata,
  LoadingStrategy,
  PerformanceMetrics
} from './registry.js'

// Types from Decorators
export type { TemplateDecoratorOptions } from './decorators/template.js'
export type { LazyLoadDecoratorOptions } from './decorators/lazy-load.js'
export type { NetworkAwareDecoratorOptions } from './decorators/network-aware.js'
export type { DebouncedOptions } from './decorators/debounced.js'
export type { CachedOptions } from './decorators/cached.js'

// Types from Infrastructure
export type { LoadingContext } from './strategies.js'
export type { ObserverConfig, ObservationTarget } from './observer.js'
export type { NetworkInformation, NetworkStatus, NetworkChangeCallback } from './network.js'

// Legacy types (backward compatibility)
export type {
  NetworkCondition,
  TemplateCondition,
  DecoratorOptions,
} from './types.js'