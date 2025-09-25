/**
 * T010: Contract test for PostCSS plugin generateFiles()
 *
 * This test defines the expected contract for the generateFiles method
 * which converts processed directives into actual output files.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { DirectiveSplitterAPI, DirectiveSplitterOptions, ProcessedDirective, GeneratedFile } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

describe('PostCSS Plugin: generateFiles Contract (T010)', () => {
  let plugin: DirectiveSplitterAPI
  let options: DirectiveSplitterOptions
  let mockDirectives: ProcessedDirective[]

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

    mockDirectives = [
      {
        type: 'split',
        target: 'product',
        content: '.product-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }',
        sourceFile: '/Users/joe/GitHub/shopify-starter-slayed/frontend/entrypoints/theme.css',
        lineNumber: 15,
        options: {}
      },
      {
        type: 'critical',
        target: 'global',
        content: '.header { position: fixed; top: 0; width: 100%; z-index: 1000; }',
        sourceFile: '/Users/joe/GitHub/shopify-starter-slayed/frontend/entrypoints/theme.css',
        lineNumber: 25,
        options: {}
      },
      {
        type: 'inline',
        target: 'cart-drawer',
        content: '.drawer { transform: translateX(100%); transition: transform 0.3s ease; }',
        sourceFile: '/Users/joe/GitHub/shopify-starter-slayed/frontend/entrypoints/theme.css',
        lineNumber: 35,
        options: { lazy: true, scoped: true }
      }
    ]
  })

  describe('generateFiles method exists and has correct signature', () => {
    it('should have generateFiles method', () => {
      expect(plugin.generateFiles).toBeDefined()
      expect(typeof plugin.generateFiles).toBe('function')
    })

    it('should accept directives array and options parameters', () => {
      expect(() => {
        plugin.generateFiles(mockDirectives, options)
      }).not.toThrow()
    })

    it('should return array of GeneratedFile objects', () => {
      const result = plugin.generateFiles(mockDirectives, options)

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('split directive file generation', () => {
    it('should generate CSS split files for template-specific styles', () => {
      const splitDirective = mockDirectives.filter(d => d.type === 'split')
      const result = plugin.generateFiles(splitDirective, options)

      const productFile = result.find(f => f.template === 'product' && f.type === 'css-split')
      expect(productFile).toBeDefined()
      expect(productFile).toEqual<GeneratedFile>({
        path: expect.stringContaining('frontend/entrypoints/splits/product.css'),
        content: expect.stringContaining('.product-gallery'),
        type: 'css-split',
        template: 'product',
        size: expect.any(Number),
        hash: expect.any(String)
      })
    })

    it('should generate multiple split files for multiple templates', () => {
      const multiTemplateDirectives: ProcessedDirective[] = [
        {
          type: 'split',
          target: 'product',
          content: '.product-specific { color: blue; }',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: {}
        },
        {
          type: 'split',
          target: 'collection',
          content: '.collection-specific { color: green; }',
          sourceFile: '/test.css',
          lineNumber: 5,
          options: {}
        }
      ]

      const result = plugin.generateFiles(multiTemplateDirectives, options)

      expect(result).toHaveLength(2)
      expect(result.find(f => f.template === 'product')).toBeDefined()
      expect(result.find(f => f.template === 'collection')).toBeDefined()
    })

    it('should combine multiple directives for same template', () => {
      const sameTemplateDirectives: ProcessedDirective[] = [
        {
          type: 'split',
          target: 'product',
          content: '.product-gallery { display: grid; }',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: {}
        },
        {
          type: 'split',
          target: 'product',
          content: '.product-details { padding: 2rem; }',
          sourceFile: '/test.css',
          lineNumber: 10,
          options: {}
        }
      ]

      const result = plugin.generateFiles(sameTemplateDirectives, options)
      const productFile = result.find(f => f.template === 'product')

      expect(result).toHaveLength(1)
      expect(productFile?.content).toContain('.product-gallery')
      expect(productFile?.content).toContain('.product-details')
    })
  })

  describe('critical CSS file generation', () => {
    it('should generate critical CSS files', () => {
      const criticalDirectives = mockDirectives.filter(d => d.type === 'critical')
      const result = plugin.generateFiles(criticalDirectives, options)

      const criticalFile = result.find(f => f.type === 'critical-css')
      expect(criticalFile).toBeDefined()
      expect(criticalFile).toEqual<GeneratedFile>({
        path: expect.stringContaining('critical'),
        content: expect.stringContaining('.header'),
        type: 'critical-css',
        template: expect.any(String),
        size: expect.any(Number),
        hash: expect.any(String)
      })
    })

    it('should separate global and template-specific critical CSS', () => {
      const mixedCriticalDirectives: ProcessedDirective[] = [
        {
          type: 'critical',
          target: 'global',
          content: '.header { position: fixed; }',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: {}
        },
        {
          type: 'critical',
          target: 'product',
          content: '.product-hero { height: 60vh; }',
          sourceFile: '/test.css',
          lineNumber: 5,
          options: {}
        }
      ]

      const result = plugin.generateFiles(mixedCriticalDirectives, options)

      const globalCritical = result.find(f => f.type === 'critical-css' && f.template === 'global')
      const productCritical = result.find(f => f.type === 'critical-css' && f.template === 'product')

      expect(globalCritical).toBeDefined()
      expect(productCritical).toBeDefined()
      expect(globalCritical?.content).toContain('.header')
      expect(productCritical?.content).toContain('.product-hero')
    })
  })

  describe('inline directive handling', () => {
    it('should generate liquid snippets for inline directives', () => {
      const inlineDirectives = mockDirectives.filter(d => d.type === 'inline')
      const result = plugin.generateFiles(inlineDirectives, options)

      const snippetFile = result.find(f => f.type === 'liquid-snippet')
      expect(snippetFile).toBeDefined()
      expect(snippetFile).toEqual<GeneratedFile>({
        path: expect.stringContaining('snippets/'),
        content: expect.stringContaining('<style>'),
        type: 'liquid-snippet',
        template: undefined,
        size: expect.any(Number),
        hash: expect.any(String)
      })
    })

    it('should handle lazy loading options in inline directives', () => {
      const lazyInlineDirective: ProcessedDirective[] = [
        {
          type: 'inline',
          target: 'modal',
          content: '.modal { display: none; }',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: { lazy: true }
        }
      ]

      const result = plugin.generateFiles(lazyInlineDirective, options)
      const snippetFile = result.find(f => f.type === 'liquid-snippet')

      expect(snippetFile?.content).toContain('loading="lazy"')
    })
  })

  describe('file properties and metadata', () => {
    it('should calculate correct file sizes', () => {
      const result = plugin.generateFiles(mockDirectives, options)

      result.forEach(file => {
        expect(file.size).toBeGreaterThan(0)
        expect(file.size).toBe(Buffer.byteLength(file.content, 'utf8'))
      })
    })

    it('should generate unique hashes for file contents', () => {
      const result = plugin.generateFiles(mockDirectives, options)

      const hashes = result.map(f => f.hash)
      const uniqueHashes = [...new Set(hashes)]

      expect(hashes).toHaveLength(uniqueHashes.length) // All hashes should be unique
      result.forEach(file => {
        expect(file.hash).toMatch(/^[a-f0-9]+$/) // Should be hex string
        expect(file.hash).toHaveLength(8) // Standard 8-char hash
      })
    })

    it('should generate correct file paths', () => {
      const result = plugin.generateFiles(mockDirectives, options)

      result.forEach(file => {
        expect(file.path).toMatch(/^\//) // Should be absolute path
        expect(file.path).toContain(options.themeRoot)

        if (file.type === 'css-split') {
          expect(file.path).toContain('/splits/')
          expect(file.path).toMatch(/\.css$/)
        } else if (file.type === 'critical-css') {
          expect(file.path).toContain('critical')
          expect(file.path).toMatch(/\.css$/)
        } else if (file.type === 'liquid-snippet') {
          expect(file.path).toContain('snippets/')
          expect(file.path).toMatch(/\.liquid$/)
        }
      })
    })
  })

  describe('minification support', () => {
    it('should minify CSS when minify option is enabled', () => {
      const minifyOptions = { ...options, minify: true }
      const result = plugin.generateFiles(mockDirectives, minifyOptions)

      result.forEach(file => {
        if (file.type === 'css-split' || file.type === 'critical-css') {
          // Minified CSS should not contain unnecessary whitespace
          expect(file.content).not.toMatch(/\n\s+/)
          expect(file.content).not.toMatch(/\s{2,}/)
        }
      })
    })

    it('should preserve formatting when minify is disabled', () => {
      const result = plugin.generateFiles(mockDirectives, options)

      result.forEach(file => {
        if (file.type === 'css-split' || file.type === 'critical-css') {
          // Non-minified CSS should preserve readable formatting
          expect(file.content).toMatch(/\{[\s\S]*\}/) // Should contain CSS blocks
        }
      })
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle empty directives array', () => {
      const result = plugin.generateFiles([], options)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('should handle directives with empty content', () => {
      const emptyDirectives: ProcessedDirective[] = [
        {
          type: 'split',
          target: 'product',
          content: '',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: {}
        }
      ]

      const result = plugin.generateFiles(emptyDirectives, options)

      // Should either skip empty content or handle gracefully
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle invalid directive types gracefully', () => {
      const invalidDirectives: ProcessedDirective[] = [
        {
          type: 'unknown' as any,
          target: 'product',
          content: '.test { color: red; }',
          sourceFile: '/test.css',
          lineNumber: 1,
          options: {}
        }
      ]

      expect(() => {
        plugin.generateFiles(invalidDirectives, options)
      }).not.toThrow()
    })
  })
})