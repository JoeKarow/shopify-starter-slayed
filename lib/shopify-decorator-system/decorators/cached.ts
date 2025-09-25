/**
 * @Cached Method Decorator
 *
 * Caches method results with TTL support
 */

export interface CachedOptions {
  ttl: number  // milliseconds
  key?: (...args: any[]) => string
}

interface CacheEntry {
  value: any
  timestamp: number
  ttl: number
}

/**
 * Cached decorator - caches method results
 */
export function Cached(options: number | CachedOptions): MethodDecorator {
  return function (target: any, propertyName: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    // Parse options
    const config: CachedOptions = typeof options === 'number'
      ? { ttl: options }
      : options

    // Validate TTL
    if (config.ttl < 0) {
      console.warn(
        `@Cached decorator on ${target.constructor.name}.${String(propertyName)} ` +
        `has invalid TTL ${config.ttl}ms. Using 0ms (no caching).`
      )
      config.ttl = 0
    }

    // Store cache per instance
    const caches = new WeakMap<any, Map<string, CacheEntry>>()

    descriptor.value = function (this: any, ...args: any[]) {
      // Skip caching if TTL is 0
      if (config.ttl === 0) {
        return originalMethod.apply(this, args)
      }

      // Get or create cache for this instance
      let cache = caches.get(this)
      if (!cache) {
        cache = new Map()
        caches.set(this, cache)
      }

      // Generate cache key
      const cacheKey = config.key
        ? config.key(...args)
        : generateDefaultKey(args)

      // Check for existing cached entry
      const cached = cache.get(cacheKey)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < cached.ttl) {
        return cached.value
      }

      // Execute method and cache result
      const result = originalMethod.apply(this, args)

      // Only cache non-undefined results
      if (result !== undefined) {
        cache.set(cacheKey, {
          value: result,
          timestamp: now,
          ttl: config.ttl
        })

        // Clean up expired entries periodically (every 100 cache operations)
        if (cache.size > 0 && cache.size % 100 === 0) {
          cleanupExpiredEntries(cache, now)
        }
      }

      return result
    }

    return descriptor
  }
}

/**
 * Generate default cache key from arguments
 */
function generateDefaultKey(args: any[]): string {
  return args
    .map(arg => {
      if (arg === null) return 'null'
      if (arg === undefined) return 'undefined'
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return arg.toString()
        }
      }
      return String(arg)
    })
    .join('|')
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries(cache: Map<string, CacheEntry>, now: number): void {
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= entry.ttl) {
      cache.delete(key)
    }
  }
}

/**
 * Cache with 5 minute TTL
 */
export function CacheLong(): MethodDecorator {
  return Cached({ ttl: 5 * 60 * 1000 }) // 5 minutes
}

/**
 * Cache with 30 second TTL
 */
export function CacheShort(): MethodDecorator {
  return Cached({ ttl: 30 * 1000 }) // 30 seconds
}

/**
 * Cache with custom key generator
 */
export function CacheWithKey(ttl: number, keyFn: (...args: any[]) => string): MethodDecorator {
  return Cached({ ttl, key: keyFn })
}