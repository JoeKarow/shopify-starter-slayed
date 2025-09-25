/**
 * @Memoize Decorator
 *
 * Utility decorator for memoizing method results
 */

import type { DecoratorOptions } from '../types.js'

/**
 * Memoize method decorator
 *
 * @param options - Memoization options
 */
export function Memoize(options: DecoratorOptions = {}): MethodDecorator {
  return function (target: any, propertyName: string | symbol, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const caches = new WeakMap()

    descriptor.value = function (this: any, ...args: any[]) {
      let cache = caches.get(this)
      if (!cache) {
        cache = new Map()
        caches.set(this, cache)
      }

      const key = createCacheKey(args)
      const maxAge = options.maxAge || Infinity
      const now = Date.now()

      // Check if cached result exists and is still valid
      if (cache.has(key)) {
        const cached = cache.get(key)
        if (now - cached.timestamp < maxAge) {
          return cached.value
        } else {
          cache.delete(key)
        }
      }

      // Compute and cache result
      const result = method.apply(this, args)
      cache.set(key, { value: result, timestamp: now })

      return result
    }

    return descriptor
  }
}

/**
 * Memoize with TTL (time to live)
 */
export function MemoizeTTL(ttlMs: number): MethodDecorator {
  return Memoize({ maxAge: ttlMs })
}

/**
 * Create cache key from arguments
 */
function createCacheKey(args: any[]): string {
  try {
    return JSON.stringify(args)
  } catch (error) {
    // Fallback for non-serializable arguments
    return args.map(arg => {
      if (arg === null) return 'null'
      if (arg === undefined) return 'undefined'
      if (typeof arg === 'object') return `[object ${arg.constructor.name}]`
      return String(arg)
    }).join(',')
  }
}