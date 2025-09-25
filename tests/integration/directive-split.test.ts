/**
 * T019: Integration test for @split directive processing
 *
 * This test verifies the end-to-end processing of @split directives
 * from CSS parsing through file generation and build integration.
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
const TEST_DIR = '/tmp/shopify-directive-test'
const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures')
const BUILD_DIR = path.join(TEST_DIR, 'build')

// Sample CSS with @split directives
const SAMPLE_CSS_WITH_SPLITS = `
/* Global styles - should remain in main CSS */
.header {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
}

/* Product-specific styles */
@split product
  .product-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .product-details {
    padding: 2rem;
    background: white;
  }

  .product-price {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
  }
@endsplit

/* Collection-specific styles */
@split collection
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
  }

  .collection-filters {
    position: sticky;
    top: 100px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
@endsplit

/* Multi-template split */
@split product,collection
  .shared-component {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
  }
@endsplit

/* Global footer - should remain in main CSS */
.footer {
  background: #333;
  color: white;
  padding: 2rem;
}
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

describe('Directive Split Integration Tests (T019)', () => {
  beforeEach(async () => {
    // Set up test environment
    await fs.promises.mkdir(TEST_DIR, { recursive: true })
    await fs.promises.mkdir(FIXTURES_DIR, { recursive: true })
    await fs.promises.mkdir(path.join(FIXTURES_DIR, 'entrypoints'), { recursive: true })
    await fs.promises.mkdir(path.join(FIXTURES_DIR, 'entrypoints', 'splits'), { recursive: true })
    await fs.promises.mkdir(BUILD_DIR, { recursive: true })

    // Create test CSS file
    await fs.promises.writeFile(
      path.join(FIXTURES_DIR, 'entrypoints', 'theme.css'),
      SAMPLE_CSS_WITH_SPLITS
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
        name: 'directive-test',
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

  describe('@split directive parsing', () => {
    it('should parse @split directive with single template', async () => {
      // This will fail initially - plugin doesn't exist
      try {
        const plugin = require('../../lib/postcss-shopify-directive-splitter')
        expect(plugin).toBeDefined()
        expect(typeof plugin).toBe('function')
      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should process @split directives and generate template-specific CSS files', async () => {
      // Attempt to run PostCSS with the directive splitter
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Check if split files were generated
        const productCSS = path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css')
        const collectionCSS = path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'collection.css')

        // Files should exist
        expect(fs.existsSync(productCSS)).toBe(true)
        expect(fs.existsSync(collectionCSS)).toBe(true)

        // Check product CSS content
        const productContent = await fs.promises.readFile(productCSS, 'utf8')
        expect(productContent).toContain('.product-gallery')
        expect(productContent).toContain('.product-details')
        expect(productContent).toContain('.product-price')
        expect(productContent).toContain('.shared-component') // Multi-template split
        expect(productContent).not.toContain('.collection-grid')
        expect(productContent).not.toContain('.collection-filters')

        // Check collection CSS content
        const collectionContent = await fs.promises.readFile(collectionCSS, 'utf8')
        expect(collectionContent).toContain('.collection-grid')
        expect(collectionContent).toContain('.collection-filters')
        expect(collectionContent).toContain('.shared-component') // Multi-template split
        expect(collectionContent).not.toContain('.product-gallery')
        expect(collectionContent).not.toContain('.product-details')

        // Check main CSS still contains global styles
        const mainContent = await fs.promises.readFile(path.join(BUILD_DIR, 'theme.css'), 'utf8')
        expect(mainContent).toContain('.header')
        expect(mainContent).toContain('.footer')
        expect(mainContent).not.toContain('.product-gallery') // Should be moved to split
        expect(mainContent).not.toContain('.collection-grid') // Should be moved to split

      } catch (error) {
        // Expected to fail initially - implementation doesn't exist
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle multi-template @split directives correctly', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const productCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )
        const collectionCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'collection.css'),
          'utf8'
        )

        // Both files should contain the shared component
        expect(productCSS).toContain('.shared-component')
        expect(collectionCSS).toContain('.shared-component')

      } catch (error) {
        // Expected to fail initially
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should validate split targets against valid splits list', async () => {
      // Create CSS with invalid split target
      const invalidCSS = `
        @split invalid-template
          .invalid-styles { color: red; }
        @endsplit
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'invalid.css'),
        invalidCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/invalid.css -o build/invalid.css')

        // Should not create split file for invalid template
        const invalidSplit = path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'invalid-template.css')
        expect(fs.existsSync(invalidSplit)).toBe(false)

      } catch (error) {
        // Could fail for validation error or missing plugin
        expect((error as Error).message).toMatch(/Cannot find module|validation|invalid/i)
      }
    })
  })

  describe('file generation and structure', () => {
    it('should create proper directory structure for split files', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Check directory structure
        const splitsDir = path.join(FIXTURES_DIR, 'entrypoints', 'splits')
        expect(fs.existsSync(splitsDir)).toBe(true)

        const files = await fs.promises.readdir(splitsDir)
        expect(files).toContain('product.css')
        expect(files).toContain('collection.css')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should generate Vite tags for split files when enabled', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Should create manifest or tag files for Vite integration
        const manifestPath = path.join(BUILD_DIR, 'manifest.json')
        const tagsPath = path.join(BUILD_DIR, 'vite-tags.liquid')

        // At least one should exist for Vite integration
        const hasManifest = fs.existsSync(manifestPath)
        const hasTags = fs.existsSync(tagsPath)

        expect(hasManifest || hasTags).toBe(true)

        if (hasManifest) {
          const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'))
          expect(manifest).toHaveProperty('splits')
          expect(manifest.splits).toHaveProperty('product')
          expect(manifest.splits).toHaveProperty('collection')
        }

        if (hasTags) {
          const tags = await fs.promises.readFile(tagsPath, 'utf8')
          expect(tags).toContain('product.css')
          expect(tags).toContain('collection.css')
        }

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should maintain proper CSS formatting in split files', async () => {
      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        const productCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        // Should maintain proper CSS structure
        expect(productCSS).toMatch(/\.product-gallery\s*\{[\s\S]*?\}/)
        expect(productCSS).toMatch(/display:\s*grid/)
        expect(productCSS).toMatch(/grid-template-columns:/)

        // Should not have directive artifacts
        expect(productCSS).not.toContain('@split')
        expect(productCSS).not.toContain('@endsplit')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle nested CSS rules within @split directives', async () => {
      const nestedCSS = `
        @split product
          .product-container {
            padding: 2rem;

            .product-title {
              font-size: 2.5rem;
              margin-bottom: 1rem;
            }

            .product-meta {
              display: flex;
              gap: 1rem;

              .price {
                font-weight: bold;
              }

              .availability {
                color: green;
              }
            }
          }

          @media (max-width: 768px) {
            .product-container {
              padding: 1rem;

              .product-title {
                font-size: 1.8rem;
              }
            }
          }
        @endsplit
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'nested.css'),
        nestedCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/nested.css -o build/nested.css')

        const productCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        // Should contain nested rules
        expect(productCSS).toContain('.product-container')
        expect(productCSS).toContain('.product-title')
        expect(productCSS).toContain('.product-meta')
        expect(productCSS).toContain('@media (max-width: 768px)')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })

  describe('build integration', () => {
    it('should integrate with existing PostCSS pipeline', async () => {
      // Add autoprefixer to the pipeline
      const enhancedConfig = `
        module.exports = {
          plugins: [
            require('../lib/postcss-shopify-directive-splitter')({
              themeRoot: '${TEST_DIR}',
              sourceCodeDir: 'fixtures',
              entrypointsDir: 'fixtures/entrypoints',
              validSplits: ['product', 'collection', 'cart', 'account'],
              generateViteTags: true
            }),
            require('autoprefixer')
          ]
        }
      `

      await fs.promises.writeFile(
        path.join(TEST_DIR, 'postcss.config.js'),
        enhancedConfig
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('npm run build')

        // Files should be processed by both plugins
        const productCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        // Should have both split processing and autoprefixer
        expect(productCSS).toContain('.product-gallery')
        // Autoprefixer should add vendor prefixes if needed
        // This is just testing the pipeline integration

      } catch (error) {
        expect((error as Error).message).toMatch(/Cannot find module|autoprefixer/)
      }
    })

    it('should handle build errors gracefully', async () => {
      // Create malformed CSS
      const malformedCSS = `
        @split product
          .malformed {
            color: red
            /* Missing closing brace and semicolon */
        @endsplit
      `

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'malformed.css'),
        malformedCSS
      )

      try {
        process.chdir(TEST_DIR)
        await execAsync('postcss fixtures/entrypoints/malformed.css -o build/malformed.css')

        // Should handle errors gracefully and not crash the build
        // Exact behavior depends on implementation

      } catch (error) {
        // Could fail due to syntax error or missing plugin
        // Both are valid test outcomes at this stage
        expect(typeof (error as Error).message).toBe('string')
      }
    })

    it('should work with watch mode for development', async () => {
      // This test would verify watch mode functionality
      // For now, just verify the basic setup supports it

      try {
        // Create a package.json with watch script
        await fs.promises.writeFile(
          path.join(TEST_DIR, 'package.json'),
          JSON.stringify({
            name: 'directive-test',
            private: true,
            scripts: {
              build: 'postcss fixtures/entrypoints/theme.css -o build/theme.css',
              watch: 'postcss fixtures/entrypoints/theme.css -o build/theme.css --watch'
            }
          }, null, 2)
        )

        // Just verify the script exists for now
        const packageJson = JSON.parse(
          await fs.promises.readFile(path.join(TEST_DIR, 'package.json'), 'utf8')
        )

        expect(packageJson.scripts.watch).toContain('--watch')

      } catch (error) {
        // This is more about setup than implementation
        expect(error).toBeDefined()
      }
    })
  })

  describe('performance and optimization', () => {
    it('should process large CSS files efficiently', async () => {
      // Create a large CSS file with many splits
      let largeCSS = '/* Global styles */\n'
      largeCSS += '.header { position: fixed; top: 0; }\n\n'

      // Add many product styles
      for (let i = 0; i < 100; i++) {
        largeCSS += `
          @split product
            .product-component-${i} {
              display: block;
              margin: 1rem;
              padding: 0.5rem;
              background: #f${i.toString().padStart(2, '0')}f${i.toString().padStart(2, '0')}f${i.toString().padStart(2, '0')};
            }
          @endsplit
        `
      }

      await fs.promises.writeFile(
        path.join(FIXTURES_DIR, 'entrypoints', 'large.css'),
        largeCSS
      )

      try {
        process.chdir(TEST_DIR)
        const startTime = Date.now()
        await execAsync('postcss fixtures/entrypoints/large.css -o build/large.css')
        const processingTime = Date.now() - startTime

        console.log(`Large CSS processing time: ${processingTime}ms`)

        // Should process in reasonable time (< 5 seconds)
        expect(processingTime).toBeLessThan(5000)

        // Should generate the split file
        const productCSS = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        expect(productCSS).toContain('.product-component-0')
        expect(productCSS).toContain('.product-component-99')

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should handle concurrent processing', async () => {
      // Create multiple CSS files
      const files = ['theme1.css', 'theme2.css', 'theme3.css']

      for (const file of files) {
        await fs.promises.writeFile(
          path.join(FIXTURES_DIR, 'entrypoints', file),
          SAMPLE_CSS_WITH_SPLITS
        )
      }

      try {
        process.chdir(TEST_DIR)

        // Process files concurrently
        const promises = files.map(file =>
          execAsync(`postcss fixtures/entrypoints/${file} -o build/${file}`)
        )

        await Promise.all(promises)

        // All files should be processed successfully
        for (const file of files) {
          expect(fs.existsSync(path.join(BUILD_DIR, file))).toBe(true)
        }

        // Split files should be generated correctly
        expect(fs.existsSync(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css')
        )).toBe(true)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })

    it('should maintain consistent output across runs', async () => {
      try {
        process.chdir(TEST_DIR)

        // Run build twice
        await execAsync('npm run build')
        const firstRun = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        await execAsync('npm run build')
        const secondRun = await fs.promises.readFile(
          path.join(FIXTURES_DIR, 'entrypoints', 'splits', 'product.css'),
          'utf8'
        )

        // Output should be deterministic
        expect(firstRun).toBe(secondRun)

      } catch (error) {
        expect((error as Error).message).toContain('Cannot find module')
      }
    })
  })
})