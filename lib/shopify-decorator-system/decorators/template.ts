/**
 * @Template Decorator
 *
 * Loads components only on specific Shopify templates
 */

import { registerComponent } from '../registry.js'
import type { DecoratorOptions } from '../types.js'

/**
 * Template-specific component loading decorator
 *
 * @param templates - Array of template names or single template name
 * @param options - Additional decorator options
 */
export function Template(
  templates: string | string[],
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const templateNames = Array.isArray(templates) ? templates : [templates]

    registerComponent({
      name: constructor.name,
      constructor,
      templates: templateNames,
      critical: false,
      loadingStrategy: {
        type: 'eager',
      },
    })

    return constructor
  }
}

/**
 * Exclude from specific templates
 */
export function ExcludeTemplate(
  templates: string | string[],
  options: DecoratorOptions = {}
): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const excludeNames = Array.isArray(templates) ? templates : [templates]

    // Get all possible Shopify template names, exclude specified ones
    const allTemplates = [
      'index', 'product', 'collection', 'blog', 'article', 'page',
      'cart', 'search', '404', 'password', 'gift_card', 'customers/login',
      'customers/register', 'customers/account', 'customers/order',
    ]

    const includeTemplates = allTemplates.filter(t => !excludeNames.includes(t))

    registerComponent({
      name: constructor.name,
      constructor,
      templates: includeTemplates,
      critical: false,
      loadingStrategy: {
        type: 'eager',
      },
    })

    return constructor
  }
}

/**
 * Load on all templates (global component)
 */
export function GlobalTemplate(options: DecoratorOptions = {}): ClassDecorator {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    registerComponent({
      name: constructor.name,
      constructor,
      templates: ['*'], // Wildcard for all templates
      critical: options.priority ? options.priority > 0 : false,
      loadingStrategy: {
        type: 'eager',
      },
    })

    return constructor
  }
}