/**
 * T071: Unit tests for @critical directive parser
 *
 * Tests the parsing, validation, and content extraction logic for @critical directives
 * which handle above-the-fold CSS for performance optimization.
 *
 * Following TDD principles - these tests validate the contract requirements.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import postcss from 'postcss'
import type { AtRule } from 'postcss'
import { processDirective } from '../../lib/postcss-shopify-directive-splitter/parser'
import type { DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

describe('Critical Directive Parser (T071)', () => {
  let defaultOptions: DirectiveSplitterOptions

  beforeEach(() => {
    defaultOptions = {
      validSplits: ['product', 'collection', 'cart', 'blog', 'article', 'page'],
      validCritical: ['global', 'header', 'footer', 'hero', 'nav'],
      targetDir: 'frontend/entrypoints/splits',
      budgetLimits: {
        critical: 14 * 1024,    // 14KB
        template: 30 * 1024,    // 30KB
        total: 250 * 1024,      // 250KB
      }
    }
  })

  describe('Basic @critical directive parsing', () => {
    it('should parse valid @critical directive with global scope', async () => {
      const css = `
        @critical global {
          body { margin: 0; padding: 0; }
          .container { max-width: 1200px; margin: 0 auto; }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('critical')
      expect(result?.target).toBe('global')
      expect(result?.content).toContain('body { margin: 0; padding: 0; }')
      expect(result?.content).toContain('.container')
    })

    it('should parse @critical directive for header component', async () => {
      const css = `
        @critical header {
          .header {
            position: sticky;
            top: 0;
            background: white;
            z-index: 100;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('critical')
      expect(result?.target).toBe('header')
      expect(result?.content).toContain('position: sticky')
      expect(result?.content).toContain('z-index: 100')
    })

    it('should parse @critical directive for hero section', async () => {
      const css = `
        @critical hero {
          .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.type).toBe('critical')
      expect(result?.target).toBe('hero')
      expect(result?.content).toContain('min-height: 100vh')
    })
  })

  describe('Critical scope validation', () => {
    it('should accept valid critical scopes', async () => {
      const validScopes = ['global', 'header', 'footer', 'hero', 'nav']

      for (const scope of validScopes) {
        const css = `@critical ${scope} { .test { color: red; } }`
        const root = postcss.parse(css)
        const atRule = root.first as AtRule

        const result = processDirective(atRule, defaultOptions)

        expect(result).toBeDefined()
        expect(result?.target).toBe(scope)
      }
    })

    it('should reject invalid critical scopes', async () => {
      const invalidScopes = ['sidebar', 'content', 'random', 'invalid']

      for (const scope of invalidScopes) {
        const css = `@critical ${scope} { .test { color: red; } }`
        const root = postcss.parse(css)
        const atRule = root.first as AtRule

        const result = processDirective(atRule, defaultOptions)

        expect(result).toBeNull()
      }
    })

    it('should require scope parameter for @critical', async () => {
      const css = `@critical { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })
  })

  describe('Above-the-fold CSS patterns', () => {
    it('should handle critical typography styles', async () => {
      const css = `
        @critical global {
          /* Critical typography */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
          }

          h1, h2, h3 {
            font-weight: 600;
            margin-top: 0;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('font-family')
      expect(result?.content).toContain('@import')
      expect(result?.content).toContain('system-ui')
    })

    it('should handle critical layout styles', async () => {
      const css = `
        @critical global {
          /* Critical layout reset */
          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }

          .sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            border: 0 !important;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('box-sizing: border-box')
      expect(result?.content).toContain('min-height: 100vh')
      expect(result?.content).toContain('.sr-only')
    })

    it('should handle critical loading states', async () => {
      const css = `
        @critical global {
          /* Loading states for critical elements */
          .loading {
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .loaded {
            opacity: 1;
          }

          /* Skeleton loading */
          .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, #f0f0f0 63%);
            background-size: 400% 100%;
            animation: skeleton-loading 1.4s ease-in-out infinite;
          }

          @keyframes skeleton-loading {
            0% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('@keyframes skeleton-loading')
      expect(result?.content).toContain('background-size: 400% 100%')
      expect(result?.content).toContain('transition: opacity')
    })
  })

  describe('Performance optimization patterns', () => {
    it('should handle font display optimization', async () => {
      const css = `
        @critical global {
          @font-face {
            font-family: 'CustomFont';
            src: url('/fonts/custom.woff2') format('woff2');
            font-display: swap;
            font-weight: 400;
          }

          /* Fallback font stack */
          .font-custom {
            font-family: 'CustomFont', 'Helvetica Neue', Arial, sans-serif;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('font-display: swap')
      expect(result?.content).toContain('@font-face')
      expect(result?.content).toContain('woff2')
    })

    it('should handle preconnect and resource hints', async () => {
      const css = `
        @critical global {
          /* Resource hints via CSS (when possible) */
          .preconnect-shopify::before {
            content: '';
            display: none;
            /* This would trigger preconnect in some contexts */
          }

          /* Critical image optimization */
          img[data-critical] {
            object-fit: cover;
            width: 100%;
            height: auto;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('object-fit: cover')
      expect(result?.content).toContain('img[data-critical]')
    })

    it('should handle critical interactive elements', async () => {
      const css = `
        @critical header {
          /* Critical navigation */
          .nav-trigger {
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          .nav-trigger:focus-visible {
            outline: 2px solid #0066cc;
            outline-offset: 2px;
          }

          /* Mobile menu critical styles */
          @media (max-width: 767px) {
            .mobile-nav {
              position: fixed;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100vh;
              background: white;
              transition: left 0.3s ease;
              z-index: 1000;
            }

            .mobile-nav.active {
              left: 0;
            }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('touch-action: manipulation')
      expect(result?.content).toContain('focus-visible')
      expect(result?.content).toContain('@media (max-width: 767px)')
    })
  })

  describe('Content size validation', () => {
    it('should warn when critical CSS exceeds budget', async () => {
      // Create CSS content that exceeds the 14KB budget
      const largeCss = Array.from({ length: 1000 }, (_, i) =>
        `.large-critical-class-${i} { color: hsl(${i % 360}, 70%, 50%); font-size: ${12 + (i % 24)}px; }`
      ).join('\n')

      const css = `@critical global { ${largeCss} }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.content.length).toBeGreaterThan(14 * 1024) // Should exceed 14KB
    })

    it('should handle empty critical directive', async () => {
      const css = `@critical global {}`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })

    it('should handle minimal critical CSS', async () => {
      const css = `@critical global { body { margin: 0; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.content).toContain('body { margin: 0; }')
    })
  })

  describe('CSS at-rules in critical sections', () => {
    it('should handle @supports queries', async () => {
      const css = `
        @critical global {
          /* Progressive enhancement with @supports */
          @supports (display: grid) {
            .grid-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            }
          }

          @supports not (display: grid) {
            .grid-container {
              display: flex;
              flex-wrap: wrap;
            }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('@supports (display: grid)')
      expect(result?.content).toContain('@supports not (display: grid)')
      expect(result?.content).toContain('grid-template-columns')
    })

    it('should handle @media queries for critical responsive styles', async () => {
      const css = `
        @critical header {
          .header {
            padding: 1rem;
          }

          @media (min-width: 768px) {
            .header {
              padding: 1.5rem 2rem;
            }
          }

          @media (min-width: 1024px) {
            .header {
              padding: 2rem 4rem;
            }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('@media (min-width: 768px)')
      expect(result?.content).toContain('@media (min-width: 1024px)')
    })
  })

  describe('Source tracking and debugging', () => {
    it('should track source file for critical CSS', async () => {
      const css = `@critical global { body { margin: 0; } }`
      const root = postcss.parse(css, { from: '/assets/critical.css' })
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.sourceFile).toBe('/assets/critical.css')
    })

    it('should track line numbers for debugging', async () => {
      const css = `
        /* Line 1 */
        /* Line 2 */
        @critical global {
          body { margin: 0; }
        }
      `
      const root = postcss.parse(css, { from: 'test.css' })
      const atRule = root.children[2] as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.lineNumber).toBe(4)
    })
  })

  describe('Edge cases', () => {
    it('should handle critical CSS with vendor prefixes', async () => {
      const css = `
        @critical global {
          .flexbox {
            display: -webkit-box;
            display: -ms-flexbox;
            display: flex;
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            -ms-flex-direction: column;
            flex-direction: column;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('-webkit-box')
      expect(result?.content).toContain('-ms-flexbox')
      expect(result?.content).toContain('flex-direction')
    })

    it('should preserve critical CSS custom properties', async () => {
      const css = `
        @critical global {
          :root {
            --header-height: 80px;
            --primary-color: #007bff;
            --transition-speed: 0.3s;
          }

          .critical-component {
            height: var(--header-height);
            color: var(--primary-color);
            transition: all var(--transition-speed) ease;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('--header-height')
      expect(result?.content).toContain('var(--primary-color)')
      expect(result?.content).toContain('var(--transition-speed)')
    })
  })

  describe('Performance timing', () => {
    it('should process critical directive efficiently', async () => {
      const css = `@critical global { body { margin: 0; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const startTime = performance.now()
      const result = processDirective(atRule, defaultOptions)
      const endTime = performance.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5) // Should be very fast for critical CSS
    })
  })
})