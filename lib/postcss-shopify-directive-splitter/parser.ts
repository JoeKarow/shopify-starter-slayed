/**
 * CSS Directive Parser
 *
 * Parses CSS directives like @split, @critical, @inline from PostCSS AST
 */

import { Root, AtRule, Node } from 'postcss'

export interface DirectiveNode {
  type: 'split' | 'critical' | 'inline'
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
 * Parse directives from PostCSS root node
 */
export function parseDirectives(root: Root): DirectiveNode[] {
  const directives: DirectiveNode[] = []

  root.walkAtRules(rule => {
    if (['split', 'critical', 'inline'].includes(rule.name)) {
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
 * Parse individual directive AtRule
 */
function parseDirective(rule: AtRule): DirectiveNode | null {
  const type = rule.name as 'split' | 'critical' | 'inline'
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