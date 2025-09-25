/**
 * CSS Split Generator
 *
 * Generates template-specific CSS files from parsed directives
 */

import { promises as fs } from 'fs'
import path from 'path'
import { DirectiveNode, SplitResult, groupDirectivesByTemplate } from './parser.js'
import type { DirectiveSplitterOptions } from './index.js'

/**
 * Generate CSS splits from parsed directives
 */
export async function generateSplits(
  directives: DirectiveNode[],
  options: Required<DirectiveSplitterOptions>
): Promise<SplitResult[]> {
  const splits: SplitResult[] = []
  const grouped = groupDirectivesByTemplate(directives)

  // Ensure output directory exists
  await ensureOutputDirectory(options.outputDir)

  for (const [template, templateDirectives] of grouped) {
    if (template === 'global') {
      // Handle global directives (critical, inline)
      const globalSplits = await generateGlobalSplits(templateDirectives, options)
      splits.push(...globalSplits)
    } else {
      // Handle template-specific splits
      const templateSplit = await generateTemplateSplit(template, templateDirectives, options)
      if (templateSplit) {
        splits.push(templateSplit)
      }
    }
  }

  // Validate against budgets
  validateBudgets(splits, options.budgets)

  return splits
}

/**
 * Generate global CSS splits (critical, inline)
 */
async function generateGlobalSplits(
  directives: DirectiveNode[],
  options: Required<DirectiveSplitterOptions>
): Promise<SplitResult[]> {
  const splits: SplitResult[] = []

  for (const directive of directives) {
    if (directive.type === 'critical') {
      const css = directive.rules.join('\n')
      const split: SplitResult = {
        template: 'critical',
        css,
        size: Buffer.byteLength(css, 'utf8'),
        critical: true,
      }

      splits.push(split)

      // Write critical CSS to file
      const filePath = path.join(options.outputDir, 'critical.css')
      await fs.writeFile(filePath, css, 'utf8')

      if (options.verbose) {
        console.log(`Generated critical.css (${formatSize(split.size)})`)
      }
    }

    if (directive.type === 'inline') {
      const css = directive.rules.join('\n')
      const componentName = directive.params?.[0] || 'inline'

      const split: SplitResult = {
        template: componentName,
        css,
        size: Buffer.byteLength(css, 'utf8'),
        inline: true,
      }

      splits.push(split)

      // Inline CSS is typically embedded, not written to file
      if (options.verbose) {
        console.log(`Generated inline CSS for ${componentName} (${formatSize(split.size)})`)
      }
    }
  }

  return splits
}

/**
 * Generate template-specific CSS split
 */
async function generateTemplateSplit(
  template: string,
  directives: DirectiveNode[],
  options: Required<DirectiveSplitterOptions>
): Promise<SplitResult | null> {
  const css = directives
    .flatMap(d => d.rules)
    .join('\n')

  if (!css.trim()) {
    return null
  }

  const split: SplitResult = {
    template,
    css,
    size: Buffer.byteLength(css, 'utf8'),
  }

  // Write template CSS to file
  const fileName = `${template}.css`
  const filePath = path.join(options.outputDir, fileName)
  await fs.writeFile(filePath, css, 'utf8')

  if (options.verbose) {
    console.log(`Generated ${fileName} (${formatSize(split.size)})`)
  }

  return split
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.access(outputDir)
  } catch {
    await fs.mkdir(outputDir, { recursive: true })
  }
}

/**
 * Validate CSS splits against performance budgets
 */
function validateBudgets(splits: SplitResult[], budgets: Required<DirectiveSplitterOptions>['budgets']): void {
  // Validate critical CSS budget
  const criticalSplits = splits.filter(s => s.critical)
  const criticalSize = criticalSplits.reduce((sum, s) => sum + s.size, 0)

  if (criticalSize > budgets.critical) {
    console.warn(
      `Critical CSS budget exceeded: ${formatSize(criticalSize)} > ${formatSize(budgets.critical)}`
    )
  }

  // Validate individual template budgets
  const templateSplits = splits.filter(s => !s.critical && !s.inline)
  for (const split of templateSplits) {
    if (split.size > budgets.template) {
      console.warn(
        `Template CSS budget exceeded for ${split.template}: ${formatSize(split.size)} > ${formatSize(budgets.template)}`
      )
    }
  }

  // Validate total CSS budget
  const totalSize = splits.reduce((sum, s) => sum + s.size, 0)
  if (totalSize > budgets.total) {
    console.warn(
      `Total CSS budget exceeded: ${formatSize(totalSize)} > ${formatSize(budgets.total)}`
    )
  }
}

/**
 * Format byte size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Get template-specific CSS import path
 */
export function getTemplateImportPath(template: string): string {
  return `./splits/${template}.css`
}

/**
 * Generate CSS import statements for templates
 */
export function generateImportStatements(splits: SplitResult[]): string {
  return splits
    .filter(s => !s.critical && !s.inline)
    .map(s => `@import "${getTemplateImportPath(s.template)}";`)
    .join('\n')
}