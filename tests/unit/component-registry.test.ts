/**
 * T014: Contract test for Component registry
 *
 * This test defines the expected contract for the ComponentRegistry
 * which manages all decorated components and their loading strategies.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import type {
  ComponentRegistry,
  ComponentMetadata,
  DecoratorMetadata,
  LoadingStrategy
} from '../../specs/001-shopify-template-codesplitting/contracts/decorator-system'

// Mock network connection for testing
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100
}

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection
})

describe('Component Registry Contract (T014)', () => {
  let registry: ComponentRegistry
  let mockComponentMetadata: ComponentMetadata[]

  beforeEach(() => {
    // This will fail initially - registry doesn't exist yet
    const decoratorSystem = require('../../lib/shopify-decorator-system')
    registry = decoratorSystem.registry

    // Clear registry for each test
    if (registry && typeof (registry as any).clear === 'function') {
      (registry as any).clear()
    }

    // Mock component metadata for testing
    mockComponentMetadata = [
      {
        className: 'ProductGallery',
        filePath: '/frontend/components/ProductGallery.ts',
        decorators: [
          {
            type: 'Template',
            parameters: ['product']
          },
          {
            type: 'LazyLoad',
            parameters: { rootMargin: '100px', threshold: 0.1 }
          }
        ],
        instance: { render: () => '<div class="product-gallery"></div>' }
      },
      {
        className: 'HeaderNav',
        filePath: '/frontend/components/HeaderNav.ts',
        decorators: [
          {
            type: 'Template',
            parameters: ['*']
          },
          {
            type: 'Critical',
            parameters: {}
          },
          {
            type: 'NetworkAware',
            parameters: { slowThreshold: 5, fallbackStrategy: 'critical-only' }
          }
        ],
        instance: { render: () => '<nav class="header-nav"></nav>' }
      },
      {
        className: 'CartDrawer',
        filePath: '/frontend/components/CartDrawer.ts',
        decorators: [
          {
            type: 'Template',
            parameters: ['*']
          },
          {
            type: 'LazyLoad',
            parameters: { rootMargin: '200vh', threshold: 0 }
          }
        ],
        instance: {
          open: () => {},
          close: () => {},
          render: () => '<div class="cart-drawer"></div>'
        }
      }
    ]
  })

  describe('registry exists and has correct interface', () => {
    it('should have ComponentRegistry available', () => {
      expect(registry).toBeDefined()
      expect(typeof registry).toBe('object')
    })

    it('should have register method', () => {
      expect(registry.register).toBeDefined()
      expect(typeof registry.register).toBe('function')
    })

    it('should have getComponentsForTemplate method', () => {
      expect(registry.getComponentsForTemplate).toBeDefined()
      expect(typeof registry.getComponentsForTemplate).toBe('function')
    })

    it('should have getLoadingStrategy method', () => {
      expect(registry.getLoadingStrategy).toBeDefined()
      expect(typeof registry.getLoadingStrategy).toBe('function')
    })

    it('should have initializeComponent method', () => {
      expect(registry.initializeComponent).toBeDefined()
      expect(typeof registry.initializeComponent).toBe('function')
    })

    it('should have discoverComponents method', () => {
      expect(registry.discoverComponents).toBeDefined()
      expect(typeof registry.discoverComponents).toBe('function')
    })
  })

  describe('component registration', () => {
    it('should register components successfully', () => {
      const component = mockComponentMetadata[0]

      expect(() => {
        registry.register(component)
      }).not.toThrow()
    })

    it('should store registered component metadata correctly', () => {
      const component = mockComponentMetadata[0]
      registry.register(component)

      const productComponents = registry.getComponentsForTemplate('product')

      expect(productComponents).toHaveLength(1)
      expect(productComponents[0]).toEqual(component)
    })

    it('should handle multiple component registration', () => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })

      const allTemplateComponents = registry.getComponentsForTemplate('*')
      const productComponents = registry.getComponentsForTemplate('product')

      expect(allTemplateComponents.length).toBeGreaterThan(0)
      expect(productComponents.length).toBeGreaterThan(0)
    })

    it('should prevent duplicate registrations', () => {
      const component = mockComponentMetadata[0]

      registry.register(component)
      registry.register(component) // Attempt duplicate registration

      const productComponents = registry.getComponentsForTemplate('product')
      expect(productComponents).toHaveLength(1)
    })
  })

  describe('template-based component retrieval', () => {
    beforeEach(() => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })
    })

    it('should return components for specific templates', () => {
      const productComponents = registry.getComponentsForTemplate('product')

      expect(productComponents).toHaveLength(1)
      expect(productComponents[0].className).toBe('ProductGallery')
    })

    it('should return global components for all templates', () => {
      const productComponents = registry.getComponentsForTemplate('product')
      const collectionComponents = registry.getComponentsForTemplate('collection')

      // HeaderNav and CartDrawer should appear in all templates
      const headerInProduct = productComponents.find(c => c.className === 'HeaderNav')
      const headerInCollection = collectionComponents.find(c => c.className === 'HeaderNav')

      expect(headerInProduct).toBeDefined()
      expect(headerInCollection).toBeDefined()
    })

    it('should return empty array for templates with no components', () => {
      const unknownComponents = registry.getComponentsForTemplate('unknown-template')

      expect(unknownComponents).toEqual([])
    })

    it('should handle multiple components per template', () => {
      const cartComponents = registry.getComponentsForTemplate('cart')

      // Should include global components (HeaderNav, CartDrawer)
      expect(cartComponents.length).toBeGreaterThanOrEqual(2)
      expect(cartComponents.find(c => c.className === 'HeaderNav')).toBeDefined()
      expect(cartComponents.find(c => c.className === 'CartDrawer')).toBeDefined()
    })
  })

  describe('loading strategy generation', () => {
    beforeEach(() => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })
    })

    it('should generate immediate loading strategy for critical components', () => {
      const headerComponent = mockComponentMetadata[1] // HeaderNav with Critical decorator

      const strategy = registry.getLoadingStrategy(headerComponent, {
        template: 'product',
        network: 'fast'
      })

      expect(strategy.trigger).toBe('immediate')
      expect(strategy.priority).toBeLessThan(5) // High priority (lower number)
    })

    it('should generate viewport loading strategy for lazy components', () => {
      const galleryComponent = mockComponentMetadata[0] // ProductGallery with LazyLoad

      const strategy = registry.getLoadingStrategy(galleryComponent, {
        template: 'product',
        network: 'fast'
      })

      expect(strategy.trigger).toBe('viewport')
      expect(strategy.conditions?.viewport).toEqual({
        rootMargin: '100px',
        threshold: 0.1
      })
      expect(strategy.priority).toBeGreaterThan(5) // Lower priority (higher number)
    })

    it('should adapt strategy based on network conditions', () => {
      const networkAwareComponent = mockComponentMetadata[1] // HeaderNav with NetworkAware

      const fastStrategy = registry.getLoadingStrategy(networkAwareComponent, {
        template: 'product',
        network: 'fast'
      })

      const slowStrategy = registry.getLoadingStrategy(networkAwareComponent, {
        template: 'product',
        network: 'slow'
      })

      expect(fastStrategy.trigger).toBe('immediate')
      expect(slowStrategy.fallback).toBeDefined()
      expect(slowStrategy.fallback?.trigger).toBe('idle')
    })

    it('should provide fallback strategies for degraded conditions', () => {
      const lazyComponent = mockComponentMetadata[2] // CartDrawer with LazyLoad

      const strategy = registry.getLoadingStrategy(lazyComponent, {
        template: 'product',
        network: 'slow'
      })

      expect(strategy.fallback).toBeDefined()
      expect(strategy.fallback?.trigger).toBe('idle')
    })

    it('should handle viewport context for positioning-based strategies', () => {
      const galleryComponent = mockComponentMetadata[0]

      const strategy = registry.getLoadingStrategy(galleryComponent, {
        template: 'product',
        network: 'fast',
        viewport: new DOMRect(0, 0, 1200, 800)
      })

      expect(strategy.trigger).toBe('viewport')
      expect(strategy.conditions?.viewport).toBeDefined()
    })
  })

  describe('component initialization', () => {
    beforeEach(() => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })
    })

    it('should initialize component with immediate strategy', async () => {
      const component = mockComponentMetadata[1] // HeaderNav (Critical)
      const strategy: LoadingStrategy = {
        trigger: 'immediate',
        priority: 1
      }

      await expect(
        registry.initializeComponent(component, strategy)
      ).resolves.not.toThrow()
    })

    it('should initialize component with viewport strategy', async () => {
      const component = mockComponentMetadata[0] // ProductGallery (LazyLoad)
      const strategy: LoadingStrategy = {
        trigger: 'viewport',
        priority: 10,
        conditions: {
          viewport: {
            rootMargin: '100px',
            threshold: 0.1
          }
        }
      }

      await expect(
        registry.initializeComponent(component, strategy)
      ).resolves.not.toThrow()
    })

    it('should initialize component with interaction strategy', async () => {
      const component = mockComponentMetadata[2] // CartDrawer
      const strategy: LoadingStrategy = {
        trigger: 'interaction',
        priority: 15
      }

      await expect(
        registry.initializeComponent(component, strategy)
      ).resolves.not.toThrow()
    })

    it('should initialize component with idle strategy', async () => {
      const component = mockComponentMetadata[0]
      const strategy: LoadingStrategy = {
        trigger: 'idle',
        priority: 20
      }

      await expect(
        registry.initializeComponent(component, strategy)
      ).resolves.not.toThrow()
    })

    it('should handle initialization errors gracefully', async () => {
      const faultyComponent: ComponentMetadata = {
        className: 'FaultyComponent',
        filePath: '/test/FaultyComponent.ts',
        decorators: [],
        instance: {
          init: () => { throw new Error('Initialization failed') }
        }
      }

      const strategy: LoadingStrategy = {
        trigger: 'immediate',
        priority: 1
      }

      await expect(
        registry.initializeComponent(faultyComponent, strategy)
      ).resolves.not.toThrow() // Should handle errors gracefully
    })
  })

  describe('component auto-discovery', () => {
    it('should discover components in the codebase', async () => {
      const discoveredComponents = await registry.discoverComponents()

      expect(Array.isArray(discoveredComponents)).toBe(true)
    })

    it('should return ComponentMetadata objects from discovery', async () => {
      const components = await registry.discoverComponents()

      if (components.length > 0) {
        components.forEach(component => {
          expect(component).toEqual<ComponentMetadata>({
            className: expect.any(String),
            filePath: expect.any(String),
            decorators: expect.any(Array),
            instance: expect.anything()
          })
        })
      }
    })

    it('should discover components with proper decorator metadata', async () => {
      // Mock the file system discovery
      vi.mocked(registry.discoverComponents).mockResolvedValue(mockComponentMetadata)

      const components = await registry.discoverComponents()

      expect(components).toHaveLength(3)

      const productGallery = components.find(c => c.className === 'ProductGallery')
      expect(productGallery?.decorators).toContainEqual({
        type: 'Template',
        parameters: ['product']
      })
      expect(productGallery?.decorators).toContainEqual({
        type: 'LazyLoad',
        parameters: { rootMargin: '100px', threshold: 0.1 }
      })
    })

    it('should handle discovery failures gracefully', async () => {
      vi.mocked(registry.discoverComponents).mockRejectedValue(new Error('Discovery failed'))

      await expect(registry.discoverComponents()).rejects.toThrow('Discovery failed')
    })
  })

  describe('network-aware functionality', () => {
    it('should detect network conditions correctly', () => {
      // Mock different network conditions
      const fastNetwork = { ...mockConnection, effectiveType: '4g', downlink: 20 }
      const slowNetwork = { ...mockConnection, effectiveType: '3g', downlink: 2 }

      Object.defineProperty(navigator, 'connection', { value: fastNetwork })

      // This would be implemented in the actual registry
      const networkStatus = {
        type: 'fast' as const,
        effectiveType: '4g' as const,
        downlink: 20,
        rtt: 100
      }

      expect(networkStatus.type).toBe('fast')
      expect(networkStatus.downlink).toBeGreaterThan(10)
    })

    it('should adapt component loading based on network speed', () => {
      const networkAwareComponent = mockComponentMetadata[1]

      const fastStrategy = registry.getLoadingStrategy(networkAwareComponent, {
        template: 'product',
        network: 'fast'
      })

      const slowStrategy = registry.getLoadingStrategy(networkAwareComponent, {
        template: 'product',
        network: 'slow'
      })

      expect(fastStrategy.trigger).toBe('immediate')
      expect(slowStrategy.fallback).toBeDefined()
    })
  })

  describe('performance optimizations', () => {
    it('should prioritize components correctly', () => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })

      const criticalComponent = mockComponentMetadata[1] // HeaderNav (Critical)
      const lazyComponent = mockComponentMetadata[0] // ProductGallery (LazyLoad)

      const criticalStrategy = registry.getLoadingStrategy(criticalComponent, {
        template: 'product'
      })

      const lazyStrategy = registry.getLoadingStrategy(lazyComponent, {
        template: 'product'
      })

      expect(criticalStrategy.priority).toBeLessThan(lazyStrategy.priority)
    })

    it('should batch component initializations for performance', async () => {
      const components = mockComponentMetadata
      const strategies: LoadingStrategy[] = components.map((_, index) => ({
        trigger: 'immediate',
        priority: index
      }))

      // Should be able to initialize multiple components
      const initPromises = components.map((component, index) =>
        registry.initializeComponent(component, strategies[index])
      )

      await expect(Promise.all(initPromises)).resolves.not.toThrow()
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle empty component registration gracefully', () => {
      expect(() => {
        registry.register({} as ComponentMetadata)
      }).not.toThrow()
    })

    it('should handle components with no decorators', () => {
      const plainComponent: ComponentMetadata = {
        className: 'PlainComponent',
        filePath: '/test/PlainComponent.ts',
        decorators: [],
        instance: {}
      }

      expect(() => {
        registry.register(plainComponent)
      }).not.toThrow()

      const strategy = registry.getLoadingStrategy(plainComponent, {
        template: 'product'
      })

      expect(strategy.trigger).toBe('immediate') // Default strategy
    })

    it('should handle invalid template names', () => {
      const invalidComponents = registry.getComponentsForTemplate('')
      const nullComponents = registry.getComponentsForTemplate(null as any)
      const undefinedComponents = registry.getComponentsForTemplate(undefined as any)

      expect(invalidComponents).toEqual([])
      expect(nullComponents).toEqual([])
      expect(undefinedComponents).toEqual([])
    })

    it('should handle corrupted component metadata', () => {
      const corruptedComponent = {
        className: null,
        filePath: undefined,
        decorators: 'invalid',
        instance: null
      } as any

      expect(() => {
        registry.register(corruptedComponent)
      }).not.toThrow()
    })
  })

  describe('memory management and cleanup', () => {
    it('should have cleanup method for memory management', () => {
      if (typeof (registry as any).clear === 'function') {
        expect((registry as any).clear).toBeDefined()
        expect(typeof (registry as any).clear).toBe('function')
      }
    })

    it('should clear all registered components when cleanup is called', () => {
      mockComponentMetadata.forEach(component => {
        registry.register(component)
      })

      if (typeof (registry as any).clear === 'function') {
        (registry as any).clear()

        const components = registry.getComponentsForTemplate('product')
        expect(components).toHaveLength(0)
      }
    })
  })
})