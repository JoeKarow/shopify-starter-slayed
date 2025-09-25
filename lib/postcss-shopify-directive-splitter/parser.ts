/**
 * CSS Directive Parser
 *
 * Parses CSS directives like @split, @critical, @inline from PostCSS AST
 */

import { Root, AtRule, Node } from 'postcss'
import type { ProcessedDirective, DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'

export interface DirectiveNode {
  type: 'split' | 'critical' | 'inline' | 'responsive'
  name: string
  params?: string[]
  rules: string[]
  startLine?: number
  endLine?: number
}

export interface SplitResult {
  template: string
  css: string
  size: number
  critical?: boolean
  inline?: boolean
}

/**
 * Process a single directive AtRule into ProcessedDirective format
 */
export function processDirective(atRule: AtRule, options: DirectiveSplitterOptions): ProcessedDirective | null {
  const type = atRule.name as ProcessedDirective['type']

  // Only process known directive types
  if (!['split', 'critical', 'inline', 'responsive'].includes(type)) {
    return null
  }

  const params = atRule.params.trim().split(/\s+/).filter(Boolean)

  // Extract CSS content from the directive
  const content = extractDirectiveContent(atRule)
  if (!content || content.trim().length === 0) {
    return null
  }

  const sourceFile = atRule.source?.input?.from || 'unknown'
  const lineNumber = atRule.source?.start?.line || 0

  // Parse based on directive type
  switch (type) {
    case 'split':
      return processSplitDirective(params, content, sourceFile, lineNumber, options)
    case 'critical':
      return processCriticalDirective(params, content, sourceFile, lineNumber)
    case 'inline':
      return processInlineDirective(params, content, sourceFile, lineNumber)
    case 'responsive':
      return processResponsiveDirective(params, content, sourceFile, lineNumber)
    default:
      return null
  }
}

/**
 * Process @split directive
 */
function processSplitDirective(
  params: string[],
  content: string,
  sourceFile: string,
  lineNumber: number,
  options: DirectiveSplitterOptions
): ProcessedDirective | null {
  if (params.length === 0) {
    return null // @split requires template name
  }

  const target = params[0]

  // Handle comma-separated templates
  if (target.includes(',')) {
    const templates = target.split(',').map(t => t.trim())
    // For comma-separated, validate each template individually
    for (const template of templates) {
      if (template && !options.validSplits.includes(template)) {
        return null // Invalid split target
      }
    }
  } else {
    // Single template validation
    if (!options.validSplits.includes(target)) {
      return null // Invalid split target
    }
  }

  return {
    type: 'split',
    target,
    content,
    sourceFile,
    lineNumber,
    options: {}
  }
}

/**
 * Process @critical directive
 */
function processCriticalDirective(
  params: string[],
  content: string,
  sourceFile: string,
  lineNumber: number
): ProcessedDirective {
  const target = params.length > 0 ? params[0] : 'global'

  return {
    type: 'critical',
    target,
    content,
    sourceFile,
    lineNumber,
    options: {}
  }
}

/**
 * Process @inline directive
 */
function processInlineDirective(
  params: string[],
  content: string,
  sourceFile: string,
  lineNumber: number
): ProcessedDirective {
  if (params.length === 0) {
    // Default target for inline
    return {
      type: 'inline',
      target: 'global',
      content,
      sourceFile,
      lineNumber,
      options: {}
    }
  }

  const target = params[0]
  const options: ProcessedDirective['options'] = {}

  // Parse options from remaining params
  for (let i = 1; i < params.length; i++) {
    const param = params[i]
    if (param === 'lazy') {
      options.lazy = true
    } else if (param === 'scoped') {
      options.scoped = true
    } else if (param.startsWith('priority:')) {
      options.priority = param.split(':')[1] as any
    }
  }

  return {
    type: 'inline',
    target,
    content,
    sourceFile,
    lineNumber,
    options
  }
}

/**
 * Process @responsive directive
 */
function processResponsiveDirective(
  params: string[],
  content: string,
  sourceFile: string,
  lineNumber: number
): ProcessedDirective {
  const target = params.length > 0 ? params[0] : 'global'

  return {
    type: 'responsive',
    target,
    content,
    sourceFile,
    lineNumber,
    options: {}
  }
}

/**
 * Extract CSS content from directive AtRule
 */
function extractDirectiveContent(atRule: AtRule): string {
  const content: string[] = []

  // Walk through all child nodes and collect their string representation
  atRule.each(node => {
    content.push(node.toString())
  })

  return content.join('\n')
}

/**
 * Parse directives from PostCSS root node (legacy compatibility)
 */
export function parseDirectives(root: Root): DirectiveNode[] {
  const directives: DirectiveNode[] = []

  root.walkAtRules(rule => {
    if (['split', 'critical', 'inline', 'responsive'].includes(rule.name)) {
      const directive = parseDirective(rule)
      if (directive) {
        directives.push(directive)
        // Remove the directive from the AST after parsing
        rule.remove()
      }
    }
  })

  return directives
}

/**
 * Parse individual directive AtRule (legacy compatibility)
 */
function parseDirective(rule: AtRule): DirectiveNode | null {
  const type = rule.name as DirectiveNode['type']
  const params = rule.params.trim().split(/\s+/).filter(Boolean)

  if (type === 'split' && params.length === 0) {
    throw new Error(`@split directive requires template name: @split product`)
  }

  const rules: string[] = []
  const startLine = rule.source?.start?.line
  const endLine = rule.source?.end?.line

  // Collect CSS rules within the directive
  rule.walkRules(childRule => {
    rules.push(childRule.toString())
  })

  // Also collect nested at-rules (media queries, etc.)
  rule.walkAtRules(childAtRule => {
    rules.push(childAtRule.toString())
  })

  return {
    type,
    name: type === 'split' ? params[0] : type,
    params: params.slice(type === 'split' ? 1 : 0), // Additional params after template name
    rules,
    startLine,
    endLine,
  }
}

/**
 * Validate directive syntax
 */
export function validateDirective(directive: DirectiveNode): boolean {
  switch (directive.type) {
    case 'split':
      return directive.name !== undefined && directive.name.length > 0
    case 'critical':
      return directive.rules.length > 0
    case 'inline':
      return directive.rules.length > 0 && directive.params !== undefined
    case 'responsive':
      return directive.rules.length > 0
    default:
      return false
  }
}

/**
 * Extract template names from split directives
 */
export function extractTemplateNames(directives: DirectiveNode[]): string[] {
  return directives
    .filter(d => d.type === 'split')
    .map(d => d.name)
    .filter((name, index, arr) => arr.indexOf(name) === index) // unique
}

/**
 * Group directives by template
 */
export function groupDirectivesByTemplate(directives: DirectiveNode[]): Map<string, DirectiveNode[]> {
  const grouped = new Map<string, DirectiveNode[]>()

  for (const directive of directives) {
    const key = directive.type === 'split' ? directive.name : 'global'

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }

    grouped.get(key)!.push(directive)
  }

  return grouped
}