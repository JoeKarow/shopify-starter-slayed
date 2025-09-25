/**
 * Vite Performance Budget Plugin
 *
 * A Vite plugin that enforces performance budgets during build and provides
 * real-time feedback on asset sizes for Shopify theme optimization.
 */

import type { Plugin, ResolvedConfig, Rollup } from 'vite'
import path from 'path'
import { promises as fs } from 'fs'

export interface PerformanceBudgetOptions {
  /** CSS budget limits */
  css?: {
    /** Critical CSS budget (default: 14KB) */
    critical?: number
    /** Per-template CSS budget (default: 30KB) */
    template?: number
    /** Total CSS budget (default: 250KB) */
    total?: number
  }
  /** JavaScript budget limits */
  js?: {
    /** Main bundle budget (default: 100KB) */
    main?: number
    /** Per-chunk budget (default: 50KB) */
    chunk?: number
    /** Total JS budget (default: 200KB) */
    total?: number
  }
  /** Asset budget limits */
  assets?: {
    /** Individual asset budget (default: 500KB) */
    individual?: number
    /** Total assets budget (default: 2MB) */
    total?: number
  }
  /** Behavior options */
  behavior?: {
    /** Fail build on budget exceeded (default: false) */
    failOnExceeded?: boolean
    /** Show warnings for budget exceeded (default: true) */
    warn?: boolean
    /** Generate budget report (default: true) */
    report?: boolean
    /** Output directory for reports */
    reportDir?: string
  }
}

interface AssetSize {
  name: string
  size: number
  compressed?: number
  type: 'css' | 'js' | 'asset'
  category?: string
}

interface BudgetReport {
  timestamp: string
  buildTime: number
  assets: AssetSize[]
  budgets: PerformanceBudgetOptions
  violations: BudgetViolation[]
  totals: {
    css: number
    js: number
    assets: number
    all: number
  }
}

interface BudgetViolation {
  type: 'css' | 'js' | 'asset'
  category: string
  actual: number
  budget: number
  excess: number
  severity: 'warning' | 'error'
}

const DEFAULT_OPTIONS: Required<PerformanceBudgetOptions> = {
  css: {
    critical: 14 * 1024,  // 14KB
    template: 30 * 1024,  // 30KB
    total: 250 * 1024,    // 250KB
  },
  js: {
    main: 100 * 1024,     // 100KB
    chunk: 50 * 1024,     // 50KB
    total: 200 * 1024,    // 200KB
  },
  assets: {
    individual: 500 * 1024, // 500KB
    total: 2 * 1024 * 1024, // 2MB
  },
  behavior: {
    failOnExceeded: false,
    warn: true,
    report: true,
    reportDir: 'dist/reports',
  },
}

/**
 * Vite Performance Budget Plugin
 */
export default function performanceBudgetPlugin(
  options: PerformanceBudgetOptions = {}
): Plugin {
  const opts = mergeOptions(DEFAULT_OPTIONS, options)
  let config: ResolvedConfig
  const startTime = Date.now()

  return {
    name: 'vite-plugin-performance-budget',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    async generateBundle(_outputOptions, bundle) {
      if (config.command !== 'build') return

      const assets = analyzeBundle(bundle)
      const violations = checkBudgets(assets, opts as Required<PerformanceBudgetOptions>)
      const buildTime = Date.now() - startTime

      const report: BudgetReport = {
        timestamp: new Date().toISOString(),
        buildTime,
        assets,
        budgets: opts,
        violations,
        totals: calculateTotals(assets),
      }

      // Generate report if enabled
      if (opts.behavior.report) {
        await generateReport(report, opts.behavior.reportDir!)
      }

      // Log results
      logResults(report, opts.behavior.warn!)

      // Fail build if configured and violations exist
      if (opts.behavior.failOnExceeded && violations.length > 0) {
        const errorViolations = violations.filter(v => v.severity === 'error')
        if (errorViolations.length > 0) {
          throw new Error(
            `Performance budget exceeded:\n${formatViolations(errorViolations)}`
          )
        }
      }
    },
  }
}

/**
 * Analyze bundle for asset sizes
 */
function analyzeBundle(bundle: Rollup.OutputBundle): AssetSize[] {
  const assets: AssetSize[] = []

  for (const [fileName, output] of Object.entries(bundle)) {
    const size = 'code' in output ? Buffer.byteLength(output.code, 'utf8') : output.source.length
    const type = getAssetType(fileName)
    const category = getAssetCategory(fileName, type)

    assets.push({
      name: fileName,
      size,
      type,
      category,
    })
  }

  return assets
}

/**
 * Get asset type from file name
 */
function getAssetType(fileName: string): 'css' | 'js' | 'asset' {
  const ext = path.extname(fileName).toLowerCase()

  if (ext === '.css') return 'css'
  if (ext === '.js' || ext === '.mjs') return 'js'
  return 'asset'
}

/**
 * Get asset category for budget checking
 */
