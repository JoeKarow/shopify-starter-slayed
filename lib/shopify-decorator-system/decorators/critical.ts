/**
 * @Critical Decorator
 *
 * Marks components as critical for immediate loading
 */

import { registerComponent } from '../registry.js'
import type { DecoratorOptions } from '../types.js'

/**
 * Critical path component decorator
 *
 * @param options - Critical loading options
 */
export function Critical(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    registerComponent({
      name: constructor.name,
      constructor,
      critical: true,
      loadingStrategy: {
        type: 'eager',
      },
    })

    return constructor
  }
}

/**
 * Above-the-fold component (alias for Critical)
 */
export function AboveTheFold(options: DecoratorOptions = {}): ClassDecorator {
  return Critical(options)
}

/**
 * Inline critical component (embedded in HTML)
 */
export function InlineCritical(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    registerComponent({
      name: constructor.name,
      constructor,
      critical: true,
      loadingStrategy: {
        type: 'eager',
      },
    })

    return constructor
  }
}