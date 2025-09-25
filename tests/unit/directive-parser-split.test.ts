/**
 * T071: Unit tests for @split directive parser
 *
 * Tests the parsing, validation, and content extraction logic for @split directives
 * in the PostCSS directive splitter system.
 *
 * Following TDD principles - these tests validate the contract requirements.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import postcss from 'postcss'
import type { AtRule } from 'postcss'
import { processDirective } from '../../lib/postcss-shopify-directive-splitter/parser'
import type { DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

describe('Split Directive Parser (T071)', () => {
  let defaultOptions: DirectiveSplitterOptions

  beforeEach(() => {
    defaultOptions = {
      validSplits: ['product', 'collection', 'cart', 'blog', 'article', 'page'],
      validCritical: ['global', 'header', 'footer', 'hero'],
      targetDir: 'frontend/entrypoints/splits',
      budgetLimits: {
        critical: 14 * 1024,    // 14KB
        template: 30 * 1024,    // 30KB
        total: 250 * 1024,      // 250KB
      }
    }
  })

  describe('Basic @split directive parsing', () => {
    it('should parse valid @split directive with single template', async () => {
      const css = `
        @split product {
          .product-gallery { display: grid; }
          .product-form { margin: 1rem; }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('split')
      expect(result?.target).toBe('product')
      expect(result?.content).toContain('.product-gallery')
      expect(result?.content).toContain('.product-form')
    })

    it('should parse @split directive with multiple templates', async () => {
      const css = `
        @split product, collection {
          .shared-styles { color: blue; }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('split')
      expect(result?.target).toBe('product, collection')
      expect(result?.content).toContain('.shared-styles')
    })

    it('should preserve CSS formatting and comments in split content', async () => {
      const css = `
        @split product {
          /* Product gallery styles */
          .product-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }

          /* Product form styles */
          .product-form { margin: 1rem 0; }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('/* Product gallery styles */')
      expect(result?.content).toContain('/* Product form styles */')
      expect(result?.content).toContain('grid-template-columns')
    })
  })

  describe('Template validation', () => {
    it('should accept valid Shopify template names', async () => {
      const validTemplates = ['product', 'collection', 'cart', 'blog', 'article', 'page']

      for (const template of validTemplates) {
        const css = `@split ${template} { .test { color: red; } }`
        const root = postcss.parse(css)
        const atRule = root.first as AtRule

        const result = processDirective(atRule, defaultOptions)

        expect(result).toBeDefined()
        expect(result?.target).toBe(template)
      }
    })

    it('should reject invalid template names', async () => {
      const invalidTemplates = ['invalid', 'unknown', 'custom-page', 'admin']

      for (const template of invalidTemplates) {
        const css = `@split ${template} { .test { color: red; } }`
        const root = postcss.parse(css)
        const atRule = root.first as AtRule

        const result = processDirective(atRule, defaultOptions)

        expect(result).toBeNull()
      }
    })

    it('should validate each template in comma-separated list', async () => {
      const css = `@split product, invalid, collection { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull() // Should fail due to 'invalid' template
    })

    it('should require at least one template parameter', async () => {
      const css = `@split { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })
  })

  describe('Content extraction', () => {
    it('should handle nested rules correctly', async () => {
      const css = `
        @split product {
          .product-container {
            display: flex;

            .product-image {
              flex: 1;
              img { max-width: 100%; }
            }

            .product-details {
              flex: 2;

              h1 { font-size: 2rem; }
              .price { color: green; }
            }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('.product-container')
      expect(result?.content).toContain('.product-image')
      expect(result?.content).toContain('.product-details')
      expect(result?.content).toContain('max-width: 100%')
      expect(result?.content).toContain('font-size: 2rem')
    })

    it('should handle media queries within split directive', async () => {
      const css = `
        @split product {
          .product-gallery {
            display: grid;

            @media (min-width: 768px) {
              grid-template-columns: repeat(2, 1fr);
            }

            @media (min-width: 1024px) {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('@media (min-width: 768px)')
      expect(result?.content).toContain('@media (min-width: 1024px)')
      expect(result?.content).toContain('grid-template-columns')
    })

    it('should handle empty directive content', async () => {
      const css = `@split product {}`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })

    it('should handle whitespace-only directive content', async () => {
      const css = `@split product {   \n   \t   }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })
  })

  describe('Source file and line tracking', () => {
    it('should capture source file information', async () => {
      const css = `@split product { .test { color: red; } }`
      const root = postcss.parse(css, { from: '/path/to/theme.css' })
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.sourceFile).toBe('/path/to/theme.css')
    })

    it('should capture line number information', async () => {
      const css = `
        /* Line 1 */
        /* Line 2 */
        @split product { .test { color: red; } }
      `
      const root = postcss.parse(css)
      const atRule = root.children[2] as AtRule // Skip comments

      const result = processDirective(atRule, defaultOptions)

      expect(result?.lineNumber).toBe(4) // Should be line 4
    })

    it('should handle missing source information gracefully', async () => {
      const css = `@split product { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      // Remove source info
      delete (atRule as any).source

      const result = processDirective(atRule, defaultOptions)

      expect(result?.sourceFile).toBe('unknown')
      expect(result?.lineNumber).toBe(0)
    })
  })

  describe('Integration with other directives', () => {
    it('should not process non-split directives', async () => {
      const css = `@media (min-width: 768px) { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })

    it('should ignore unknown directive types', async () => {
      const css = `@unknown product { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle special characters in template names', async () => {
      // Add template with special chars to valid list for this test
      const optionsWithSpecialChars = {
        ...defaultOptions,
        validSplits: [...defaultOptions.validSplits, 'custom-template', 'template_with_underscore']
      }

      const css = `@split custom-template { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, optionsWithSpecialChars)

      expect(result).toBeDefined()
      expect(result?.target).toBe('custom-template')
    })

    it('should handle very long CSS content', async () => {
      // Generate large CSS content
      const longRules = Array.from({ length: 1000 }, (_, i) =>
        `.class-${i} { color: hsl(${i % 360}, 70%, 50%); }`
      ).join('\n')

      const css = `@split product { ${longRules} }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.content.length).toBeGreaterThan(10000) // Should be quite large
      expect(result?.content).toContain('.class-0')
      expect(result?.content).toContain('.class-999')
    })

    it('should preserve CSS custom properties', async () => {
      const css = `
        @split product {
          :root {
            --product-primary: #007bff;
            --product-spacing: 1rem;
          }

          .product {
            color: var(--product-primary);
            margin: var(--product-spacing);
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('--product-primary')
      expect(result?.content).toContain('var(--product-primary)')
    })

    it('should handle CSS calc() functions correctly', async () => {
      const css = `
        @split product {
          .product-container {
            width: calc(100% - 2rem);
            height: calc(100vh - var(--header-height, 80px));
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('calc(100% - 2rem)')
      expect(result?.content).toContain('calc(100vh - var(--header-height, 80px))')
    })
  })

  describe('Performance considerations', () => {
    it('should process directive in reasonable time', async () => {
      const css = `@split product { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const startTime = performance.now()
      const result = processDirective(atRule, defaultOptions)
      const endTime = performance.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(10) // Should take less than 10ms
    })
  })
})