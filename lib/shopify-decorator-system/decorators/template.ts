/**
 * @Template Decorator
 *
 * Loads components only on specific Shopify templates
 */

import 'reflect-metadata'
import { ComponentRegistry } from '../registry.js'

export interface TemplateDecoratorOptions {
  templates: string[] | '*'  // '*' for all templates
}

/**
 * Template-specific component loading decorator
 *
 * @param options - Array of template names or TemplateDecoratorOptions object
 */
export function Template(
  options: string[] | TemplateDecoratorOptions
) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T): T {
    const registry = ComponentRegistry.getInstance()

    // Handle both array and object parameter formats
    const templates = Array.isArray(options)
      ? options
      : options.templates === '*'
        ? ['*']
        : Array.isArray(options.templates)
          ? options.templates
          : [options.templates as string]

    // Get current file path for debugging (will be enhanced by auto-discovery)
    const filePath = getComponentFilePath(constructor)

    const metadata = {
      className: constructor.name,
      filePath,
      decorators: [
        {
          type: 'Template' as const,
          parameters: Array.isArray(options) ? options : options
        }
      ],
      instance: new constructor()
    }

    registry.register(metadata)

    // Store template mapping for fast lookup
    Reflect.defineMetadata('shopify:templates', templates, constructor)
    Reflect.defineMetadata('shopify:decorators', metadata.decorators, constructor)

    return constructor
  }
}

/**
 * Get component file path for debugging
 * This is a placeholder - will be enhanced by the auto-discovery system
 */
function getComponentFilePath(constructor: any): string {
  // Try to extract from stack trace
  const stack = new Error().stack
  if (stack) {
    const match = stack.match(/at.*\(([^)]+)\)/)
    if (match && match[1]) {
      return match[1].split('?')[0] // Remove query params
    }
  }

  return `unknown/${constructor.name}.ts`
}

/**
 * Exclude from specific templates
 */
export function ExcludeTemplate(
  templates: string | string[]
) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T): T {
    const excludeNames = Array.isArray(templates) ? templates : [templates]

    // Get all possible Shopify template names, exclude specified ones
    const allTemplates = [
      'index', 'product', 'collection', 'blog', 'article', 'page',
      'cart', 'search', '404', 'password', 'gift_card', 'customers/login',
      'customers/register', 'customers/account', 'customers/order',
    ]

    const includeTemplates = allTemplates.filter(t => !excludeNames.includes(t))

    return Template(includeTemplates)(constructor) as T
  }
}

/**
 * Load on all templates (global component)
 */
export function GlobalTemplate() {
  return Template(['*'])
}