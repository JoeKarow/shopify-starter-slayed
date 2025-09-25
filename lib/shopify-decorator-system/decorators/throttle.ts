/**
 * @Throttle Decorator
 *
 * Utility decorator for throttling method calls
 */

import type { DecoratorOptions } from '../types.js'

/**
 * Throttle method decorator
 *
 * @param delay - Throttle delay in milliseconds
 * @param options - Throttle options
 */
export function Throttle(
  delay: number = 300,
  options: DecoratorOptions = {}
): MethodDecorator {
  return function (target: any, propertyName: string | symbol, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const timeouts = new WeakMap()
    const lastCalls = new WeakMap()

    descriptor.value = function (this: any, ...args: any[]) {
      const now = Date.now()
      const lastCall = lastCalls.get(this) || 0
      const timeSinceLastCall = now - lastCall

      if (timeSinceLastCall >= delay) {
        // Execute immediately if enough time has passed
        if (options.leading !== false) {
          method.apply(this, args)
          lastCalls.set(this, now)
        }
      } else {
        // Clear existing timeout
        const existingTimeout = timeouts.get(this)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Set new timeout for trailing execution
        if (options.trailing !== false) {
          const timeout = setTimeout(() => {
            method.apply(this, args)
            lastCalls.set(this, Date.now())
            timeouts.delete(this)
          }, delay - timeSinceLastCall)

          timeouts.set(this, timeout)
        }
      }
    }

    return descriptor
  }
}

/**
 * Throttle with leading edge execution only
 */
export function ThrottleLeading(delay: number = 300): MethodDecorator {
  return Throttle(delay, { leading: true, trailing: false })
}

/**
 * Throttle with trailing edge execution only
 */
export function ThrottleTrailing(delay: number = 300): MethodDecorator {
  return Throttle(delay, { leading: false, trailing: true })
}