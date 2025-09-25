/**
 * @NetworkAware Decorator
 *
 * Adapts component loading based on network conditions
 */

import { registerComponent } from '../registry.js'
import type { DecoratorOptions, NetworkCondition } from '../types.js'

/**
 * Network-aware component loading decorator
 *
 * @param options - Network condition options
 */
export function NetworkAware(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const networkCondition: NetworkCondition = {
      slowThreshold: options.slowThreshold || 200,
      saveData: options.saveData !== false, // Default to true
    }

    registerComponent({
      name: constructor.name,
      constructor,
      networkAware: true,
      conditions: [{
        type: 'network',
        config: networkCondition,
      }],
      loadingStrategy: getNetworkAwareStrategy(networkCondition),
    })

    return constructor
  }
}

/**
 * Load only on fast connections
 */
export function FastConnectionOnly(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const networkCondition: NetworkCondition = {
      fastThreshold: options.slowThreshold || 100,
      effectiveType: '4g',
    }

    registerComponent({
      name: constructor.name,
      constructor,
      networkAware: true,
      conditions: [{
        type: 'network',
        config: networkCondition,
      }],
      loadingStrategy: {
        type: 'lazy',
        options: { timeout: options.timeout || 10000 },
      },
    })

    return constructor
  }
}

/**
 * Respect save-data preference
 */
export function RespectSaveData(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const networkCondition: NetworkCondition = {
      saveData: true,
    }

    // Check if save-data is enabled
    const saveDataEnabled = typeof navigator !== 'undefined' &&
      'connection' in navigator &&
      (navigator as any).connection?.saveData

    registerComponent({
      name: constructor.name,
      constructor,
      networkAware: true,
      conditions: [{
        type: 'network',
        config: networkCondition,
      }],
      loadingStrategy: saveDataEnabled ? {
        type: 'interaction', // Only load on user interaction if save-data is on
      } : {
        type: 'lazy',
      },
    })

    return constructor
  }
}

/**
 * Determine loading strategy based on network conditions
 */
function getNetworkAwareStrategy(condition: NetworkCondition) {
  if (typeof navigator === 'undefined') {
    return { type: 'lazy' as const }
  }

  const connection = (navigator as any).connection
  if (!connection) {
    return { type: 'lazy' as const }
  }

  // Check save-data preference
  if (condition.saveData && connection.saveData) {
    return { type: 'interaction' as const }
  }

  // Check connection speed
  const rtt = connection.rtt || 0
  if (condition.slowThreshold && rtt > condition.slowThreshold) {
    return { type: 'interaction' as const }
  }

  if (condition.fastThreshold && rtt < condition.fastThreshold) {
    return { type: 'eager' as const }
  }

  // Check effective type
  if (condition.effectiveType) {
    const effectiveType = connection.effectiveType
    const typeOrder = { '2g': 0, '3g': 1, '4g': 2 }
    const requiredOrder = typeOrder[condition.effectiveType]
    const currentOrder = typeOrder[effectiveType] ?? -1

    if (currentOrder < requiredOrder) {
      return { type: 'interaction' as const }
    }
  }

  return { type: 'lazy' as const }
}