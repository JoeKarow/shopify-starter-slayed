/**
 * CSS File and Liquid Snippet Generator
 *
 * Generates template-specific CSS files and Liquid snippets from processed directives
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { ProcessedDirective, GeneratedFile, DirectiveSplitterOptions } from '../../specs/001-shopify-template-codesplitting/contracts/postcss-plugin'
import { generateContentHash, generateSplitFilePath, generateCriticalFilePath, generateSnippetFilePath, minifyCSS } from './utils'

/**
 * Generate files from processed directives
 */
export function generateFiles(
  directives: ProcessedDirective[],
  options: DirectiveSplitterOptions
): GeneratedFile[] {
  const files: GeneratedFile[] = []

  // Group directives by type and target
  const groupedDirectives = groupDirectivesByTypeAndTarget(directives)

  // Generate CSS split files
  for (const [template, splitDirectives] of groupedDirectives.split) {
    const file = generateSplitFile(template, splitDirectives, options)
    if (file) {
      files.push(file)
    }
  }

  // Generate critical CSS files
  for (const [target, criticalDirectives] of groupedDirectives.critical) {
    const file = generateCriticalFile(target, criticalDirectives, options)
    if (file) {
      files.push(file)
    }
  }

  // Generate inline CSS liquid snippets
  for (const [target, inlineDirectives] of groupedDirectives.inline) {
    const file = generateInlineSnippet(target, inlineDirectives, options)
    if (file) {
      files.push(file)
    }
  }

  // Generate responsive CSS files (treated similar to splits)
  for (const [target, responsiveDirectives] of groupedDirectives.responsive) {
    const file = generateResponsiveFile(target, responsiveDirectives, options)
    if (file) {
      files.push(file)
    }
  }

  return files
}

/**
 * Group directives by type and target
 */
function groupDirectivesByTypeAndTarget(directives: ProcessedDirective[]) {
  const grouped = {
    split: new Map<string, ProcessedDirective[]>(),
    critical: new Map<string, ProcessedDirective[]>(),
    inline: new Map<string, ProcessedDirective[]>(),
    responsive: new Map<string, ProcessedDirective[]>()
  }

  for (const directive of directives) {
    const target = directive.target || 'global'
    const map = grouped[directive.type]

    if (!map.has(target)) {
      map.set(target, [])
    }
    map.get(target)!.push(directive)
  }

  return grouped
}

/**
 * Generate CSS split file for template-specific styles
 */
function generateSplitFile(
  template: string,
  directives: ProcessedDirective[],
  options: DirectiveSplitterOptions
): GeneratedFile | null {
  if (directives.length === 0) return null

  // Combine all CSS content for this template
  const cssContent = directives.map(d => d.content).join('\n\n')

  if (!cssContent.trim()) return null

  // Apply minification if enabled
  const processedContent = options.minify ? minifyCSS(cssContent) : cssContent

  const filePath = generateSplitFilePath(options.themeRoot, options.entrypointsDir, template)
  const size = Buffer.byteLength(processedContent, 'utf8')
  const hash = generateContentHash(processedContent)

  return {
    path: filePath,
    content: processedContent,
    type: 'css-split',
    template,
    size,
    hash
  }
}

/**
 * Generate critical CSS file
 */
function generateCriticalFile(
  target: string,
  directives: ProcessedDirective[],
  options: DirectiveSplitterOptions
): GeneratedFile | null {
  if (directives.length === 0) return null

  // Combine all critical CSS content
  const cssContent = directives.map(d => d.content).join('\n\n')

  if (!cssContent.trim()) return null

  // Apply minification if enabled
  const processedContent = options.minify ? minifyCSS(cssContent) : cssContent

  const filePath = generateCriticalFilePath(options.themeRoot, options.entrypointsDir, target)
  const size = Buffer.byteLength(processedContent, 'utf8')
  const hash = generateContentHash(processedContent)

  return {
    path: filePath,
    content: processedContent,
    type: 'critical-css',
    template: target,
    size,
    hash
  }
}

/**
 * Generate inline CSS Liquid snippet
 */
function generateInlineSnippet(
  target: string,
  directives: ProcessedDirective[],
  options: DirectiveSplitterOptions
): GeneratedFile | null {
  if (directives.length === 0) return null

  // Combine all inline CSS content
  const cssContent = directives.map(d => d.content).join('\n\n')

  if (!cssContent.trim()) return null

  // Apply minification if enabled
  const processedCSS = options.minify ? minifyCSS(cssContent) : cssContent

  // Check if any directive has lazy loading
  const hasLazy = directives.some(d => d.options?.lazy)
  const isScoped = directives.some(d => d.options?.scoped)

  // Generate Liquid snippet content
  const liquidContent = createLiquidSnippet(target, processedCSS, {
    lazy: hasLazy,
    scoped: isScoped,
    generateViteTags: options.generateViteTags
  })

  const filePath = generateSnippetFilePath(options.themeRoot, target)
  const size = Buffer.byteLength(liquidContent, 'utf8')
  const hash = generateContentHash(liquidContent)

  return {
    path: filePath,
    content: liquidContent,
    type: 'liquid-snippet',
    template: undefined, // Snippets are not template-specific
    size,
    hash
  }
}