function getAssetCategory(fileName: string, type: AssetSize['type']): string {
  if (type === 'css') {
    // Critical CSS (extracted with @critical directive)
    if (fileName.includes('critical') || fileName.match(/critical\.[a-f0-9]+\.css$/)) {
      return 'critical'
    }
    // Template-specific CSS (generated by @split directive)
    if (fileName.includes('/splits/') || fileName.match(/\/(product|collection|cart|checkout|index|blog|article|page|search|404|password|gift_card)\.[a-f0-9]+\.css$/)) {
      return 'template'
    }
    // Inline CSS (generated by @inline directive) - should be very small
    if (fileName.includes('inline') || fileName.match(/inline\.[a-f0-9]+\.css$/)) {
      return 'inline'
    }
    return 'main'
  }

  if (type === 'js') {
    if (fileName.includes('main') || fileName.includes('theme') || fileName.match(/theme\.[a-f0-9]+\.js$/)) {
      return 'main'
    }
    // Prodify system or other specific components
    if (fileName.includes('prodify') || fileName.includes('alpine')) {
      return 'component'
    }
    return 'chunk'
  }

  return 'general'
}

/**
 * Check assets against budgets
 */
function checkBudgets(assets: AssetSize[], options: Required<PerformanceBudgetOptions>): BudgetViolation[] {
  const violations: BudgetViolation[] = []

  // Check CSS budgets
  const cssAssets = assets.filter(a => a.type === 'css')
  const criticalCSS = cssAssets.filter(a => a.category === 'critical')
  const templateCSS = cssAssets.filter(a => a.category === 'template')
  const inlineCSS = cssAssets.filter(a => a.category === 'inline')
  const totalCSS = cssAssets.reduce((sum, a) => sum + a.size, 0)

  // Critical CSS budget
  const criticalSize = criticalCSS.reduce((sum, a) => sum + a.size, 0)
  if (criticalSize > options.css.critical!) {
    violations.push({
      type: 'css',
      category: 'critical',
      actual: criticalSize,
      budget: options.css.critical!,
      excess: criticalSize - options.css.critical!,
      severity: 'error',
    })
  }

  // Template CSS budgets (generated by @split directives)
  for (const asset of templateCSS) {
    if (asset.size > options.css.template!) {
      violations.push({
        type: 'css',
        category: `template:${asset.name}`,
        actual: asset.size,
        budget: options.css.template!,
        excess: asset.size - options.css.template!,
        severity: 'warning',
      })
    }
  }

  // Inline CSS should be very small (generated by @inline directives)
  const inlineBudget = 5 * 1024 // 5KB limit for inline CSS
  for (const asset of inlineCSS) {
    if (asset.size > inlineBudget) {
      violations.push({
        type: 'css',
        category: `inline:${asset.name}`,
        actual: asset.size,
        budget: inlineBudget,
        excess: asset.size - inlineBudget,
        severity: 'warning',
      })
    }
  }

  // Total CSS budget
  if (totalCSS > options.css.total!) {
    violations.push({
      type: 'css',
      category: 'total',
      actual: totalCSS,
      budget: options.css.total!,
      excess: totalCSS - options.css.total!,
      severity: 'error',
    })
  }

  // Check JS budgets
  const jsAssets = assets.filter(a => a.type === 'js')
  const mainJS = jsAssets.filter(a => a.category === 'main')
  const chunkJS = jsAssets.filter(a => a.category === 'chunk')
  const totalJS = jsAssets.reduce((sum, a) => sum + a.size, 0)

  // Main JS budget
  for (const asset of mainJS) {
    if (asset.size > options.js.main!) {
      violations.push({
        type: 'js',
        category: `main:${asset.name}`,
        actual: asset.size,
        budget: options.js.main!,
        excess: asset.size - options.js.main!,
        severity: 'warning',
      })
    }
  }

  // Chunk JS budgets
  for (const asset of chunkJS) {
    if (asset.size > options.js.chunk!) {
      violations.push({
        type: 'js',
        category: `chunk:${asset.name}`,
        actual: asset.size,
        budget: options.js.chunk!,
        excess: asset.size - options.js.chunk!,
        severity: 'warning',
      })
    }
  }

  // Total JS budget
  if (totalJS > options.js.total!) {
    violations.push({
      type: 'js',
      category: 'total',
      actual: totalJS,
      budget: options.js.total!,
      excess: totalJS - options.js.total!,
      severity: 'error',
    })
  }

  return violations
}

/**
 * Calculate totals by type
 */
function calculateTotals(assets: AssetSize[]) {
  return {
    css: assets.filter(a => a.type === 'css').reduce((sum, a) => sum + a.size, 0),
    js: assets.filter(a => a.type === 'js').reduce((sum, a) => sum + a.size, 0),
    assets: assets.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.size, 0),
    all: assets.reduce((sum, a) => sum + a.size, 0),
  }
}

/**
 * Generate performance report
 */
async function generateReport(report: BudgetReport, reportDir: string): Promise<void> {
  await fs.mkdir(reportDir, { recursive: true })

  const reportPath = path.join(reportDir, `performance-${Date.now()}.json`)
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

  // Also generate a simple HTML report
  const htmlReport = generateHTMLReport(report)
  const htmlPath = path.join(reportDir, 'performance-latest.html')
  await fs.writeFile(htmlPath, htmlReport)

  console.log(`Performance report generated: ${reportPath}`)
}

