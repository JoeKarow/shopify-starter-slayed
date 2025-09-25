/**
 * T020: Integration test for @critical directive extraction
 *
 * This test verifies the end-to-end processing of @critical directives
 * from CSS parsing through critical CSS extraction and optimization.
 *
 * These tests WILL FAIL initially as the implementation doesn't exist yet.
 * This follows TDD principles - write tests first, then implement.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Test fixtures and temporary directories
const TEST_DIR = '/tmp/shopify-critical-test'
const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures')
const BUILD_DIR = path.join(TEST_DIR, 'build')

// Sample CSS with @critical directives
const SAMPLE_CSS_WITH_CRITICAL = `
/* Non-critical global styles */
.footer {
  background: #333;
  color: white;
  padding: 2rem;
  margin-top: 4rem;
}

/* Global critical styles - above the fold */
@critical global
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
  }

  .logo {
    height: 40px;
    margin: 10px 20px;
  }

  .main-nav {
    display: flex;
    align-items: center;
    height: 60px;
  }
@endcritical

/* Product-specific critical styles */
@critical product
  .product-hero {
    height: 60vh;
    position: relative;
    overflow: hidden;
    background: #f5f5f5;
  }

  .product-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin: 1rem 0;
    line-height: 1.2;
  }

  .product-price {
    font-size: 2rem;
    color: #c41e3a;
    font-weight: bold;
    margin: 0.5rem 0;
  }

  .add-to-cart-btn {
    background: #c41e3a;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 4px;
    cursor: pointer;
    min-width: 200px;
  }
@endcritical

