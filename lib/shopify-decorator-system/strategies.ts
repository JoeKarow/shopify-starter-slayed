/**
 * Loading Strategy Calculator
 *
 * Calculates optimal loading strategies for components based on decorators,
 * network conditions, and runtime context
 */

import type { ComponentMetadata, LoadingStrategy } from './registry.js'
import { getNetworkSpeed, isSaveDataEnabled } from './decorators/network-aware.js'

export interface LoadingContext {
  template: string
  network?: 'slow' | 'fast'
  viewport?: DOMRect
  userAgent?: string
  deviceMemory?: number
  connectionType?: string
  isOnline?: boolean
}

/**
 * Calculate the optimal loading strategy for a component
 */
export function calculateLoadingStrategy(
  component: ComponentMetadata,
  context: LoadingContext
): LoadingStrategy {
  const decorators = component.decorators || []

  // Priority order: Critical > Template + Network > LazyLoad
  const criticalDecorator = decorators.find(d => d.type === 'Critical')
  const templateDecorator = decorators.find(d => d.type === 'Template')
  const lazyDecorator = decorators.find(d => d.type === 'LazyLoad')
  const networkDecorator = decorators.find(d => d.type === 'NetworkAware')

  // Critical components always load immediately
  if (criticalDecorator) {
    return {
      trigger: 'immediate',
      priority: 1,
      conditions: undefined
    }
  }

  // Check template matching
  if (templateDecorator && templateDecorator.type === 'Template') {
    const params = templateDecorator.parameters as import('./decorators/template.js').TemplateDecoratorOptions
    const templates = params.templates === '*'
      ? ['*']
      : Array.isArray(params.templates)
        ? params.templates
        : [params.templates as string]

    // Skip if not on matching template
    if (!templates.includes(context.template) && !templates.includes('*')) {
      return {
        trigger: 'never' as any,
        priority: 999
      }
    }
  }

  // Calculate network-aware strategy
  if (networkDecorator) {
    return calculateNetworkAwareStrategy(networkDecorator.parameters, context)
  }

  // Calculate lazy loading strategy
  if (lazyDecorator) {
    return calculateLazyLoadStrategy(lazyDecorator.parameters, context)
  }

  // Default strategy for components without specific decorators
  return {
    trigger: 'immediate',
    priority: 10
  }
}

/**
 * Calculate network-aware loading strategy
 */
function calculateNetworkAwareStrategy(
  parameters: any,
  context: LoadingContext
): LoadingStrategy {
  const slowThreshold = parameters.slowThreshold || 10 // Mbps
  const fallbackStrategy = parameters.fallbackStrategy || 'defer'
  const reduceQuality = parameters.reduceQuality || false

  // Get current network speed
  const networkSpeed = getNetworkSpeed()
  const saveDataEnabled = isSaveDataEnabled()

  // Consider user preferences
  if (saveDataEnabled) {
    return {
      trigger: 'interaction',
      priority: 25,
      conditions: {
        network: {
          minSpeed: slowThreshold
        }
      }
    }
  }

  // Slow network detection
  const isSlowNetwork = networkSpeed < slowThreshold || context.network === 'slow'

  if (isSlowNetwork) {
    switch (fallbackStrategy) {
      case 'defer':
        return {
          trigger: 'idle',
          priority: 20,
          conditions: {
            network: {
              minSpeed: slowThreshold
            }
          }
        }

      case 'critical-only':
        return {
          trigger: 'interaction',
          priority: 30,
          conditions: {
            network: {
              minSpeed: slowThreshold
            }
          }
        }

      case 'simplify':
        return {
          trigger: 'viewport',
          priority: 15,
          conditions: {
            viewport: {
              rootMargin: '200vh', // Larger margin for slow networks
              threshold: 0.05      // Lower threshold
            },
            network: {
              minSpeed: slowThreshold
            }
          }
        }

      default:
        return {
          trigger: 'immediate',
          priority: 15
        }
    }
  }

  // Fast network - load normally
  return {
    trigger: 'immediate',
    priority: 5
  }
}

/**
 * Calculate lazy loading strategy
 */
