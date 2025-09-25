/**
 * T012: Contract test for Decorator system Template decorator
 *
 * This test defines the expected contract for the @Template decorator
 * which specifies which Shopify templates should load specific components.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  Template,
  TemplateDecoratorOptions,
  ComponentRegistry,
  ComponentMetadata,
  DecoratorMetadata
} from '../../specs/001-shopify-template-codesplitting/contracts/decorator-system'

describe('Decorator System: Template Decorator Contract (T012)', () => {
  let Template: typeof Template
  let registry: ComponentRegistry

  beforeEach(() => {
    // This will fail initially - decorator system doesn't exist yet
    const decoratorSystem = require('../../lib/shopify-decorator-system')
    Template = decoratorSystem.Template
    registry = decoratorSystem.registry

    // Clear registry for each test
    if (registry && typeof registry.clear === 'function') {
      registry.clear()
    }
  })

  describe('@Template decorator exists and has correct signature', () => {
    it('should have Template decorator function', () => {
      expect(Template).toBeDefined()
      expect(typeof Template).toBe('function')
    })

    it('should accept string array parameter', () => {
      expect(() => {
        @Template(['product', 'collection'])
        class TestComponent {}
      }).not.toThrow()
    })

    it('should accept TemplateDecoratorOptions parameter', () => {
      const options: TemplateDecoratorOptions = {
        templates: ['product', 'collection']
      }

      expect(() => {
        @Template(options)
        class TestComponent {}
      }).not.toThrow()
    })

    it('should accept wildcard template parameter', () => {
      expect(() => {
        @Template(['*'])
        class TestComponent {}
      }).not.toThrow()

      const optionsWildcard: TemplateDecoratorOptions = {
        templates: '*'
      }

      expect(() => {
        @Template(optionsWildcard)
        class TestComponent {}
      }).not.toThrow()
    })
  })

  describe('template-specific component registration', () => {
    it('should register component for specific templates', () => {
      @Template(['product', 'collection'])
      class ProductGallery {
        render() {
          return '<div class="product-gallery"></div>'
        }
      }

      const components = registry.getComponentsForTemplate('product')

      expect(components).toHaveLength(1)
      expect(components[0]).toEqual<ComponentMetadata>({
        className: 'ProductGallery',
        filePath: expect.any(String),
        decorators: [{
          type: 'Template',
          parameters: ['product', 'collection']
        }],
        instance: expect.any(Object)
      })
    })

    it('should register component for collection template as well', () => {
      @Template(['product', 'collection'])
      class ProductGallery {}

      const productComponents = registry.getComponentsForTemplate('product')
      const collectionComponents = registry.getComponentsForTemplate('collection')

      expect(productComponents).toHaveLength(1)
      expect(collectionComponents).toHaveLength(1)
      expect(productComponents[0].className).toBe('ProductGallery')
      expect(collectionComponents[0].className).toBe('ProductGallery')
    })

    it('should not register component for non-specified templates', () => {
      @Template(['product'])
      class ProductGallery {}

      const cartComponents = registry.getComponentsForTemplate('cart')
      expect(cartComponents).toHaveLength(0)
    })

    it('should handle single template specification', () => {
      @Template(['product'])
      class ProductDetails {}

      const components = registry.getComponentsForTemplate('product')
      expect(components).toHaveLength(1)
      expect(components[0].className).toBe('ProductDetails')
    })
  })

  describe('wildcard template registration', () => {
    it('should register component for all templates with array wildcard', () => {
      @Template(['*'])
      class GlobalHeader {}

      const productComponents = registry.getComponentsForTemplate('product')
      const collectionComponents = registry.getComponentsForTemplate('collection')
      const cartComponents = registry.getComponentsForTemplate('cart')
      const accountComponents = registry.getComponentsForTemplate('account')

      expect(productComponents.find(c => c.className === 'GlobalHeader')).toBeDefined()
      expect(collectionComponents.find(c => c.className === 'GlobalHeader')).toBeDefined()
      expect(cartComponents.find(c => c.className === 'GlobalHeader')).toBeDefined()
      expect(accountComponents.find(c => c.className === 'GlobalHeader')).toBeDefined()
    })

    it('should register component for all templates with options wildcard', () => {
      @Template({ templates: '*' })
      class GlobalFooter {}

      const productComponents = registry.getComponentsForTemplate('product')
      const homeComponents = registry.getComponentsForTemplate('index')

      expect(productComponents.find(c => c.className === 'GlobalFooter')).toBeDefined()
      expect(homeComponents.find(c => c.className === 'GlobalFooter')).toBeDefined()
    })
  })

  describe('multiple components per template', () => {
    it('should register multiple components for same template', () => {
      @Template(['product'])
      class ProductGallery {}

      @Template(['product'])
      class ProductDetails {}

      @Template(['product'])
      class ProductReviews {}

      const components = registry.getComponentsForTemplate('product')

      expect(components).toHaveLength(3)
      expect(components.map(c => c.className)).toContain('ProductGallery')
      expect(components.map(c => c.className)).toContain('ProductDetails')
      expect(components.map(c => c.className)).toContain('ProductReviews')
    })

    it('should maintain separate registrations for different templates', () => {
      @Template(['product'])
      class ProductGallery {}

      @Template(['collection'])
      class CollectionGrid {}

      const productComponents = registry.getComponentsForTemplate('product')
      const collectionComponents = registry.getComponentsForTemplate('collection')

      expect(productComponents).toHaveLength(1)
      expect(collectionComponents).toHaveLength(1)
      expect(productComponents[0].className).toBe('ProductGallery')
      expect(collectionComponents[0].className).toBe('CollectionGrid')
    })
  })

  describe('decorator metadata storage', () => {
    it('should store template decorator metadata correctly', () => {
      @Template(['product', 'collection'])
      class TestComponent {}

      const components = registry.getComponentsForTemplate('product')
      const decoratorMeta = components[0].decorators.find(d => d.type === 'Template')

      expect(decoratorMeta).toBeDefined()
      expect(decoratorMeta).toEqual<DecoratorMetadata>({
        type: 'Template',
        parameters: ['product', 'collection']
      })
    })

    it('should store wildcard template metadata correctly', () => {
      @Template({ templates: '*' })
      class GlobalComponent {}

      const components = registry.getComponentsForTemplate('product')
      const decoratorMeta = components[0].decorators.find(d => d.type === 'Template')

      expect(decoratorMeta).toEqual<DecoratorMetadata>({
        type: 'Template',
        parameters: { templates: '*' }
      })
    })
  })

  describe('component loading strategy integration', () => {
    it('should provide correct loading strategy for template-specific components', () => {
      @Template(['product'])
      class ProductComponent {}

      const components = registry.getComponentsForTemplate('product')
      const component = components[0]

      const strategy = registry.getLoadingStrategy(component, {
        template: 'product',
        network: 'fast'
      })

      expect(strategy.trigger).toBe('immediate')
      expect(typeof strategy.priority).toBe('number')
    })

    it('should not load component on non-matching templates', () => {
      @Template(['product'])
      class ProductComponent {}

      const components = registry.getComponentsForTemplate('cart')
      expect(components).toHaveLength(0)
    })

    it('should handle dynamic template matching', () => {
      @Template(['product', 'collection'])
      class SharedGallery {}

      // Should load on both templates
      expect(registry.getComponentsForTemplate('product')).toHaveLength(1)
      expect(registry.getComponentsForTemplate('collection')).toHaveLength(1)
      expect(registry.getComponentsForTemplate('cart')).toHaveLength(0)
    })
  })

  describe('file path tracking', () => {
    it('should track component file path for development', () => {
      @Template(['product'])
      class ProductComponent {}

      const components = registry.getComponentsForTemplate('product')

      expect(components[0].filePath).toBeDefined()
      expect(typeof components[0].filePath).toBe('string')
      expect(components[0].filePath).toMatch(/\.ts$|\.js$/) // Should end with .ts or .js
    })
  })

  describe('error handling and validation', () => {
    it('should handle empty template array', () => {
      expect(() => {
        @Template([])
        class EmptyTemplateComponent {}
      }).not.toThrow()

      // Should not be registered for any template
      expect(registry.getComponentsForTemplate('product')).toHaveLength(0)
      expect(registry.getComponentsForTemplate('collection')).toHaveLength(0)
    })

    it('should handle invalid template names gracefully', () => {
      expect(() => {
        @Template(['invalid-template-name'])
        class InvalidComponent {}
      }).not.toThrow()

      // Should still register but component won't be loaded
      const components = registry.getComponentsForTemplate('invalid-template-name')
      expect(components).toHaveLength(1)
    })

    it('should handle undefined or null parameters gracefully', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid input
        @Template(null)
        class NullComponent {}
      }).not.toThrow()

      expect(() => {
        // @ts-expect-error - Testing invalid input
        @Template(undefined)
        class UndefinedComponent {}
      }).not.toThrow()
    })

    it('should validate template names against Shopify standards', () => {
      // Valid Shopify template names
      const validTemplates = ['product', 'collection', 'cart', 'account', 'index', '404', 'search']

      validTemplates.forEach(template => {
        expect(() => {
          @Template([template])
          class ValidComponent {}
        }).not.toThrow()
      })
    })
  })

  describe('component instance management', () => {
    it('should create component instances when registered', () => {
      @Template(['product'])
      class ProductComponent {
        value = 'test'
        method() {
          return this.value
        }
      }

      const components = registry.getComponentsForTemplate('product')
      const component = components[0]

      expect(component.instance).toBeDefined()
      expect(component.instance.value).toBe('test')
      expect(typeof component.instance.method).toBe('function')
      expect(component.instance.method()).toBe('test')
    })

    it('should maintain separate instances for each registration', () => {
      @Template(['product'])
      class StatefulComponent {
        counter = 0
        increment() {
          this.counter++
        }
      }

      const components = registry.getComponentsForTemplate('product')
      const instance1 = components[0].instance
      const instance2 = components[0].instance

      instance1.increment()

      // Should be the same instance (singleton per registration)
      expect(instance1.counter).toBe(1)
      expect(instance2.counter).toBe(1)
      expect(instance1).toBe(instance2)
    })
  })

  describe('template inheritance and overrides', () => {
    it('should handle template inheritance correctly', () => {
      class BaseComponent {}

      @Template(['product'])
      class ExtendedComponent extends BaseComponent {}

      const components = registry.getComponentsForTemplate('product')

      expect(components).toHaveLength(1)
      expect(components[0].className).toBe('ExtendedComponent')
      expect(components[0].instance).toBeInstanceOf(ExtendedComponent)
      expect(components[0].instance).toBeInstanceOf(BaseComponent)
    })
  })
})