/**
 * PostCSS Configuration
 *
 * Configuration for PostCSS processing with Shopify directive splitting,
 * TailwindCSS, and other performance optimization plugins.
 */

import directiveSplitter from './lib/postcss-shopify-directive-splitter/index.js'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

export default {
  plugins: [
    // TailwindCSS processing
    tailwindcss,

    // Shopify directive splitter for performance optimization
    directiveSplitter({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      validSplits: [
        'index', 'product', 'collection', 'blog', 'article', 'page',
        'cart', 'search', '404', 'password', 'gift_card',
        'customers/login', 'customers/register', 'customers/account', 'customers/order'
      ],
      performanceBudgets: {
        criticalCSS: 14 * 1024,  // 14KB critical CSS budget
        templateCSS: 30 * 1024,  // 30KB per template budget
        totalCSS: 250 * 1024,    // 250KB total CSS budget
      },
      generateViteTags: process.env.NODE_ENV === 'development',
      minify: process.env.NODE_ENV === 'production',
    }),

    // Autoprefixer for cross-browser compatibility
    autoprefixer,

    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production' ? [
      cssnano({
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          reduceIdents: false,
          zindex: false,
        }],
      }),
    ] : []),
  ],
}