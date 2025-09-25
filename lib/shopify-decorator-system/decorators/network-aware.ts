/**
 * @NetworkAware Decorator
 *
 * Adapts component loading based on network speed and conditions
 */

import 'reflect-metadata'
import { ComponentRegistry } from '../registry.js'

export interface NetworkAwareDecoratorOptions {
  slowThreshold?: number      // Mbps, default: 10
  fallbackStrategy?: 'defer' | 'simplify' | 'critical-only'
  reduceQuality?: boolean     // Reduce asset quality on slow networks
}

/**
 * NetworkAware decorator - adapts loading based on network speed
 */
export function NetworkAware(options: NetworkAwareDecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const registry = ComponentRegistry.getInstance()

    // Validate slowThreshold
    if (options.slowThreshold !== undefined && options.slowThreshold < 0) {
      console.warn(
        `Component ${constructor.name} has invalid slowThreshold ${options.slowThreshold}. ` +
        `Using default 10 Mbps. Threshold must be positive.`
      )
      options.slowThreshold = 10
    }

    // Get current file path for debugging
    const filePath = getComponentFilePath(constructor)

    const decoratorMeta = {
      type: 'NetworkAware' as const,
      parameters: {
        slowThreshold: options.slowThreshold || 10, // Mbps
        fallbackStrategy: options.fallbackStrategy || 'defer',
        reduceQuality: options.reduceQuality || false
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
    Reflect.defineMetadata('shopify:network-aware', true, constructor)

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

/**
 * Get current network speed estimate in Mbps using Network Information API
 */
export function getNetworkSpeed(): number {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 10 // Default assumption: 10 Mbps
  }

  const connection = (navigator as any).connection
  if (!connection) {
    return 10
  }

  // Use downlink if available (this is in Mbps)
  if (connection.downlink) {
    return connection.downlink
  }

  // Fallback to effective type estimates
  const effectiveType = connection.effectiveType
  const speedEstimates = {
    'slow-2g': 0.1,
    '2g': 0.25,
    '3g': 1.5,
    '4g': 10
  }

  return speedEstimates[effectiveType as keyof typeof speedEstimates] || 10
}

/**
 * Check if user has save-data preference enabled
 */
export function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const connection = (navigator as any).connection
  return connection?.saveData === true
}