function calculateLazyLoadStrategy(
  parameters: any,
  context: LoadingContext
): LoadingStrategy {
  const rootMargin = parameters.rootMargin || '100vh'
  const threshold = parameters.threshold || 0.1

  // Adjust for slow networks
  const networkSpeed = getNetworkSpeed()
  const isSlowNetwork = networkSpeed < 5 // 5 Mbps threshold

  const adjustedMargin = isSlowNetwork
    ? adjustRootMarginForSlowNetwork(rootMargin)
    : rootMargin

  const adjustedThreshold = isSlowNetwork
    ? Math.max(0.05, threshold * 0.5) // Lower threshold for slow networks
    : threshold

  return {
    trigger: 'viewport',
    priority: 10,
    conditions: {
      viewport: {
        rootMargin: adjustedMargin,
        threshold: adjustedThreshold
      }
    },
    fallback: {
      trigger: 'idle',
      priority: 20
    }
  }
}

/**
 * Adjust root margin for slow network conditions
 */
function adjustRootMarginForSlowNetwork(rootMargin: string): string {
  // Parse and increase margin for better UX on slow networks
  const match = rootMargin.match(/^(-?\d+(?:\.\d+)?)(px|vh|%|em|rem)?(.*)$/)
  if (!match) return rootMargin

  const [, value, unit = 'px', rest] = match
  const numValue = parseFloat(value)
  const adjustedValue = Math.min(numValue * 1.5, numValue + 200) // Increase by 50% or 200px, whichever is less

  return `${adjustedValue}${unit}${rest}`
}

/**
 * Get component loading priority based on multiple factors
 */
export function calculatePriority(
  component: ComponentMetadata,
  context: LoadingContext
): number {
  let priority = 10 // Base priority

  const decorators = component.decorators || []

  // Critical components get highest priority
  if (decorators.some(d => d.type === 'Critical')) {
    return 1
  }

  // Template-specific components get higher priority on matching templates
  const templateDecorator = decorators.find(d => d.type === 'Template')
  if (templateDecorator && templateDecorator.type === 'Template') {
    const params = templateDecorator.parameters as import('./decorators/template.js').TemplateDecoratorOptions
    const templates = params.templates === '*'
      ? ['*']
      : Array.isArray(params.templates)
        ? params.templates
        : [params.templates as string]

    if (templates.includes(context.template) || templates.includes('*')) {
      priority -= 2 // Higher priority for matching templates
    }
  }

  // LazyLoad components get lower priority
  if (decorators.some(d => d.type === 'LazyLoad')) {
    priority += 5
  }

  // Network-aware components adjust based on network speed
  if (decorators.some(d => d.type === 'NetworkAware')) {
    const networkSpeed = getNetworkSpeed()
    if (networkSpeed < 5) {
      priority += 3 // Lower priority on slow networks
    } else if (networkSpeed > 20) {
      priority -= 1 // Higher priority on fast networks
    }
  }

  return Math.max(1, priority) // Ensure priority is at least 1
}

/**
 * Determine if a component should be preloaded
 */
export function shouldPreload(
  component: ComponentMetadata,
  context: LoadingContext
): boolean {
  const strategy = calculateLoadingStrategy(component, context)

  // Preload critical and immediate components
  if (strategy.trigger === 'immediate' && strategy.priority <= 5) {
    return true
  }

  // Don't preload on slow networks or with save-data enabled
  if (context.network === 'slow' || isSaveDataEnabled()) {
    return false
  }

  // Preload viewport components with high priority
  if (strategy.trigger === 'viewport' && strategy.priority <= 10) {
    return true
  }

  return false
}

/**
 * Get estimated loading time for a component
 */
export function estimateLoadingTime(
  component: ComponentMetadata,
  context: LoadingContext
): number {
  const networkSpeed = getNetworkSpeed()
  const baseSize = 50 // KB - estimated component size

  // Adjust size based on component type
  let estimatedSize = baseSize
  const decorators = component.decorators || []

  if (decorators.some(d => d.type === 'Critical')) {
    estimatedSize *= 0.8 // Critical components tend to be smaller
  }

  if (decorators.some(d => d.type === 'LazyLoad')) {
    estimatedSize *= 1.5 // Lazy components might be larger
  }

  // Convert network speed from Mbps to KB/s
  const speedKBps = (networkSpeed * 1024) / 8

  // Estimate loading time in milliseconds
  return (estimatedSize / speedKBps) * 1000
}