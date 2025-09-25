/**
 * @Debounce Decorator
 *
 * Utility decorator for debouncing method calls
 */

import type { DecoratorOptions } from '../types.js'

/**
 * Debounce method decorator
 *
 * @param delay - Debounce delay in milliseconds
 * @param options - Debounce options
 */
export function Debounce(
  delay: number = 300,
  options: DecoratorOptions = {}
): MethodDecorator {
  return function (target: any, propertyName: string | symbol, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const timeouts = new WeakMap()

    descriptor.value = function (this: any, ...args: any[]) {
      const timeout = timeouts.get(this)
      if (timeout) {
        clearTimeout(timeout)
      }

      const newTimeout = setTimeout(() => {
        if (options.leading) {
          method.apply(this, args)
        }
        timeouts.delete(this)
      }, delay)

      timeouts.set(this, newTimeout)

      // Execute immediately if leading edge is enabled and no timeout exists
      if (options.leading && !timeout) {
        method.apply(this, args)
      }
    }

    return descriptor
  }
}

/**
 * Debounce with leading edge execution
 */
export function DebounceLeading(delay: number = 300): MethodDecorator {
  return Debounce(delay, { leading: true })
}

/**
 * Debounce with trailing edge execution (default)
 */
export function DebounceTrailing(delay: number = 300): MethodDecorator {
  return Debounce(delay, { trailing: true })
}