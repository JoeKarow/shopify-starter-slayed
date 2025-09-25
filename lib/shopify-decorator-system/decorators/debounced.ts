/**
 * @Debounced Method Decorator
 *
 * Delays method execution to reduce call frequency
 */

export interface DebouncedOptions {
  delay: number  // milliseconds
  leading?: boolean
  trailing?: boolean
}

/**
 * Debounced decorator - delays method execution
 */
export function Debounced(options: number | DebouncedOptions): MethodDecorator {
  return function (target: any, propertyName: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    // Parse options
    const config: DebouncedOptions = typeof options === 'number'
      ? { delay: options, leading: false, trailing: true }
      : { leading: false, trailing: true, ...options }

    // Validate delay
    if (config.delay < 0) {
      console.warn(
        `@Debounced decorator on ${target.constructor.name}.${String(propertyName)} ` +
        `has invalid delay ${config.delay}ms. Using 0ms.`
      )
      config.delay = 0
    }

    // Store timeout references per instance
    const timeouts = new WeakMap()

    descriptor.value = function (this: any, ...args: any[]) {
      const existingTimeout = timeouts.get(this)

      // Clear existing timeout
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Execute on leading edge if enabled and no existing timeout
      if (config.leading && !existingTimeout) {
        originalMethod.apply(this, args)
      }

      // Set new timeout for trailing execution
      if (config.trailing) {
        const newTimeout = setTimeout(() => {
          timeouts.delete(this)
          if (!config.leading) {
            originalMethod.apply(this, args)
          }
        }, config.delay)

        timeouts.set(this, newTimeout)
      }
    }

    return descriptor
  }
}

/**
 * Quick debounce with default 300ms delay
 */
export function DebounceQuick(): MethodDecorator {
  return Debounced({ delay: 300, trailing: true })
}

/**
 * Debounce with leading edge execution
 */
export function DebounceLeading(delay: number = 300): MethodDecorator {
  return Debounced({ delay, leading: true, trailing: false })
}

/**
 * Debounce with both leading and trailing execution
 */
export function DebounceBoth(delay: number = 300): MethodDecorator {
  return Debounced({ delay, leading: true, trailing: true })
}