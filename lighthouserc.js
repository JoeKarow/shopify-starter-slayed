/**
 * Lighthouse CI Configuration for Shopify Template Performance Validation
 * T068: Run Lighthouse CI on all major templates (target: score > 90)
 *
 * This configuration sets up comprehensive performance testing for:
 * - Homepage (index)
 * - Product pages
 * - Collection pages
 * - Cart page
 *
 * Performance targets:
 * - Overall Lighthouse score > 90
 * - Performance score > 85
 * - Best practices score > 90
 * - Accessibility score > 95
 * - SEO score > 90
 */

module.exports = {
  ci: {
    collect: {
      // Start local server for testing
      startServerCommand: 'bun run dev',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 60000,

      // URLs to test - all major Shopify templates
      url: [
        'http://127.0.0.1:9292/', // Homepage
        'http://127.0.0.1:9292/products/sample-product', // Product page
        'http://127.0.0.1:9292/collections/all', // Collection page
        'http://127.0.0.1:9292/cart', // Cart page
      ],

      // Lighthouse settings
      numberOfRuns: 3, // Multiple runs for consistency
      settings: {
        // Mobile-first testing (primary target)
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        // Enable all audits
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Skip PWA for now as it's not the focus
        skipAudits: ['pwa-cross-browser', 'pwa-page-transitions', 'pwa-each-page-has-url'],
      },
    },

    assert: {
      // Performance budget assertions
      assertions: {
        // Overall category scores (target: > 90)
        'categories:performance': ['error', { minScore: 0.85 }], // 85+ for performance (strict)
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95+ for accessibility
        'categories:best-practices': ['error', { minScore: 0.90 }], // 90+ for best practices
        'categories:seo': ['error', { minScore: 0.90 }], // 90+ for SEO

        // Core Web Vitals (aligned with our performance tests)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // LCP < 2.5s
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }], // FCP < 1.8s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // TBT < 300ms

        // Resource budgets (aligned with our targets)
        'total-byte-weight': ['error', { maxNumericValue: 1024000 }], // Total < 1MB
        'render-blocking-resources': ['error', { maxNumericValue: 500 }], // RBR < 500ms

        // Performance optimizations
        'uses-optimized-images': 'error',
        'uses-webp-images': 'error',
        'uses-responsive-images': 'error',
        'efficient-animated-content': 'error',
        'uses-text-compression': 'error',
        'uses-rel-preconnect': 'error',
        'preload-lcp-image': 'error',

        // Critical CSS and resource hints
        'unused-css-rules': ['warn', { maxLength: 1 }], // Warn on unused CSS
        'unminified-css': 'error',
        'unminified-javascript': 'error',

        // Accessibility assertions
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',

        // SEO assertions
        'meta-description': 'error',
        'document-title': 'error',
        'hreflang': 'off', // Not applicable for single-language themes
        'canonical': 'error',
      },

      // Matrix assertions for different URLs
      matrix: [
        {
          // Homepage specific assertions
          matchingUrlPattern: '.*/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
          }
        },
        {
          // Product page specific assertions
          matchingUrlPattern: '.*/products/.*',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'uses-optimized-images': 'error', // Critical for product images
            'preload-lcp-image': 'error', // Product hero image should be preloaded
          }
        },
        {
          // Collection page specific assertions
          matchingUrlPattern: '.*/collections/.*',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'uses-responsive-images': 'error', // Multiple product images
          }
        },
        {
          // Cart page specific assertions
          matchingUrlPattern: '.*/cart.*',
          assertions: {
            'interactive': ['error', { maxNumericValue: 3500 }], // TTI < 3.5s for cart interactions
          }
        }
      ]
    },

    upload: {
      target: 'filesystem',
      outputDir: './dist/lighthouse-reports',
    },

    server: {
      port: 9001,
      storage: './dist/lighthouse-reports',
    },
  },
};