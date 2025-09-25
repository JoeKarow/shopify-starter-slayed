/**
 * Performance Budget Checker
 *
 * Enforces CSS performance budgets and provides detailed violation reports
 */

import type { GeneratedFile, DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'
import { formatBytes } from './utils'

export interface BudgetViolation {
  type: 'criticalCSS' | 'templateCSS' | 'totalCSS'
  actual: number
  budget: number
  message: string
  files?: GeneratedFile[]
  suggestions?: string[]
}

export interface BudgetResult {
  status: 'pass' | 'warning' | 'fail'
  violations: BudgetViolation[]
  totalSize: number
  criticalSize: number
  templateSizes: Record<string, number>
}

/**
 * Check performance budget compliance for generated files
 */
export function checkBudget(
  files: GeneratedFile[],
  options: DirectiveSplitterOptions
): BudgetResult {
  const budgets = {
    criticalCSS: options.performanceBudgets?.criticalCSS || 14000,
    templateCSS: options.performanceBudgets?.templateCSS || 30000,
    totalCSS: options.performanceBudgets?.totalCSS || 250000
  }

  const violations: BudgetViolation[] = []

  // Separate files by type
  const criticalFiles = files.filter(f => f.type === 'critical-css')
  const templateFiles = files.filter(f => f.type === 'css-split')
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  // Calculate critical CSS size
  const criticalSize = criticalFiles.reduce((sum, f) => sum + f.size, 0)

  // Calculate template-specific sizes
  const templateSizes: Record<string, number> = {}
  for (const file of templateFiles) {
    if (file.template) {
      templateSizes[file.template] = (templateSizes[file.template] || 0) + file.size
    }
  }

  // Check critical CSS budget
  if (criticalSize > budgets.criticalCSS) {
    violations.push({
      type: 'criticalCSS',
      actual: criticalSize,
      budget: budgets.criticalCSS,
      message: `Critical CSS budget exceeded: ${formatBytes(criticalSize)} > ${formatBytes(budgets.criticalCSS)}`,
      files: criticalFiles,
      suggestions: [
        'Move non-essential styles out of @critical directives',
        'Consider lazy-loading some critical styles',
        'Optimize CSS selectors and remove unused rules',
        'Use CSS compression techniques'
      ]
    })
  }

  // Check individual template budgets
  for (const [template, size] of Object.entries(templateSizes)) {
    if (size > budgets.templateCSS) {
      const templateFile = templateFiles.filter(f => f.template === template)
      violations.push({
        type: 'templateCSS',
        actual: size,
        budget: budgets.templateCSS,
        message: `Template CSS budget exceeded for "${template}": ${formatBytes(size)} > ${formatBytes(budgets.templateCSS)}`,
        files: templateFile,
        suggestions: [
          `Break down ${template} template styles into smaller components`,
          'Move common styles to shared imports',
          'Use CSS-in-JS for component-specific styles',
          'Consider code splitting at the component level'
        ]
      })
    }
  }

  // Check total CSS budget
  if (totalSize > budgets.totalCSS) {
    violations.push({
      type: 'totalCSS',
      actual: totalSize,
      budget: budgets.totalCSS,
      message: `Total CSS budget exceeded: ${formatBytes(totalSize)} > ${formatBytes(budgets.totalCSS)}`,
      files: files,
      suggestions: [
        'Enable CSS minification in production',
        'Remove unused CSS rules across all templates',
        'Implement tree-shaking for CSS imports',
        'Use PostCSS plugins to optimize CSS size',
        'Consider switching to utility-first CSS framework',
        'Audit third-party CSS dependencies'
      ]
    })
  }

  // Determine overall status
  let status: BudgetResult['status'] = 'pass'
  if (violations.length > 0) {
    const hasFailures = violations.some(v =>
      (v.type === 'criticalCSS' && v.actual > v.budget * 1.2) ||
      (v.type === 'templateCSS' && v.actual > v.budget * 1.5) ||
      (v.type === 'totalCSS' && v.actual > v.budget * 1.1)
    )
    status = hasFailures ? 'fail' : 'warning'
  }

  return {
    status,
    violations,
    totalSize,
    criticalSize,
    templateSizes
  }
}

/**
 * Generate detailed budget report
 */
export function generateBudgetReport(result: BudgetResult): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('CSS PERFORMANCE BUDGET REPORT')
  lines.push('='.repeat(60))
  lines.push('')

  // Overall status
  const statusSymbol = result.status === 'pass' ? '✓' : result.status === 'warning' ? '⚠' : '✗'
  lines.push(`Status: ${statusSymbol} ${result.status.toUpperCase()}`)
  lines.push('')

  // Size summary
  lines.push('SIZE SUMMARY:')
  lines.push(`  Total CSS Size: ${formatBytes(result.totalSize)}`)
  lines.push(`  Critical CSS Size: ${formatBytes(result.criticalSize)}`)
  lines.push('')

  if (Object.keys(result.templateSizes).length > 0) {
    lines.push('TEMPLATE SIZES:')
    for (const [template, size] of Object.entries(result.templateSizes)) {
      lines.push(`  ${template}: ${formatBytes(size)}`)
    }
    lines.push('')
  }

  // Violations
  if (result.violations.length > 0) {
    lines.push('BUDGET VIOLATIONS:')
    lines.push('')

    for (const violation of result.violations) {
      lines.push(`❌ ${violation.message}`)

      if (violation.files && violation.files.length > 0) {
        lines.push('   Affected files:')
        for (const file of violation.files) {
          const relativePath = file.path.split('/').slice(-3).join('/')
          lines.push(`     - ${relativePath} (${formatBytes(file.size)})`)
        }
      }

      if (violation.suggestions && violation.suggestions.length > 0) {
        lines.push('   Suggestions:')
        for (const suggestion of violation.suggestions) {
          lines.push(`     • ${suggestion}`)
        }
      }

      lines.push('')
    }
  } else {
    lines.push('✅ All budget requirements met!')
    lines.push('')
  }

  lines.push('='.repeat(60))

  return lines.join('\n')
}

/**
 * Get budget utilization percentages
 */
export function getBudgetUtilization(
  result: BudgetResult,
  budgets: NonNullable<DirectiveSplitterOptions['performanceBudgets']>
): Record<string, number> {
  const defaultBudgets = {
    criticalCSS: budgets.criticalCSS || 14000,
    templateCSS: budgets.templateCSS || 30000,
    totalCSS: budgets.totalCSS || 250000
  }

  return {
    critical: Math.round((result.criticalSize / defaultBudgets.criticalCSS) * 100),
    total: Math.round((result.totalSize / defaultBudgets.totalCSS) * 100),
    ...Object.entries(result.templateSizes).reduce((acc, [template, size]) => ({
      ...acc,
      [template]: Math.round((size / defaultBudgets.templateCSS) * 100)
    }), {})
  }
}

/**
 * Check if budget enforcement should fail the build
 */
export function shouldFailBuild(result: BudgetResult): boolean {
  return result.status === 'fail'
}

/**
 * Get optimization suggestions based on budget violations
 */
export function getOptimizationSuggestions(result: BudgetResult): string[] {
  const suggestions = new Set<string>()

  for (const violation of result.violations) {
    if (violation.suggestions) {
      violation.suggestions.forEach(s => suggestions.add(s))
    }
  }

  return Array.from(suggestions)
}