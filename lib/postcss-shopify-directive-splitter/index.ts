/**
 * PostCSS Shopify Directive Splitter Plugin
 *
 * This plugin processes CSS directives (@split, @critical, @inline) to automatically
 * split and organize CSS for optimal performance in Shopify themes.
 */

import { Plugin, Root, AtRule } from 'postcss'
import type {
  DirectiveSplitterOptions,
  DirectiveSplitterAPI,
  DirectiveSplitterPlugin,
  ProcessedDirective,
  GeneratedFile,
  ProcessingResult
} from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

import { processDirective } from './parser'
import { generateFiles, createLiquidSnippet, writeGeneratedFiles } from './generator'
import { checkBudget, generateBudgetReport, shouldFailBuild } from './budget'
import { validateDirectives } from './validator'

/**
 * Main PostCSS plugin factory
 */
function directiveSplitter(options: DirectiveSplitterOptions): DirectiveSplitterPlugin {
  return {
    postcssPlugin: 'postcss-shopify-directive-splitter',

    async Once(root: Root, { result }) {
      try {
        const processingResult = await processCSS(root, options)

        // Store results in PostCSS result for build pipeline access
        result.shopifyDirectives = processingResult

        // Write files to disk if not in watch mode
        if (!options.generateViteTags) {
          await writeGeneratedFiles(processingResult.files)
        }

        // Check budget and fail build if necessary
        if (processingResult.metrics.budgetStatus === 'fail') {
          const budgetResult = checkBudget(processingResult.files, options)
          const report = generateBudgetReport(budgetResult)
          console.error(report)

          if (shouldFailBuild(budgetResult)) {
            throw new Error('CSS performance budget exceeded. Build failed.')
          }
        }

        // Log processing results
        if (options.generateViteTags) { // Dev mode
          console.log(`Processed ${processingResult.metrics.directivesProcessed} directives, generated ${processingResult.metrics.filesGenerated} files`)
        }

      } catch (error) {
        throw new Error(`PostCSS Shopify Directive Splitter: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}

/**
 * Process CSS with directives
 */
async function processCSS(root: Root, options: DirectiveSplitterOptions): Promise<ProcessingResult> {
  const directives: ProcessedDirective[] = []
  const errors: ProcessingResult['errors'] = []

  // Walk through all @-rules and process directive types
  root.walkAtRules((atRule: AtRule) => {
    if (['split', 'critical', 'inline', 'responsive'].includes(atRule.name)) {
      const directive = processDirective(atRule, options)

      if (directive) {
        directives.push(directive)
        // Remove the directive from the AST after processing
        atRule.remove()
      } else {
        errors.push({
          message: `Failed to process ${atRule.name} directive`,
          line: atRule.source?.start?.line,
          directive: atRule.name
        })
      }
    }
  })

  // Validate directives
  const validationResults = validateDirectives(directives)
  const validationErrors = validationResults.filter(v => v.type === 'error')

  if (validationErrors.length > 0) {
    errors.push(...validationErrors.map(v => ({
      message: v.message,
      line: v.directive?.lineNumber,
      directive: v.directive?.type
    })))
  }

  // Generate files from processed directives
  const files = generateFiles(directives, options)

  // Check budget compliance
  const budgetResult = checkBudget(files, options)

  // Calculate metrics
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return {
    files,
    manifest: files.reduce((acc, file) => {
      const key = file.template ? `${file.template}-${file.type}` : file.type
      acc[key] = file.path
      return acc
    }, {} as Record<string, string>),
    metrics: {
      directivesProcessed: directives.length,
      filesGenerated: files.length,
      totalSize,
      budgetStatus: budgetResult.status
    },
    errors
  }
}

// Set the postcss flag
directiveSplitter.postcss = true

// Export the main plugin function and API methods
const api: DirectiveSplitterAPI = Object.assign(directiveSplitter, {
  /**
   * Process a single directive
   */
  processDirective: (atRule: AtRule, options: DirectiveSplitterOptions): ProcessedDirective | null => {
    return processDirective(atRule, options)
  },

  /**
   * Generate output files from processed directives
   */
  generateFiles: (directives: ProcessedDirective[], options: DirectiveSplitterOptions): GeneratedFile[] => {
    return generateFiles(directives, options)
  },

  /**
   * Validate directive syntax and detect conflicts
   */
  validateDirectives: (directives: ProcessedDirective[]) => {
    return validateDirectives(directives)
  },

  /**
   * Create Liquid snippet for inclusion
   */
  createLiquidSnippet: (file: GeneratedFile, options: DirectiveSplitterOptions): string => {
    if (file.type !== 'liquid-snippet') {
      throw new Error('createLiquidSnippet can only be called on liquid-snippet files')
    }
    return file.content // Content is already a liquid snippet
  },

  /**
   * Check performance budget compliance
   */
  checkBudget: (files: GeneratedFile[], options: DirectiveSplitterOptions) => {
    return checkBudget(files, options)
  }
})

export default api

// Re-export types and utilities for external use
export type {
  DirectiveSplitterOptions,
  DirectiveSplitterAPI,
  ProcessedDirective,
  GeneratedFile,
  ProcessingResult
} from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

export { processDirective } from './parser'
export { generateFiles, createLiquidSnippet } from './generator'
export { checkBudget } from './budget'
export { validateDirectives } from './validator'

// Legacy exports for backward compatibility
export { parseDirectives } from './parser'
export type { DirectiveNode, SplitResult } from './parser'