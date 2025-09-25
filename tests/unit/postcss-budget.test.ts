/**
 * T011: Contract test for PostCSS plugin checkBudget()
 *
 * This test defines the expected contract for the checkBudget method
 * which enforces performance budgets on generated CSS files.
 *
 * Performance budgets:
 * - Critical CSS: < 14KB per template
 * - Template CSS: < 30KB per split
 * - Total CSS: < 250KB across all files
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { DirectiveSplitterAPI, DirectiveSplitterOptions, GeneratedFile } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

describe('PostCSS Plugin: checkBudget Contract (T011)', () => {
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
        criticalCSS: 14000,    // 14KB
        templateCSS: 30000,    // 30KB
        totalCSS: 250000       // 250KB
      }
    }
  })

  describe('checkBudget method exists and has correct signature', () => {
    it('should have checkBudget method', () => {
      expect(plugin.checkBudget).toBeDefined()
      expect(typeof plugin.checkBudget).toBe('function')
    })

    it('should accept files array and options parameters', () => {
      const mockFiles: GeneratedFile[] = []

      expect(() => {
        plugin.checkBudget(mockFiles, options)
      }).not.toThrow()
    })

    it('should return budget status object', () => {
      const mockFiles: GeneratedFile[] = []
      const result = plugin.checkBudget(mockFiles, options)

      expect(result).toEqual({
        status: expect.stringMatching(/^(pass|warning|fail)$/),
        violations: expect.any(Array)
      })
    })
  })

  describe('critical CSS budget enforcement', () => {
    it('should pass when critical CSS is under 14KB', () => {
      const smallCriticalFiles: GeneratedFile[] = [
        {
          path: '/test/critical-global.css',
          content: '.header { position: fixed; }', // Small content
          type: 'critical-css',
          template: 'global',
          size: 5000, // 5KB - under budget
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(smallCriticalFiles, options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when critical CSS exceeds 14KB', () => {
      const largeCriticalFiles: GeneratedFile[] = [
        {
          path: '/test/critical-global.css',
          content: '.header { position: fixed; }' + 'x'.repeat(15000), // Large content
          type: 'critical-css',
          template: 'global',
          size: 15000, // 15KB - over budget
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(largeCriticalFiles, options)

      expect(result.status).toBe('fail')
      expect(result.violations).toContainEqual({
        type: 'criticalCSS',
        actual: 15000,
        budget: 14000,
        message: expect.stringContaining('Critical CSS exceeds budget')
      })
    })

    it('should check critical CSS budget per template', () => {
      const multipleCriticalFiles: GeneratedFile[] = [
        {
          path: '/test/critical-global.css',
          content: 'x'.repeat(12000),
          type: 'critical-css',
          template: 'global',
          size: 12000, // Under budget individually
          hash: 'abc12345'
        },
        {
          path: '/test/critical-product.css',
          content: 'x'.repeat(15000),
          type: 'critical-css',
          template: 'product',
          size: 15000, // Over budget
          hash: 'def67890'
        }
      ]

      const result = plugin.checkBudget(multipleCriticalFiles, options)

      expect(result.status).toBe('fail')
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('criticalCSS')
      expect(result.violations[0].actual).toBe(15000)
    })
  })

  describe('template CSS budget enforcement', () => {
    it('should pass when template CSS is under 30KB', () => {
      const smallTemplateFiles: GeneratedFile[] = [
        {
          path: '/test/splits/product.css',
          content: '.product-gallery { display: grid; }',
          type: 'css-split',
          template: 'product',
          size: 25000, // 25KB - under budget
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(smallTemplateFiles, options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when template CSS exceeds 30KB', () => {
      const largeTemplateFiles: GeneratedFile[] = [
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(35000),
          type: 'css-split',
          template: 'product',
          size: 35000, // 35KB - over budget
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(largeTemplateFiles, options)

      expect(result.status).toBe('fail')
      expect(result.violations).toContainEqual({
        type: 'templateCSS',
        actual: 35000,
        budget: 30000,
        message: expect.stringContaining('Template CSS exceeds budget')
      })
    })

    it('should check each template split separately', () => {
      const multipleTemplateFiles: GeneratedFile[] = [
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(25000),
          type: 'css-split',
          template: 'product',
          size: 25000, // Under budget
          hash: 'abc12345'
        },
        {
          path: '/test/splits/collection.css',
          content: 'x'.repeat(32000),
          type: 'css-split',
          template: 'collection',
          size: 32000, // Over budget
          hash: 'def67890'
        }
      ]

      const result = plugin.checkBudget(multipleTemplateFiles, options)

      expect(result.status).toBe('fail')
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('templateCSS')
    })
  })

  describe('total CSS budget enforcement', () => {
    it('should pass when total CSS is under 250KB', () => {
      const moderateFiles: GeneratedFile[] = [
        {
          path: '/test/critical.css',
          content: 'x'.repeat(10000),
          type: 'critical-css',
          template: 'global',
          size: 10000,
          hash: 'abc12345'
        },
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(25000),
          type: 'css-split',
          template: 'product',
          size: 25000,
          hash: 'def67890'
        },
        {
          path: '/test/splits/collection.css',
          content: 'x'.repeat(20000),
          type: 'css-split',
          template: 'collection',
          size: 20000,
          hash: 'ghi12345'
        }
        // Total: 55KB - well under 250KB budget
      ]

      const result = plugin.checkBudget(moderateFiles, options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when total CSS exceeds 250KB', () => {
      const largeFiles: GeneratedFile[] = [
        {
          path: '/test/critical.css',
          content: 'x'.repeat(50000),
          type: 'critical-css',
          template: 'global',
          size: 50000,
          hash: 'abc12345'
        },
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(100000),
          type: 'css-split',
          template: 'product',
          size: 100000,
          hash: 'def67890'
        },
        {
          path: '/test/splits/collection.css',
          content: 'x'.repeat(120000),
          type: 'css-split',
          template: 'collection',
          size: 120000,
          hash: 'ghi12345'
        }
        // Total: 270KB - over 250KB budget
      ]

      const result = plugin.checkBudget(largeFiles, options)

      expect(result.status).toBe('fail')
      expect(result.violations).toContainEqual({
        type: 'totalCSS',
        actual: 270000,
        budget: 250000,
        message: expect.stringContaining('Total CSS exceeds budget')
      })
    })

    it('should only count CSS files in total budget', () => {
      const mixedFiles: GeneratedFile[] = [
        {
          path: '/test/critical.css',
          content: 'x'.repeat(100000),
          type: 'critical-css',
          template: 'global',
          size: 100000,
          hash: 'abc12345'
        },
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(100000),
          type: 'css-split',
          template: 'product',
          size: 100000,
          hash: 'def67890'
        },
        {
          path: '/test/snippet.liquid',
          content: '<style>x'.repeat(100000) + '</style>',
          type: 'liquid-snippet',
          template: undefined,
          size: 100000, // This should NOT count toward CSS budget
          hash: 'ghi12345'
        }
        // CSS Total: 200KB - under 250KB budget (liquid file ignored)
      ]

      const result = plugin.checkBudget(mixedFiles, options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('warning status for near-budget violations', () => {
    it('should return warning when approaching budget limits', () => {
      const nearLimitFiles: GeneratedFile[] = [
        {
          path: '/test/critical.css',
          content: 'x'.repeat(13500), // 13.5KB - close to 14KB limit
          type: 'critical-css',
          template: 'global',
          size: 13500,
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(nearLimitFiles, options)

      // Should be warning, not pass or fail
      expect(result.status).toBe('warning')
      expect(result.violations).toHaveLength(0) // Warnings don't create violations
    })
  })

  describe('custom budget configuration', () => {
    it('should respect custom budget limits', () => {
      const customOptions = {
        ...options,
        performanceBudgets: {
          criticalCSS: 10000,  // Stricter 10KB limit
          templateCSS: 20000,  // Stricter 20KB limit
          totalCSS: 150000     // Stricter 150KB limit
        }
      }

      const moderateFiles: GeneratedFile[] = [
        {
          path: '/test/critical.css',
          content: 'x'.repeat(12000), // Over custom 10KB limit
          type: 'critical-css',
          template: 'global',
          size: 12000,
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(moderateFiles, customOptions)

      expect(result.status).toBe('fail')
      expect(result.violations[0].budget).toBe(10000)
    })

    it('should use default budgets when not specified', () => {
      const optionsWithoutBudgets = {
        ...options,
        performanceBudgets: undefined
      }

      const result = plugin.checkBudget([], optionsWithoutBudgets)

      expect(result.status).toBe('pass')
      expect(Array.isArray(result.violations)).toBe(true)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle empty files array', () => {
      const result = plugin.checkBudget([], options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should handle files with zero size', () => {
      const zeroSizeFiles: GeneratedFile[] = [
        {
          path: '/test/empty.css',
          content: '',
          type: 'css-split',
          template: 'product',
          size: 0,
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(zeroSizeFiles, options)

      expect(result.status).toBe('pass')
      expect(result.violations).toHaveLength(0)
    })

    it('should handle files with inconsistent size property', () => {
      const inconsistentFiles: GeneratedFile[] = [
        {
          path: '/test/inconsistent.css',
          content: 'x'.repeat(1000), // 1KB of content
          type: 'css-split',
          template: 'product',
          size: 15000, // But reports 15KB - should use actual size property
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(inconsistentFiles, options)

      // Should use the size property, not calculate from content
      expect(result.status).toBe('pass') // 15KB is under 30KB template limit
    })
  })

  describe('detailed violation reporting', () => {
    it('should provide detailed violation messages', () => {
      const oversizedFiles: GeneratedFile[] = [
        {
          path: '/test/splits/product.css',
          content: 'x'.repeat(35000),
          type: 'css-split',
          template: 'product',
          size: 35000,
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(oversizedFiles, options)

      expect(result.violations[0]).toEqual({
        type: 'templateCSS',
        actual: 35000,
        budget: 30000,
        message: expect.stringMatching(/Template CSS.*product.*exceeds budget.*35.*KB.*30.*KB/)
      })
    })

    it('should identify specific files in violations', () => {
      const oversizedFiles: GeneratedFile[] = [
        {
          path: '/test/critical-product.css',
          content: 'x'.repeat(15000),
          type: 'critical-css',
          template: 'product',
          size: 15000,
          hash: 'abc12345'
        }
      ]

      const result = plugin.checkBudget(oversizedFiles, options)

      expect(result.violations[0].message).toContain('product')
      expect(result.violations[0].message).toContain('critical')
    })
  })
})