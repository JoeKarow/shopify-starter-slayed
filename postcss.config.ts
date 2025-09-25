/**
 * PostCSS Configuration
 *
 * Configuration for PostCSS processing with Shopify directive splitting,
 * TailwindCSS, and other performance optimization plugins.
 */

import path from 'path'
import directiveSplitter from './lib/postcss-shopify-directive-splitter/index.js'

export default {
  plugins: [
    // TailwindCSS processing
    require('@tailwindcss/postcss'),

    // Shopify directive splitter for performance optimization
    directiveSplitter({
      outputDir: 'frontend/entrypoints/splits',
      templates: [
        'index', 'product', 'collection', 'blog', 'article', 'page',
        'cart', 'search', '404', 'password', 'gift_card',
        'customers/login', 'customers/register', 'customers/account', 'customers/order'
      ],
      budgets: {
        critical: 14 * 1024,  // 14KB critical CSS budget
        template: 30 * 1024,  // 30KB per template budget
        total: 250 * 1024,    // 250KB total CSS budget
      },
      verbose: process.env.NODE_ENV === 'development',
    }),

    // Autoprefixer for cross-browser compatibility
    require('autoprefixer'),

    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production' ? [
      require('cssnano')({
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