/**
 * T009: Contract test for PostCSS plugin processDirective()
 *
 * This test defines the expected contract for the processDirective method
 * which parses CSS directives like @split, @critical, @inline, etc.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AtRule } from 'postcss'
import type { DirectiveSplitterAPI, DirectiveSplitterOptions, ProcessedDirective } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

// Mock AtRule creation helper
function createAtRule(name: string, params: string, content: string): AtRule {
  const atRule = new AtRule({ name, params })
  atRule.append(content)
  return atRule
}

describe('PostCSS Plugin: processDirective Contract (T009)', () => {
  let plugin: DirectiveSplitterAPI
  let options: DirectiveSplitterOptions

  beforeEach(() => {
    // This will fail initially - plugin doesn't exist yet
    plugin = require('../../lib/postcss-shopify-directive-splitter')

    options = {
      themeRoot: '/Users/joe/GitHub/shopify-starter-slayed',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      validSplits: ['product', 'collection', 'cart', 'account'],
      generateViteTags: true,
      minify: false,
      performanceBudgets: {
        criticalCSS: 14000,
        templateCSS: 30000,
        totalCSS: 250000
      }
    }
  })

  describe('processDirective method exists and has correct signature', () => {
    it('should have processDirective method', () => {
      expect(plugin.processDirective).toBeDefined()
      expect(typeof plugin.processDirective).toBe('function')
    })

    it('should accept AtRule and options parameters', () => {
      const atRule = createAtRule('split', 'product', '.product-gallery { display: block; }')

      // This should not throw but will fail as implementation doesn't exist
      expect(() => {
        plugin.processDirective(atRule, options)
      }).not.toThrow()
    })
  })

  describe('@split directive processing', () => {
    it('should process @split directive correctly', () => {
      const atRule = createAtRule('split', 'product', '.product-gallery { display: block; width: 100%; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'split',
        target: 'product',
        content: '.product-gallery { display: block; width: 100%; }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {}
      })
    })

    it('should handle @split with multiple templates', () => {
      const atRule = createAtRule('split', 'product,collection', '.gallery { display: grid; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'split',
        target: 'product,collection',
        content: '.gallery { display: grid; }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {}
      })
    })

    it('should reject invalid split targets', () => {
      const atRule = createAtRule('split', 'invalid-template', '.test { color: red; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toBeNull()
    })
  })

  describe('@critical directive processing', () => {
    it('should process @critical directive correctly', () => {
      const atRule = createAtRule('critical', 'global', '.header { position: fixed; top: 0; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'critical',
        target: 'global',
        content: '.header { position: fixed; top: 0; }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {}
      })
    })

    it('should handle template-specific critical CSS', () => {
      const atRule = createAtRule('critical', 'product', '.product-hero { background: url(hero.jpg); }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'critical',
        target: 'product',
        content: '.product-hero { background: url(hero.jpg); }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {}
      })
    })
  })

  describe('@inline directive processing', () => {
    it('should process @inline directive with lazy option', () => {
      const atRule = createAtRule('inline', 'cart-drawer lazy scoped', '.drawer { transform: translateX(100%); }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'inline',
        target: 'cart-drawer',
        content: '.drawer { transform: translateX(100%); }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {
          lazy: true,
          scoped: true
        }
      })
    })

    it('should handle @inline with priority option', () => {
      const atRule = createAtRule('inline', 'modal priority:high', '.modal { z-index: 9999; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'inline',
        target: 'modal',
        content: '.modal { z-index: 9999; }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {
          priority: 10
        }
      })
    })
  })

  describe('@responsive directive processing', () => {
    it('should process @responsive directive correctly', () => {
      const atRule = createAtRule('responsive', 'mobile-first', '@media (min-width: 768px) { .container { max-width: 1200px; } }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toEqual<ProcessedDirective>({
        type: 'responsive',
        target: 'mobile-first',
        content: '@media (min-width: 768px) { .container { max-width: 1200px; } }',
        sourceFile: expect.any(String),
        lineNumber: expect.any(Number),
        options: {}
      })
    })
  })

  describe('error handling', () => {
    it('should return null for unrecognized directives', () => {
      const atRule = createAtRule('unknown', 'param', '.test { color: red; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toBeNull()
    })

    it('should handle empty directive content', () => {
      const atRule = createAtRule('split', 'product', '')

      const result = plugin.processDirective(atRule, options)

      expect(result).toBeNull()
    })

    it('should handle malformed directive parameters', () => {
      const atRule = createAtRule('split', '', '.test { color: red; }')

      const result = plugin.processDirective(atRule, options)

      expect(result).toBeNull()
    })
  })

  describe('source file tracking', () => {
    it('should track source file path correctly', () => {
      const atRule = createAtRule('split', 'product', '.test { color: red; }')
      // Mock the source property that PostCSS would normally set
      atRule.source = {
        input: {
          from: '/Users/joe/GitHub/shopify-starter-slayed/frontend/entrypoints/theme.css'
        },
        start: { line: 10, column: 1 }
      } as any

      const result = plugin.processDirective(atRule, options)

      expect(result?.sourceFile).toBe('/Users/joe/GitHub/shopify-starter-slayed/frontend/entrypoints/theme.css')
      expect(result?.lineNumber).toBe(10)
    })
  })
})