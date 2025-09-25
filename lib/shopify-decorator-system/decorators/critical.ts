/**
 * @Critical Decorator
 *
 * Marks components as critical path for immediate loading
 * Cannot be used with @LazyLoad decorator
 */

import 'reflect-metadata'
import { ComponentRegistry } from '../registry.js'

/**
 * Critical decorator - marks component as critical path
 * Cannot be used with @LazyLoad
 */
export function Critical(): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const registry = ComponentRegistry.getInstance()

    // Check for conflicting @LazyLoad decorator
    const existingDecorators = Reflect.getMetadata('shopify:decorators', constructor) || []
    const hasLazyLoad = existingDecorators.some((d: any) => d.type === 'LazyLoad')

    if (hasLazyLoad) {
      console.warn(
        `Component ${constructor.name} has both @Critical and @LazyLoad decorators. ` +
        `@Critical takes precedence - component will load immediately.`
      )
    }

    // Get current file path for debugging
    const filePath = getComponentFilePath(constructor)

    const decoratorMeta = {
      type: 'Critical' as const,
      parameters: {}
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
    Reflect.defineMetadata('shopify:critical', true, constructor)

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