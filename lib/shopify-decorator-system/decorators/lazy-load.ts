/**
 * @LazyLoad Decorator
 *
 * Defers component loading until needed using Intersection Observer
 */

import { registerComponent } from '../registry.js'
import type { DecoratorOptions, LoadingStrategy } from '../types.js'

/**
 * Lazy loading decorator using Intersection Observer
 *
 * @param options - Lazy loading configuration
 */
export function LazyLoad(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const loadingStrategy: LoadingStrategy = {
      type: 'lazy',
      options: {
        rootMargin: options.rootMargin || '100vh',
        threshold: options.threshold || 0.1,
        timeout: options.timeout || 5000,
      },
    }

    registerComponent({
      name: constructor.name,
      constructor,
      lazy: true,
      loadingStrategy,
    })

    return constructor
  }
}

/**
 * Load on idle (using requestIdleCallback)
 */
export function LoadOnIdle(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const loadingStrategy: LoadingStrategy = {
      type: 'idle',
      options: {
        timeout: options.timeout || 5000,
      },
    }

    registerComponent({
      name: constructor.name,
      constructor,
      lazy: true,
      loadingStrategy,
    })

    return constructor
  }
}

/**
 * Load on user interaction
 */
export function LoadOnInteraction(
  events: string[] = ['click', 'touchstart', 'keydown'],
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const loadingStrategy: LoadingStrategy = {
      type: 'interaction',
      options: {
        events,
        timeout: options.timeout || 10000,
      },
    }

    registerComponent({
      name: constructor.name,
      constructor,
      lazy: true,
      loadingStrategy,
    })

    return constructor
  }
}

/**
 * Load when element enters viewport
 */
export function LoadOnViewport(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const loadingStrategy: LoadingStrategy = {
      type: 'viewport',
      options: {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      },
    }

    registerComponent({
      name: constructor.name,
      constructor,
      lazy: true,
      loadingStrategy,
    })

    return constructor
  }
}