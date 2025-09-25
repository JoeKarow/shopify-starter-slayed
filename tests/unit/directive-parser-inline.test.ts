/**
 * T071: Unit tests for @inline directive parser
 *
 * Tests the parsing, validation, and content extraction logic for @inline directives
 * which handle component-scoped CSS that should be inlined with the component.
 *
 * Following TDD principles - these tests validate the contract requirements.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import postcss from 'postcss'
import type { AtRule } from 'postcss'
import { processDirective } from '../../lib/postcss-shopify-directive-splitter/parser'
import type { DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

describe('Inline Directive Parser (T071)', () => {
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

  describe('Basic @inline directive parsing', () => {
    it('should parse @inline directive with component name', async () => {
      const css = `
        @inline cart-drawer {
          .cart-drawer {
            position: fixed;
            top: 0;
            right: -100%;
            width: 400px;
            height: 100vh;
            background: white;
            transition: right 0.3s ease;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('inline')
      expect(result?.target).toBe('cart-drawer')
      expect(result?.content).toContain('position: fixed')
      expect(result?.content).toContain('transition: right')
    })

    it('should parse @inline directive with lazy loading flag', async () => {
      const css = `
        @inline product-gallery lazy {
          .product-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.type).toBe('inline')
      expect(result?.target).toBe('product-gallery lazy')
      expect(result?.content).toContain('display: grid')
    })

    it('should parse @inline directive with scoped flag', async () => {
      const css = `
        @inline modal scoped {
          .modal {
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.type).toBe('inline')
      expect(result?.target).toBe('modal scoped')
      expect(result?.content).toContain('z-index: 9999')
    })

    it('should parse @inline directive with multiple flags', async () => {
      const css = `
        @inline tooltip lazy scoped critical {
          .tooltip {
            position: absolute;
            background: #333;
            color: white;
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            z-index: 1000;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.type).toBe('inline')
      expect(result?.target).toBe('tooltip lazy scoped critical')
    })
  })

  describe('Component naming validation', () => {
    it('should accept valid component names', async () => {
      const validNames = [
        'cart-drawer',
        'product-gallery',
        'search-modal',
        'newsletter-popup',
        'image-carousel',
        'price-calculator'
      ]

      for (const name of validNames) {
        const css = `@inline ${name} { .${name} { display: block; } }`
        const root = postcss.parse(css)
        const atRule = root.first as AtRule

        const result = processDirective(atRule, defaultOptions)

        expect(result).toBeDefined()
        expect(result?.target).toBe(name)
      }
    })

    it('should require component name for @inline', async () => {
      const css = `@inline { .component { display: block; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })

    it('should handle component names with numbers', async () => {
      const css = `@inline carousel-v2 { .carousel { display: flex; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.target).toBe('carousel-v2')
    })
  })

  describe('Inline CSS patterns for components', () => {
    it('should handle modal component styles', async () => {
      const css = `
        @inline modal {
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
          }

          .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('.modal-overlay')
      expect(result?.content).toContain('transform: translate(-50%, -50%)')
      expect(result?.content).toContain('box-shadow')
    })

    it('should handle dropdown component styles', async () => {
      const css = `
        @inline dropdown lazy {
          .dropdown {
            position: relative;
            display: inline-block;
          }

          .dropdown-trigger {
            cursor: pointer;
            padding: 0.5rem 1rem;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
          }

          .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            min-width: 200px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            z-index: 100;
          }

          .dropdown.active .dropdown-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('.dropdown-trigger')
      expect(result?.content).toContain('visibility: hidden')
      expect(result?.content).toContain('transition: all 0.2s ease')
    })

    it('should handle carousel component styles', async () => {
      const css = `
        @inline carousel scoped {
          .carousel {
            position: relative;
            overflow: hidden;
            border-radius: 8px;
          }

          .carousel-track {
            display: flex;
            transition: transform 0.3s ease;
          }

          .carousel-slide {
            flex: 0 0 100%;
            position: relative;
          }

          .carousel-controls {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 0.5rem;
          }

          .carousel-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .carousel-dot.active {
            background: white;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('.carousel-track')
      expect(result?.content).toContain('flex: 0 0 100%')
      expect(result?.content).toContain('.carousel-dot.active')
    })
  })

  describe('Lazy loading optimization', () => {
    it('should handle lazy-loaded component styles', async () => {
      const css = `
        @inline image-gallery lazy {
          .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
          }

          .gallery-item {
            aspect-ratio: 1;
            overflow: hidden;
            border-radius: 8px;
            cursor: pointer;
          }

          .gallery-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .gallery-item:hover .gallery-image {
            transform: scale(1.05);
          }

          .gallery-loading {
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.target).toContain('lazy')
      expect(result?.content).toContain('grid-template-columns')
      expect(result?.content).toContain('aspect-ratio: 1')
      expect(result?.content).toContain('.gallery-loading')
    })

    it('should optimize for intersection observer triggers', async () => {
      const css = `
        @inline product-reviews lazy {
          .reviews-container {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
          }

          .reviews-container.loaded {
            opacity: 1;
            transform: translateY(0);
          }

          .review-skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, #f0f0f0 63%);
            background-size: 400% 100%;
            animation: loading 1.4s ease-in-out infinite;
          }

          @keyframes loading {
            0% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('translateY(20px)')
      expect(result?.content).toContain('@keyframes loading')
      expect(result?.content).toContain('background-size: 400% 100%')
    })
  })

  describe('Scoped CSS handling', () => {
    it('should handle scoped component styles', async () => {
      const css = `
        @inline notification scoped {
          .notification {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 1rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
          }

          .notification.show {
            transform: translateX(0);
          }

          .notification.error {
            border-color: #e74c3c;
            background: #fdf2f2;
          }

          .notification.success {
            border-color: #27ae60;
            background: #f2fdf2;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.target).toContain('scoped')
      expect(result?.content).toContain('.notification.show')
      expect(result?.content).toContain('.notification.error')
      expect(result?.content).toContain('.notification.success')
    })

    it('should handle CSS custom properties in scoped components', async () => {
      const css = `
        @inline theme-switcher scoped {
          .theme-switcher {
            --switch-width: 60px;
            --switch-height: 30px;
            --switch-padding: 2px;
            --thumb-size: calc(var(--switch-height) - (var(--switch-padding) * 2));

            position: relative;
            width: var(--switch-width);
            height: var(--switch-height);
            background: #ddd;
            border-radius: calc(var(--switch-height) / 2);
            cursor: pointer;
          }

          .theme-switcher::after {
            content: '';
            position: absolute;
            top: var(--switch-padding);
            left: var(--switch-padding);
            width: var(--thumb-size);
            height: var(--thumb-size);
            background: white;
            border-radius: 50%;
            transition: left 0.2s ease;
          }

          .theme-switcher.dark::after {
            left: calc(var(--switch-width) - var(--thumb-size) - var(--switch-padding));
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('--switch-width')
      expect(result?.content).toContain('var(--thumb-size)')
      expect(result?.content).toContain('calc(var(--switch-height) / 2)')
    })
  })

  describe('Content validation', () => {
    it('should handle empty inline directive', async () => {
      const css = `@inline component {}`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeNull()
    })

    it('should handle minimal component styles', async () => {
      const css = `@inline simple { .simple { display: block; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.content).toContain('.simple { display: block; }')
    })

    it('should preserve component animation keyframes', async () => {
      const css = `
        @inline spinner {
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('@keyframes spin')
      expect(result?.content).toContain('animation: spin 1s linear infinite')
      expect(result?.content).toContain('transform: rotate(360deg)')
    })
  })

  describe('Source tracking', () => {
    it('should track source file for inline components', async () => {
      const css = `@inline test { .test { color: red; } }`
      const root = postcss.parse(css, { from: '/components/test.css' })
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.sourceFile).toBe('/components/test.css')
    })

    it('should track line numbers accurately', async () => {
      const css = `
        /* Component styles */
        @inline button {
          .button { padding: 0.5rem 1rem; }
        }
      `
      const root = postcss.parse(css)
      const atRule = root.children[1] as AtRule // Skip comment

      const result = processDirective(atRule, defaultOptions)

      expect(result?.lineNumber).toBe(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle complex selectors in inline components', async () => {
      const css = `
        @inline data-table scoped {
          .data-table {
            border-collapse: collapse;
            width: 100%;
          }

          .data-table th,
          .data-table td {
            border: 1px solid #ddd;
            padding: 0.75rem;
            text-align: left;
          }

          .data-table th {
            background-color: #f8f9fa;
            font-weight: 600;
          }

          .data-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          .data-table tr:hover {
            background-color: #e9ecef;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('.data-table th,')
      expect(result?.content).toContain('tr:nth-child(even)')
      expect(result?.content).toContain('tr:hover')
    })

    it('should handle pseudo-elements and pseudo-classes', async () => {
      const css = `
        @inline custom-input {
          .custom-input {
            position: relative;
          }

          .custom-input::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
          }

          .custom-input:focus-within::after {
            content: '✓';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: green;
          }

          .custom-input input:valid {
            border-color: green;
          }

          .custom-input input:invalid {
            border-color: red;
          }
        }
      `

      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result?.content).toContain('::before')
      expect(result?.content).toContain(':focus-within::after')
      expect(result?.content).toContain('input:valid')
      expect(result?.content).toContain('input:invalid')
    })
  })

  describe('Performance', () => {
    it('should process inline directive efficiently', async () => {
      const css = `@inline test { .test { color: red; } }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const startTime = performance.now()
      const result = processDirective(atRule, defaultOptions)
      const endTime = performance.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(10) // Should take less than 10ms
    })

    it('should handle large inline component styles', async () => {
      const largeCSS = Array.from({ length: 100 }, (_, i) =>
        `.component-${i} { color: hsl(${i * 3.6}, 70%, 50%); font-size: ${12 + (i % 12)}px; }`
      ).join('\n')

      const css = `@inline large-component { ${largeCSS} }`
      const root = postcss.parse(css)
      const atRule = root.first as AtRule

      const result = processDirective(atRule, defaultOptions)

      expect(result).toBeDefined()
      expect(result?.content).toContain('.component-0')
      expect(result?.content).toContain('.component-99')
    })
  })
})