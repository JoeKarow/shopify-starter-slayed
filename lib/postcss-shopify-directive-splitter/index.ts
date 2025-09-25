/**
 * PostCSS Shopify Directive Splitter Plugin
 *
 * This plugin processes CSS directives (@split, @critical, @inline) to automatically
 * split and organize CSS for optimal performance in Shopify themes.
 */

import { Plugin } from 'postcss'
import { parseDirectives } from './parser.js'
import { generateSplits } from './generator.js'

export interface DirectiveSplitterOptions {
  outputDir?: string
  templates?: string[]
  budgets?: {
    critical?: number
    template?: number
    total?: number
  }
  verbose?: boolean
}

const DEFAULT_OPTIONS: Required<DirectiveSplitterOptions> = {
  outputDir: 'frontend/entrypoints/splits',
  templates: [],
  budgets: {
    critical: 14 * 1024, // 14KB critical CSS budget
    template: 30 * 1024, // 30KB per template budget
    total: 250 * 1024,   // 250KB total CSS budget
  },
  verbose: false,
}

/**
 * PostCSS plugin factory for Shopify directive splitting
 */
export default function directiveSplitter(options: DirectiveSplitterOptions = {}): Plugin {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return {
    postcssPlugin: 'postcss-shopify-directive-splitter',
    Once(root, { result }) {
      try {
        // Parse CSS directives from the AST
        const directives = parseDirectives(root)

        if (directives.length === 0) {
          return
        }

        // Generate split CSS files based on directives
        const splits = generateSplits(directives, opts)

        if (opts.verbose) {
          console.log(`Generated ${splits.length} CSS splits`)
        }

        // Store splits in result for build pipeline access
        result.splits = splits

      } catch (error) {
        throw new Error(`PostCSS Shopify Directive Splitter: ${error.message}`)
      }
    },
  }
}

directiveSplitter.postcss = true

export { parseDirectives } from './parser.js'
export { generateSplits } from './generator.js'
export type { DirectiveNode, SplitResult } from './parser.js'