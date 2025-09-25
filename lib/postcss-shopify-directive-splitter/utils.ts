/**
 * Utility functions for PostCSS Shopify Directive Splitter
 *
 * Provides content hashing, file path generation, and CSS minification utilities
 */

import { createHash } from 'crypto'
import path from 'path'

/**
 * Generate content hash for cache busting
 */
export function generateContentHash(content: string, length: number = 8): string {
  return createHash('md5')
    .update(content)
    .digest('hex')
    .substring(0, length)
}

/**
 * Generate file path for CSS split files
 */
export function generateSplitFilePath(
  themeRoot: string,
  entrypointsDir: string,
  template: string
): string {
  return path.join(themeRoot, entrypointsDir, 'splits', `${template}.css`)
}

/**
 * Generate file path for critical CSS files
 */
export function generateCriticalFilePath(
  themeRoot: string,
  entrypointsDir: string,
  template?: string
): string {
  const fileName = template && template !== 'global'
    ? `critical-${template}.css`
    : 'critical-global.css'

  return path.join(themeRoot, entrypointsDir, 'splits', fileName)
}

/**
 * Generate file path for Liquid snippets
 */
export function generateSnippetFilePath(
  themeRoot: string,
  target: string
): string {
  return path.join(themeRoot, 'snippets', `inline-${target}-css.liquid`)
}

/**
 * Minify CSS content
 */
export function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
    .replace(/\s*{\s*/g, '{') // Remove spaces around braces
    .replace(/}\s*/g, '}') // Remove spaces after closing braces
    .replace(/:\s*/g, ':') // Remove spaces after colons
    .replace(/;\s*/g, ';') // Remove spaces after semicolons
    .trim()
}

/**
 * Format byte size for display
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i]
}

/**
 * Normalize file paths for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

/**
 * Ensure path is absolute
 */
export function ensureAbsolutePath(filePath: string, basePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(basePath, filePath)
}

/**
 * Calculate CSS selector specificity (approximate)
 */
export function calculateSpecificity(selector: string): number {
  let specificity = 0

  // Count IDs
  specificity += (selector.match(/#[a-zA-Z][\w-]*/g) || []).length * 100

  // Count classes, attributes, pseudo-classes
  specificity += (selector.match(/\.[a-zA-Z][\w-]*|\[[^\]]+\]|:[a-zA-Z][\w-]*/g) || []).length * 10

  // Count elements and pseudo-elements
  specificity += (selector.match(/[a-zA-Z][\w-]*|::[a-zA-Z][\w-]*/g) || []).length

  return specificity
}

/**
 * Extract media queries from CSS content
 */
export function extractMediaQueries(css: string): string[] {
  const mediaQueryRegex = /@media[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
  return css.match(mediaQueryRegex) || []
}

/**
 * Remove media queries from CSS content
 */
export function removeMediaQueries(css: string): string {
  const mediaQueryRegex = /@media[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
  return css.replace(mediaQueryRegex, '').trim()
}

/**
 * Validate CSS syntax (basic check)
 */
export function isValidCSS(css: string): boolean {
  const openBraces = (css.match(/\{/g) || []).length
  const closeBraces = (css.match(/\}/g) || []).length

  return openBraces === closeBraces
}

/**
 * Generate cache manifest entry
 */
export function generateManifestEntry(
  template: string,
  filePath: string,
  hash: string,
  size: number
): Record<string, any> {
  return {
    template,
    path: normalizePath(filePath),
    hash,
    size,
    timestamp: Date.now()
  }
}