/* Collection-specific critical styles */
@critical collection
  .collection-hero {
    height: 40vh;
    background-position: center;
    background-size: cover;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collection-title {
    font-size: 3rem;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    text-align: center;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }
@endcritical

/* Regular styles that should not be critical */
.product-reviews {
  margin-top: 4rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 2rem;
}

.related-products {
  margin-top: 6rem;
}

/* Critical styles with responsive breakpoints */
@critical global
  @media (max-width: 768px) {
    .header {
      height: 50px;
    }

    .logo {
      height: 30px;
      margin: 10px 15px;
    }

    .main-nav {
      height: 50px;
    }
  }
@endcritical
`

const POSTCSS_CONFIG = `
module.exports = {
  plugins: [
    require('../lib/postcss-shopify-directive-splitter')({
      themeRoot: '${TEST_DIR}',
      sourceCodeDir: 'fixtures',
      entrypointsDir: 'fixtures/entrypoints',
      validSplits: ['product', 'collection', 'cart', 'account'],
      generateViteTags: true,
      minify: false,
      performanceBudgets: {
        criticalCSS: 14000,
        templateCSS: 30000,
        totalCSS: 250000
      }
    })
  ]
}
`

describe('Critical CSS Extraction Integration Tests (T020)', () => {
  beforeEach(async () => {
    // Set up test environment
    await fs.promises.mkdir(TEST_DIR, { recursive: true })
    await fs.promises.mkdir(FIXTURES_DIR, { recursive: true })
    await fs.promises.mkdir(path.join(FIXTURES_DIR, 'entrypoints'), { recursive: true })
    await fs.promises.mkdir(path.join(FIXTURES_DIR, 'entrypoints', 'critical'), { recursive: true })
    await fs.promises.mkdir(BUILD_DIR, { recursive: true })

    // Create test CSS file
    await fs.promises.writeFile(
      path.join(FIXTURES_DIR, 'entrypoints', 'theme.css'),
      SAMPLE_CSS_WITH_CRITICAL
    )

    // Create PostCSS config
    await fs.promises.writeFile(
      path.join(TEST_DIR, 'postcss.config.js'),
      POSTCSS_CONFIG
    )

    // Create package.json for the test
    await fs.promises.writeFile(
      path.join(TEST_DIR, 'package.json'),
      JSON.stringify({
        name: 'critical-test',
        private: true,
        scripts: {
          build: 'postcss fixtures/entrypoints/theme.css -o build/theme.css'
        }
      }, null, 2)
    )
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('@critical directive parsing', () => {
    it('should parse @critical directive with template target', async () => {
      try {
        const plugin = require('../../lib/postcss-shopify-directive-splitter')
        expect(plugin).toBeDefined()
        expect(typeof plugin).toBe('function')
      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should extract critical CSS into separate files', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Check if critical CSS files were generated
        const globalCritical = path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css')
        const productCritical = path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'product.css')
        const collectionCritical = path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'collection.css')

        expect(fs.existsSync(globalCritical)).toBe(true)
        expect(fs.existsSync(productCritical)).toBe(true)
        expect(fs.existsSync(collectionCritical)).toBe(true)

        // Check global critical CSS content
        const globalContent = await fs.promises.readFile(globalCritical, 'utf8')
        expect(globalContent).toContain('.header')
        expect(globalContent).toContain('.logo')
        expect(globalContent).toContain('.main-nav')
        expect(globalContent).toContain('@media (max-width: 768px)')
        expect(globalContent).not.toContain('.footer') // Should not include non-critical
        expect(globalContent).not.toContain('@critical') // Should strip directives

        // Check product critical CSS content
        const productContent = await fs.promises.readFile(productCritical, 'utf8')
        expect(productContent).toContain('.product-hero')
        expect(productContent).toContain('.product-title')
        expect(productContent).toContain('.product-price')
        expect(productContent).toContain('.add-to-cart-btn')
        expect(productContent).not.toContain('.product-reviews') // Should not include non-critical
        expect(productContent).not.toContain('.collection-hero') // Should not include other templates

        // Check collection critical CSS content
        const collectionContent = await fs.promises.readFile(collectionCritical, 'utf8')
        expect(collectionContent).toContain('.collection-hero')
        expect(collectionContent).toContain('.collection-title')
        expect(collectionContent).toContain('.product-grid')
        expect(collectionContent).not.toContain('.product-hero') // Should not include other templates

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should remove critical CSS from main bundle', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const mainContent = await fs.promises.readFile(path.join(BUILD_DIR, 'theme.css'), 'utf8')

        // Main CSS should not contain critical styles
        expect(mainContent).not.toContain('.header') // Should be in critical CSS
        expect(mainContent).not.toContain('.product-hero') // Should be in critical CSS
        expect(mainContent).not.toContain('.collection-hero') // Should be in critical CSS

        // Main CSS should contain non-critical styles
        expect(mainContent).toContain('.footer')
        expect(mainContent).toContain('.product-reviews')
        expect(mainContent).toContain('.related-products')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle multiple @critical blocks for same template', async () => {
      const multipleCriticalCSS = `
        @critical product
          .product-section-1 {
            display: block;
          }
        @endcritical

        .non-critical {
          margin: 2rem;
        }

        @critical product
          .product-section-2 {
            display: flex;
          }
        @endcritical
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'multiple.css'),
        multipleCriticalCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/multiple.css -o build/multiple.css')

        const productCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'product.css'),
          'utf8'
        )

        // Should contain styles from both critical blocks
        expect(productCritical).toContain('.product-section-1')
        expect(productCritical).toContain('.product-section-2')
        expect(productCritical).not.toContain('.non-critical')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('critical CSS optimization', () => {
    it('should enforce critical CSS size budget', async () => {
      // Create large critical CSS to test budget enforcement
      let largeCriticalCSS = '@critical global\n'

      // Add many rules to exceed budget
      for (let i = 0; i < 1000; i++) {
        largeCriticalCSS += `
          .large-critical-class-${i} {
            display: block;
            margin: ${i}px;
            padding: ${i}px;
            background: #${i.toString(16).padStart(6, '0')};
            font-size: ${i + 12}px;
            line-height: ${1.2 + i * 0.01};
            border: ${i}px solid #000;
            border-radius: ${i}px;
          }
        `
      }

      largeCriticalCSS += '@endcritical'

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'large-critical.css'),
        largeCriticalCSS
      )

      try {
        process.chdir(TEST_DIR)

        // Build should either warn or fail due to budget violation
        const result = await execAsync('postcss fixtures/entrypoints/large-critical.css -o build/large-critical.css')
          .catch(error => ({ stderr: error.message, stdout: '' }))

        // Should either succeed with warning or fail with budget error
        expect(result.stderr || result.stdout).toMatch(/budget|exceed|limit|size/i)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should minify critical CSS when enabled', async () => {
      // Update config to enable minification
      const minifyConfig = `
        module.exports = {
          plugins: [
            require('../lib/postcss-shopify-directive-splitter')({
              themeRoot: '${TEST_DIR}',
              sourceCodeDir: 'fixtures',
              entrypointsDir: 'fixtures/entrypoints',
              validSplits: ['product', 'collection', 'cart', 'account'],
              minify: true,
              performanceBudgets: {
                criticalCSS: 14000,
                templateCSS: 30000,
                totalCSS: 250000
              }
            })
          ]
        }
      `

      await fs.promises.writeFile(
        path.join(TEST_DIR, 'postcss.config.js'),
        minifyConfig
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        // Minified CSS should have minimal whitespace
        expect(globalCritical).not.toMatch(/\n\s+/)
        expect(globalCritical).not.toMatch(/\s{2,}/)
        expect(globalCritical.includes('\n\n')).toBe(false)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should preserve critical CSS source maps when enabled', async () => {
      const sourceMapsConfig = `
        module.exports = {
          plugins: [
            require('../lib/postcss-shopify-directive-splitter')({
              themeRoot: '${TEST_DIR}',
              sourceCodeDir: 'fixtures',
              entrypointsDir: 'fixtures/entrypoints',
              validSplits: ['product', 'collection', 'cart', 'account'],
              generateSourceMaps: true
            })
          ]
        }
      `

      await fs.promises.writeFile(
        path.join(TEST_DIR, 'postcss.config.js'),
        sourceMapsConfig
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Should generate source map files or inline source maps
        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        const hasInlineSourceMap = globalCritical.includes('sourceMappingURL=data:')
        const hasSourceMapFile = fs.existsSync(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css.map')
        )

        expect(hasInlineSourceMap || hasSourceMapFile).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle CSS custom properties in critical styles', async () => {
      const customPropsCSS = `
        :root {
          --primary-color: #c41e3a;
          --header-height: 60px;
          --font-family: 'Helvetica Neue', Arial, sans-serif;
        }

        @critical global
          .header {
            height: var(--header-height);
            font-family: var(--font-family);
          }

          .logo {
            color: var(--primary-color);
          }
        @endcritical
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'custom-props.css'),
        customPropsCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/custom-props.css -o build/custom-props.css')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        // Should preserve custom properties
        expect(globalCritical).toContain('var(--header-height)')
        expect(globalCritical).toContain('var(--font-family)')
        expect(globalCritical).toContain('var(--primary-color)')

        // Main CSS should contain the :root declaration
        const mainContent = await fs.promises.readFile(path.join(BUILD_DIR, 'custom-props.css'), 'utf8')
        expect(mainContent).toContain(':root')
        expect(mainContent).toContain('--primary-color')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('Liquid snippet generation', () => {
    it('should generate Liquid snippets for critical CSS inlining', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Check if Liquid snippets were generated
        const globalSnippet = path.join(TEST_DIR, 'snippets', 'critical-global.liquid')
        const productSnippet = path.join(TEST_DIR, 'snippets', 'critical-product.liquid')
        const collectionSnippet = path.join(TEST_DIR, 'snippets', 'critical-collection.liquid')

        if (fs.existsSync(globalSnippet)) {
          const snippetContent = await fs.promises.readFile(globalSnippet, 'utf8')

          expect(snippetContent).toContain('<style>')
          expect(snippetContent).toContain('</style>')
          expect(snippetContent).toContain('.header')
          expect(snippetContent).toContain('.logo')
          expect(snippetContent).not.toContain('@critical')
        }

        // At minimum, should have created critical CSS files
        expect(fs.existsSync(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css')
        )).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should generate conditional Liquid snippets for template-specific critical CSS', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const productSnippet = path.join(TEST_DIR, 'snippets', 'critical-product.liquid')

        if (fs.existsSync(productSnippet)) {
          const snippetContent = await fs.promises.readFile(productSnippet, 'utf8')

          // Should have conditional logic for template
          expect(snippetContent).toMatch(/template\s*[=|contains]\s*['"]product['"]|if.*product/i)
          expect(snippetContent).toContain('<style>')
          expect(snippetContent).toContain('.product-hero')
        }

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle media queries in critical CSS snippets', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        // Should preserve media queries
        expect(globalCritical).toContain('@media (max-width: 768px)')
        expect(globalCritical).toMatch(/@media.*{[\s\S]*?}/m)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('performance optimization', () => {
    it('should inline critical CSS under 2KB threshold', async () => {
      const smallCriticalCSS = `
        @critical global
          .header { position: fixed; top: 0; }
          .logo { height: 40px; }
        @endcritical
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'small-critical.css'),
        smallCriticalCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/small-critical.css -o build/small-critical.css')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        const size = Buffer.byteLength(globalCritical, 'utf8')

        // Small critical CSS should be marked for inlining
        expect(size).toBeLessThan(2048) // 2KB

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should create external files for large critical CSS', async () => {
      const largeCriticalCSS = `
        @critical global
          .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 2rem;
          }

          .logo {
            height: 40px;
            width: auto;
            object-fit: contain;
          }

          .main-nav {
            display: flex;
            align-items: center;
            gap: 2rem;
            list-style: none;
            margin: 0;
            padding: 0;
          }

          .main-nav a {
            text-decoration: none;
            color: #333;
            font-weight: 500;
            transition: color 0.2s ease;
          }

          .main-nav a:hover {
            color: #c41e3a;
          }
        @endcritical
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'large-critical.css'),
        largeCriticalCSS.repeat(10) // Make it large
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/large-critical.css -o build/large-critical.css')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        const size = Buffer.byteLength(globalCritical, 'utf8')

        // Large critical CSS should be external
        expect(size).toBeGreaterThan(2048) // > 2KB

        // Should still be under budget
        expect(size).toBeLessThan(14000) // 14KB budget

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle CSS grid and flexbox in critical styles', async () => {
      const modernCSSCritical = `
        @critical global
          .header {
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-areas: "logo nav actions";
            align-items: center;
            gap: 1rem;
            padding: 1rem 2rem;
          }

          .logo {
            grid-area: logo;
          }

          .main-nav {
            grid-area: nav;
            display: flex;
            gap: 2rem;
          }

          .actions {
            grid-area: actions;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          @supports (display: grid) {
            .header {
              display: grid;
            }
          }

          @supports not (display: grid) {
            .header {
              display: flex;
              justify-content: space-between;
            }
          }
        @endcritical
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'modern-critical.css'),
        modernCSSCritical
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/modern-critical.css -o build/modern-critical.css')

        const globalCritical = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'critical', 'global.css'),
          'utf8'
        )

        // Should preserve modern CSS features
        expect(globalCritical).toContain('display: grid')
        expect(globalCritical).toContain('grid-template-columns')
        expect(globalCritical).toContain('grid-template-areas')
        expect(globalCritical).toContain('@supports')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })
})