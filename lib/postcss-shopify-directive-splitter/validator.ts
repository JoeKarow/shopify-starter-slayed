/**
 * Directive Validation and Conflict Detection
 *
 * Validates directive syntax and detects conflicts between directives
 */

import type { ProcessedDirective } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

export interface ValidationResult {
  type: 'error' | 'warning'
  message: string
  directive?: ProcessedDirective
  line?: number
  column?: number
}

/**
 * Validate an array of processed directives and detect conflicts
 */
export function validateDirectives(directives: ProcessedDirective[]): ValidationResult[] {
  const results: ValidationResult[] = []

  // Validate individual directives
  for (const directive of directives) {
    const validationResults = validateSingleDirective(directive)
    results.push(...validationResults)
  }

  // Check for conflicts between directives
  const conflictResults = detectConflicts(directives)
  results.push(...conflictResults)

  return results
}

/**
 * Validate a single directive
 */
function validateSingleDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  // Validate based on directive type
  switch (directive.type) {
    case 'split':
      results.push(...validateSplitDirective(directive))
      break
    case 'critical':
      results.push(...validateCriticalDirective(directive))
      break
    case 'inline':
      results.push(...validateInlineDirective(directive))
      break
    case 'responsive':
      results.push(...validateResponsiveDirective(directive))
      break
    default:
      results.push({
        type: 'error',
        message: `Unknown directive type: ${directive.type}`,
        directive
      })
  }

  // Common validations
  results.push(...validateCommonDirective(directive))

  return results
}

/**
 * Validate @split directive
 */
function validateSplitDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!directive.target) {
    results.push({
      type: 'error',
      message: '@split directive requires a template name',
      directive
    })
  }

  if (directive.target && directive.target.includes(',')) {
    // Multiple templates - validate each
    const templates = directive.target.split(',').map(t => t.trim())
    for (const template of templates) {
      if (!template) {
        results.push({
          type: 'error',
          message: 'Empty template name in @split directive',
          directive
        })
      }
    }
  }

  return results
}

/**
 * Validate @critical directive
 */
function validateCriticalDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check for potential performance issues
  const contentSize = Buffer.byteLength(directive.content, 'utf8')
  if (contentSize > 5000) { // 5KB threshold for individual critical blocks
    results.push({
      type: 'warning',
      message: `Critical CSS block is large (${Math.round(contentSize / 1024)}KB). Consider splitting into smaller blocks.`,
      directive
    })
  }

  // Check for non-critical patterns in critical CSS
  const nonCriticalPatterns = [
    /animation|@keyframes/i,
    /hover|focus|active/i,
    /print|media.*print/i
  ]

  for (const pattern of nonCriticalPatterns) {
    if (pattern.test(directive.content)) {
      results.push({
        type: 'warning',
        message: `Critical CSS contains potentially non-critical styles (${pattern.source}). Consider moving to regular CSS.`,
        directive
      })
    }
  }

  return results
}

/**
 * Validate @inline directive
 */
function validateInlineDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!directive.target) {
    results.push({
      type: 'error',
      message: '@inline directive requires a target component name',
      directive
    })
  }

  // Validate options
  const options = directive.options || {}

  if (options.priority && !['low', 'normal', 'high'].includes(String(options.priority))) {
    results.push({
      type: 'error',
      message: `Invalid priority value: ${options.priority}. Must be 'low', 'normal', or 'high'.`,
      directive
    })
  }

  // Check for potentially large inline CSS
  const contentSize = Buffer.byteLength(directive.content, 'utf8')
  if (contentSize > 2000) { // 2KB threshold for inline CSS
    results.push({
      type: 'warning',
      message: `Inline CSS is large (${Math.round(contentSize / 1024)}KB). Consider using @split instead.`,
      directive
    })
  }

  return results
}

/**
 * Validate @responsive directive
 */
function validateResponsiveDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check if content actually contains media queries
  if (!directive.content.includes('@media')) {
    results.push({
      type: 'warning',
      message: '@responsive directive should contain media queries',
      directive
    })
  }

  return results
}

/**
 * Common validations for all directive types
 */
function validateCommonDirective(directive: ProcessedDirective): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check for empty content
  if (!directive.content || directive.content.trim().length === 0) {
    results.push({
      type: 'error',
      message: 'Directive has empty content',
      directive
    })
  }

  // Basic CSS syntax validation
  if (directive.content && !isValidCSSSyntax(directive.content)) {
    results.push({
      type: 'error',
      message: 'Invalid CSS syntax in directive content',
      directive
    })
  }

  // Check for potentially dangerous CSS
  const dangerousPatterns = [
    /javascript:/i,
    /expression\(/i,
    /behavior:/i,
    /-moz-binding/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(directive.content)) {
      results.push({
        type: 'error',
        message: `Potentially dangerous CSS pattern detected: ${pattern.source}`,
        directive
      })
    }
  }

  return results
}