/**
 * Generate responsive CSS file
 */
function generateResponsiveFile(
  target: string,
  directives: ProcessedDirective[],
  options: DirectiveSplitterOptions
): GeneratedFile | null {
  if (directives.length === 0) return null

  // Combine all responsive CSS content
  const cssContent = directives.map(d => d.content).join('\n\n')

  if (!cssContent.trim()) return null

  // Apply minification if enabled
  const processedContent = options.minify ? minifyCSS(cssContent) : cssContent

  // Use similar path structure to splits but with responsive prefix
  const fileName = `responsive-${target}-css.liquid`
  const filePath = path.join(options.themeRoot, options.entrypointsDir, 'splits', fileName)
  const size = Buffer.byteLength(processedContent, 'utf8')
  const hash = generateContentHash(processedContent)

  return {
    path: filePath,
    content: processedContent,
    type: 'css-split', // Treat responsive as split for now
    template: target,
    size,
    hash
  }
}

/**
 * Create Liquid snippet for inline CSS
 */
export function createLiquidSnippet(
  target: string,
  css: string,
  options: {
    lazy?: boolean
    scoped?: boolean
    generateViteTags?: boolean
  } = {}
): string {
  const lines: string[] = []

  lines.push(`{%- comment -%}`)
  lines.push(`  Inline CSS for ${target}`)
  lines.push(`  Generated by postcss-shopify-directive-splitter`)
  lines.push(`  Hash: ${generateContentHash(css)}`)
  lines.push(`{%- endcomment -%}`)
  lines.push('')

  if (options.lazy) {
    // Lazy loading implementation
    lines.push(`{%- unless ${target}_css_loaded -%}`)
    lines.push(`  {%- assign ${target}_css_loaded = true -%}`)
    lines.push(`  <style data-target="${target}" loading="lazy">`)
  } else {
    // Immediate loading
    lines.push(`<style data-target="${target}">`)
  }

  if (options.scoped) {
    // Scope CSS to specific container
    lines.push(`  /* Scoped styles for ${target} */`)
    const scopedCSS = scopeCSSToTarget(css, target)
    lines.push(`  ${scopedCSS}`)
  } else {
    lines.push(`  ${css}`)
  }

  lines.push(`</style>`)

  if (options.lazy) {
    lines.push(`{%- endunless -%}`)
  }

  if (options.generateViteTags) {
    lines.push('')
    lines.push(`{%- comment -%} Vite HMR support {%- endcomment -%}`)
    lines.push(`{%- if settings.vite_dev_mode -%}`)
    lines.push(`  <!-- vite-hmr:${target} -->`)
    lines.push(`{%- endif -%}`)
  }

  return lines.join('\n')
}

/**
 * Scope CSS selectors to a specific target
 */
function scopeCSSToTarget(css: string, target: string): string {
  // Simple scoping - prefix selectors with target class
  return css.replace(
    /([^{}]+)\s*{/g,
    (match, selector) => {
      const trimmedSelector = selector.trim()

      // Don't scope media queries, keyframes, or other at-rules
      if (trimmedSelector.startsWith('@')) {
        return match
      }

      // Don't scope if already scoped
      if (trimmedSelector.includes(`.${target}`)) {
        return match
      }

      // Add scoping
      return `.${target} ${trimmedSelector} {`
    }
  )
}

/**
 * Ensure output directory exists
 */
export async function ensureOutputDirectory(outputDir: string): Promise<void> {
  try {
    await fs.access(outputDir)
  } catch {
    await fs.mkdir(outputDir, { recursive: true })
  }
}

/**
 * Write files to disk
 */
export async function writeGeneratedFiles(files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    // Ensure directory exists
    const dir = path.dirname(file.path)
    await ensureOutputDirectory(dir)

    // Write file
    await fs.writeFile(file.path, file.content, 'utf8')
  }
}

/**
 * Generate manifest of all generated files
 */
export function generateManifest(files: GeneratedFile[]): Record<string, string> {
  const manifest: Record<string, string> = {}

  for (const file of files) {
    const relativePath = file.path.split('/').slice(-3).join('/')
    const key = file.template ? `${file.template}-${file.type}` : file.type
    manifest[key] = relativePath
  }

  return manifest
}