/**
 * PostCSS Plugin Contract for Shopify Directive Splitter
 * This defines the plugin interface for build-time CSS processing
 */

import type { Plugin, Root, AtRule } from 'postcss'

export interface DirectiveSplitterOptions {
  themeRoot: string
  sourceCodeDir: string
  entrypointsDir: string
  validSplits: string[]
  generateViteTags?: boolean
  minify?: boolean
  performanceBudgets?: {
    criticalCSS?: number    // Default: 14000 bytes
    templateCSS?: number    // Default: 30000 bytes
    totalCSS?: number       // Default: 250000 bytes
  }
}

export interface ProcessedDirective {
  type: 'split' | 'critical' | 'inline' | 'responsive'
  target?: string
  content: string
  sourceFile: string
  lineNumber: number
  options?: {
    lazy?: boolean
    scoped?: boolean
    priority?: number
  }
}

export interface GeneratedFile {
  path: string
  content: string
  type: 'css-split' | 'critical-css' | 'liquid-snippet'
  template?: string
  size: number
  hash: string
}

export interface ProcessingResult {
  files: GeneratedFile[]
  manifest: Record<string, string>
  metrics: {
    directivesProcessed: number
    filesGenerated: number
    totalSize: number
    budgetStatus: 'pass' | 'warning' | 'fail'
  }
  errors: Array<{
    message: string
    line?: number
    directive?: string
  }>
}

export type DirectiveSplitterPlugin = Plugin<DirectiveSplitterOptions>

export interface DirectiveSplitterAPI {
  /**
   * Main plugin factory function
   */
  (options: DirectiveSplitterOptions): DirectiveSplitterPlugin

  /**
   * Process a single directive
   */
  processDirective(atRule: AtRule, options: DirectiveSplitterOptions): ProcessedDirective | null

  /**
   * Generate output files from processed directives
   */
  generateFiles(directives: ProcessedDirective[], options: DirectiveSplitterOptions): GeneratedFile[]

  /**
   * Validate directive syntax and detect conflicts
   */
  validateDirectives(directives: ProcessedDirective[]): Array<{
    type: 'error' | 'warning'
    message: string
    directive?: ProcessedDirective
  }>

  /**
   * Create Liquid snippet for inclusion
   */
  createLiquidSnippet(file: GeneratedFile, options: DirectiveSplitterOptions): string

  /**
   * Check performance budget compliance
   */
  checkBudget(files: GeneratedFile[], options: DirectiveSplitterOptions): {
    status: 'pass' | 'warning' | 'fail'
    violations: Array<{
      type: string
      actual: number
      budget: number
      message: string
    }>
  }
}

/**
 * Expected usage in postcss.config.js:
 *
 * const directiveSplitter = require('./postcss-shopify-directive-splitter')
 *
 * module.exports = {
 *   plugins: [
 *     directiveSplitter({
 *       themeRoot: './',
 *       sourceCodeDir: 'frontend',
 *       entrypointsDir: 'frontend/entrypoints',
 *       validSplits: ['product', 'collection', 'cart', 'account'],
 *       generateViteTags: true,
 *       minify: process.env.NODE_ENV === 'production'
 *     })
 *   ]
 * }
 */