/**
 * Detect conflicts between directives
 */
function detectConflicts(directives: ProcessedDirective[]): ValidationResult[] {
  const results: ValidationResult[] = []

  // Group directives by template/target
  const groupedDirectives = new Map<string, ProcessedDirective[]>()

  for (const directive of directives) {
    const key = directive.target || 'global'
    if (!groupedDirectives.has(key)) {
      groupedDirectives.set(key, [])
    }
    groupedDirectives.get(key)!.push(directive)
  }

  // Check for conflicts within each group
  for (const [target, targetDirectives] of groupedDirectives) {
    // Check for @critical and @split conflicts
    const criticalDirectives = targetDirectives.filter(d => d.type === 'critical')
    const splitDirectives = targetDirectives.filter(d => d.type === 'split')

    if (criticalDirectives.length > 0 && splitDirectives.length > 0) {
      results.push({
        type: 'warning',
        message: `Template "${target}" has both @critical and @split directives. Consider if all critical styles are properly prioritized.`,
        directive: criticalDirectives[0]
      })
    }

    // Check for duplicate @critical directives for same template
    if (criticalDirectives.length > 1) {
      results.push({
        type: 'warning',
        message: `Template "${target}" has multiple @critical directives. Consider combining them for better performance.`,
        directive: criticalDirectives[1]
      })
    }

    // Check for conflicting inline directives
    const inlineDirectives = targetDirectives.filter(d => d.type === 'inline')
    const lazyInlines = inlineDirectives.filter(d => d.options?.lazy)
    const nonLazyInlines = inlineDirectives.filter(d => !d.options?.lazy)

    if (lazyInlines.length > 0 && nonLazyInlines.length > 0) {
      results.push({
        type: 'warning',
        message: `Target "${target}" has both lazy and non-lazy @inline directives. This may cause loading conflicts.`,
        directive: lazyInlines[0]
      })
    }
  }

  // Check for CSS selector conflicts
  results.push(...detectSelectorConflicts(directives))

  return results
}

/**
 * Detect CSS selector conflicts between directives
 */
function detectSelectorConflicts(directives: ProcessedDirective[]): ValidationResult[] {
  const results: ValidationResult[] = []
  const selectorMap = new Map<string, ProcessedDirective[]>()

  for (const directive of directives) {
    // Extract CSS selectors from content (basic extraction)
    const selectors = extractCSSSelectors(directive.content)

    for (const selector of selectors) {
      if (!selectorMap.has(selector)) {
        selectorMap.set(selector, [])
      }
      selectorMap.get(selector)!.push(directive)
    }
  }

  // Check for selectors appearing in multiple directives of different types
  for (const [selector, selectorDirectives] of selectorMap) {
    if (selectorDirectives.length > 1) {
      const types = [...new Set(selectorDirectives.map(d => d.type))]
      const targets = [...new Set(selectorDirectives.map(d => d.target))]

      if (types.length > 1) {
        results.push({
          type: 'warning',
          message: `Selector "${selector}" appears in multiple directive types (${types.join(', ')}). This may cause CSS cascade issues.`,
          directive: selectorDirectives[0]
        })
      }

      if (targets.length > 1 && types.includes('split')) {
        results.push({
          type: 'warning',
          message: `Selector "${selector}" appears in multiple templates (${targets.join(', ')}). Consider using shared CSS for common selectors.`,
          directive: selectorDirectives[0]
        })
      }
    }
  }

  return results
}

/**
 * Basic CSS syntax validation
 */
function isValidCSSSyntax(css: string): boolean {
  try {
    // Count braces
    const openBraces = (css.match(/\{/g) || []).length
    const closeBraces = (css.match(/\}/g) || []).length

    if (openBraces !== closeBraces) {
      return false
    }

    // Check for basic CSS structure
    const hasValidDeclarations = /[a-zA-Z-]+\s*:\s*[^;}]+;?/.test(css)
    const hasValidSelectors = /[.#]?[a-zA-Z][\w-]*\s*\{/.test(css) || /@media/.test(css)

    return hasValidDeclarations && hasValidSelectors
  } catch {
    return false
  }
}

/**
 * Extract CSS selectors from content (basic extraction)
 */
function extractCSSSelectors(css: string): string[] {
  const selectors: string[] = []

  // Remove media queries temporarily
  const withoutMedia = css.replace(/@media[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')

  // Match selectors (basic pattern)
  const selectorMatches = withoutMedia.match(/[^{}]+(?=\s*\{)/g) || []

  for (const match of selectorMatches) {
    const cleaned = match.trim().replace(/\s+/g, ' ')
    if (cleaned && !cleaned.startsWith('@')) {
      selectors.push(cleaned)
    }
  }

  return [...new Set(selectors)] // Remove duplicates
}