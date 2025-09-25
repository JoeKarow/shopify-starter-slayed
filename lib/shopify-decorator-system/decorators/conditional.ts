/**
 * @Conditional Decorator
 *
 * Loads components based on custom conditions
 */

import { registerComponent } from '../registry.js'
import type { DecoratorOptions, ConditionalConfig } from '../types.js'

/**
 * Conditional component loading decorator
 *
 * @param condition - Function that returns boolean for loading condition
 * @param options - Additional decorator options
 */
export function Conditional(
  condition: () => boolean,
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const conditionalConfig: ConditionalConfig = {
      custom: condition,
    }

    registerComponent({
      name: constructor.name,
      constructor,
      conditions: [{
        type: 'custom',
        config: conditionalConfig,
      }],
      loadingStrategy: {
        type: 'lazy',
      },
    })

    return constructor
  }
}

/**
 * Load based on media query
 */
export function MediaQuery(
  mediaQuery: string,
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const conditionalConfig: ConditionalConfig = {
      media: mediaQuery,
    }

    registerComponent({
      name: constructor.name,
      constructor,
      conditions: [{
        type: 'custom',
        config: conditionalConfig,
      }],
      loadingStrategy: {
        type: 'lazy',
      },
    })

    return constructor
  }
}

/**
 * Load based on feature detection
 */
export function FeatureDetection(
  feature: string,
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const conditionalConfig: ConditionalConfig = {
      feature,
    }

    registerComponent({
      name: constructor.name,
      constructor,
      conditions: [{
        type: 'feature',
        config: conditionalConfig,
      }],
      loadingStrategy: {
        type: 'lazy',
      },
    })

    return constructor
  }
}

/**
 * Load only on touch devices
 */
export function TouchOnly(options: DecoratorOptions = {}): ClassDecorator {
  return FeatureDetection('touchstart', options)
}

/**
 * Load only on desktop (non-touch)
 */
export function DesktopOnly(options: DecoratorOptions = {}): ClassDecorator {
  return Conditional(() => {
    return typeof window !== 'undefined' && !('ontouchstart' in window)
  }, options)
}

/**
 * Load only if viewport is above certain width
 */
export function MinWidth(width: number, options: DecoratorOptions = {}): ClassDecorator {
  return MediaQuery(`(min-width: ${width}px)`, options)
}

/**
 * Load only if viewport is below certain width
 */
export function MaxWidth(width: number, options: DecoratorOptions = {}): ClassDecorator {
  return MediaQuery(`(max-width: ${width}px)`, options)
}