/**
 * Log results to console
 */
function logResults(report: BudgetReport, showWarnings: boolean): void {
  console.log('\n📊 Performance Budget Report')
  console.log('================================')
  console.log(`Build time: ${report.buildTime}ms`)

  // Show CSS breakdown by directive type
  const cssAssets = report.assets.filter(a => a.type === 'css')
  const criticalCSS = cssAssets.filter(a => a.category === 'critical')
  const templateCSS = cssAssets.filter(a => a.category === 'template')
  const inlineCSS = cssAssets.filter(a => a.category === 'inline')
  const mainCSS = cssAssets.filter(a => a.category === 'main')

  console.log(`\nCSS Breakdown (Shopify Directive Splitting):`)
  console.log(`  Critical CSS (@critical): ${formatSize(criticalCSS.reduce((sum, a) => sum + a.size, 0))} (${criticalCSS.length} files)`)
  console.log(`  Template CSS (@split): ${formatSize(templateCSS.reduce((sum, a) => sum + a.size, 0))} (${templateCSS.length} files)`)
  console.log(`  Inline CSS (@inline): ${formatSize(inlineCSS.reduce((sum, a) => sum + a.size, 0))} (${inlineCSS.length} files)`)
  console.log(`  Main CSS: ${formatSize(mainCSS.reduce((sum, a) => sum + a.size, 0))} (${mainCSS.length} files)`)
  console.log(`  Total CSS: ${formatSize(report.totals.css)}`)

  console.log(`\nOther Assets:`)
  console.log(`  Total JS: ${formatSize(report.totals.js)}`)
  console.log(`  Total Assets: ${formatSize(report.totals.assets)}`)

  if (report.violations.length === 0) {
    console.log('\n✅ All budgets within limits')
    return
  }

  if (showWarnings) {
    console.log('\n⚠️  Budget Violations:')
    for (const violation of report.violations) {
      const icon = violation.severity === 'error' ? '❌' : '⚠️'
      console.log(`${icon} ${violation.category}: ${formatSize(violation.actual)} (${formatSize(violation.excess)} over budget)`)
    }
  }
}

/**
 * Format violations for error messages
 */
function formatViolations(violations: BudgetViolation[]): string {
  return violations
    .map(v => `- ${v.category}: ${formatSize(v.actual)} (${formatSize(v.excess)} over budget)`)
    .join('\n')
}

/**
 * Format byte size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Generate simple HTML report
 */
function generateHTMLReport(report: BudgetReport): string {
  const violations = report.violations.map(v => `
    <tr class="${v.severity}">
      <td>${v.category}</td>
      <td>${formatSize(v.actual)}</td>
      <td>${formatSize(v.budget)}</td>
      <td>${formatSize(v.excess)}</td>
    </tr>
  `).join('')

  const assets = report.assets.map(a => `
    <tr>
      <td>${a.name}</td>
      <td>${a.type}</td>
      <td>${a.category}</td>
      <td>${formatSize(a.size)}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Budget Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .error { background-color: #ffebee; }
    .warning { background-color: #fff3e0; }
    .totals { background-color: #e8f5e8; }
  </style>
</head>
<body>
  <h1>Performance Budget Report</h1>
  <p>Generated: ${report.timestamp}</p>
  <p>Build time: ${report.buildTime}ms</p>

  <h2>Budget Violations</h2>
  <table>
    <tr><th>Category</th><th>Actual</th><th>Budget</th><th>Excess</th></tr>
    ${violations || '<tr><td colspan="4">No violations</td></tr>'}
  </table>

  <h2>Asset Sizes</h2>
  <table>
    <tr><th>File</th><th>Type</th><th>Category</th><th>Size</th></tr>
    ${assets}
  </table>
</body>
</html>
  `
}

/**
 * Merge options with defaults
 */
function mergeOptions(defaults: Required<PerformanceBudgetOptions>, options: PerformanceBudgetOptions): Required<PerformanceBudgetOptions> {
  const css = options.css || {}
  const js = options.js || {}
  const assets = options.assets || {}
  const behavior = options.behavior || {}

  return {
    css: {
      critical: css.critical ?? defaults.css.critical,
      template: css.template ?? defaults.css.template,
      total: css.total ?? defaults.css.total,
    },
    js: {
      main: js.main ?? defaults.js.main,
      chunk: js.chunk ?? defaults.js.chunk,
      total: js.total ?? defaults.js.total,
    },
    assets: {
      individual: assets.individual ?? defaults.assets.individual,
      total: assets.total ?? defaults.assets.total,
    },
    behavior: {
      failOnExceeded: behavior.failOnExceeded ?? defaults.behavior.failOnExceeded,
      warn: behavior.warn ?? defaults.behavior.warn,
      report: behavior.report ?? defaults.behavior.report,
      reportDir: behavior.reportDir ?? defaults.behavior.reportDir,
    },
  }
}