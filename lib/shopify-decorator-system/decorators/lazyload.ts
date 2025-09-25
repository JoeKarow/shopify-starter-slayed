/**
 * @LazyLoad Decorator
 *
 * Enables viewport-based lazy loading for components using IntersectionObserver
 */

import 'reflect-metadata'
import { ComponentRegistry } from '../registry.js'

export interface LazyLoadDecoratorOptions {
  rootMargin?: string     // Default: '100vh'
  threshold?: number      // Default: 0.1
  placeholder?: string    // Optional placeholder component
}

/**
 * LazyLoad decorator - enables viewport-based lazy loading
 * Cannot be used with @Critical decorator
 */
export function LazyLoad(options: LazyLoadDecoratorOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T): T {
    const registry = ComponentRegistry.getInstance()

    // Check for conflicting @Critical decorator
    const existingDecorators = Reflect.getMetadata('shopify:decorators', constructor) || []
    const hasCritical = existingDecorators.some((d: any) => d.type === 'Critical')

    if (hasCritical) {
      console.warn(
        `Component ${constructor.name} has both @LazyLoad and @Critical decorators. ` +
        `@Critical takes precedence - component will load immediately.`
      )
      return constructor
    }

    // Validate threshold range
    if (options.threshold !== undefined && (options.threshold < 0 || options.threshold > 1)) {
      console.warn(
        `Component ${constructor.name} has invalid threshold ${options.threshold}. ` +
        `Using default 0.1. Threshold must be between 0 and 1.`
      )
      options.threshold = 0.1
    }

    // Get current file path for debugging
    const filePath = getComponentFilePath(constructor)

    const decoratorMeta = {
      type: 'LazyLoad' as const,
      parameters: {
        rootMargin: options.rootMargin || '100vh',
        threshold: options.threshold || 0.1,
        ...(options.placeholder && { placeholder: options.placeholder })
      }
    }

    const metadata = {
      className: constructor.name,
      filePath,
      decorators: [decoratorMeta],
      instance: new constructor()
    }

    registry.register(metadata)

    // Store decorator metadata
    Reflect.defineMetadata('shopify:decorators', [decoratorMeta], constructor)
    Reflect.defineMetadata('shopify:lazy-load', true, constructor)

    return constructor
  }
}

/**
 * Get component file path for debugging
 */
function getComponentFilePath(constructor: any): string {
  const stack = new Error().stack
  if (stack) {
    const match = stack.match(/at.*\(([^)]+)\)/)
    if (match && match[1]) {
      return match[1].split('?')[0]
    }
  }
  return `unknown/${constructor.name}.ts`
}