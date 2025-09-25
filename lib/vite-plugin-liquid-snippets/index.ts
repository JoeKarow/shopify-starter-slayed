/**
 * Vite Liquid Snippets Plugin
 *
 * A Vite plugin that generates Liquid snippets for loading split CSS files
 * created by the PostCSS directive splitter. This plugin automatically creates
 * Shopify Liquid templates that conditionally load CSS based on template context.
 */

import type { Plugin, ResolvedConfig } from 'vite'
import type { OutputBundle, OutputAsset, OutputChunk } from 'rollup'
import path from 'path'
import { promises as fs } from 'fs'

export interface LiquidSnippetsOptions {
  /** Directory where snippets will be generated (default: 'snippets') */
  snippetsDir?: string
  /** Directory containing split CSS files (default: 'frontend/entrypoints/splits') */
  splitsDir?: string
  /** Theme root directory (default: './') */
  themeRoot?: string
  /** Enable preload links for critical CSS (default: true) */
  enablePreload?: boolean
  /** Enable prefetch links for template CSS (default: true) */
  enablePrefetch?: boolean
  /** Generate conditional loading snippets (default: true) */
  conditionalLoading?: boolean
  /** CDN domain for assets (optional) */
  cdnDomain?: string
}

interface SplitFile {
  name: string
  template: string
  size: number
  hash: string
  isTemplate: boolean
  isCritical: boolean
  isInline: boolean
}

const DEFAULT_OPTIONS: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string } = {
  snippetsDir: 'snippets',
  splitsDir: 'frontend/entrypoints/splits',
  themeRoot: './',
  enablePreload: true,
  enablePrefetch: true,
  conditionalLoading: true,
  cdnDomain: undefined,
}

/**
 * Vite Liquid Snippets Plugin
 */
export default function liquidSnippetsPlugin(
  options: LiquidSnippetsOptions = {}
): Plugin {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-liquid-snippets',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    async generateBundle(_outputOptions, bundle) {
      if (config.command !== 'build') return

      try {
        // Analyze split CSS files from the bundle
        const splitFiles = await analyzeSplitFiles(bundle, opts)

        if (splitFiles.length === 0) {
          console.log('ℹ️ No split CSS files found, skipping Liquid snippet generation')
          return
        }

        // Generate Liquid snippets
        await generateLiquidSnippets(splitFiles, opts)

        console.log(`✅ Generated Liquid snippets for ${splitFiles.length} split CSS files`)
      } catch (error) {
        console.error('❌ Error generating Liquid snippets:', error)
        throw error
      }
    },
  }
}

/**
 * Analyze split CSS files from the Rollup bundle
 */
async function analyzeSplitFiles(bundle: OutputBundle, _options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string }): Promise<SplitFile[]> {
  const splitFiles: SplitFile[] = []

  for (const [fileName, output] of Object.entries(bundle)) {
    if (!fileName.endsWith('.css')) continue

    let size = 0
    if (output.type === 'asset') {
      const asset = output as OutputAsset
      size = typeof asset.source === 'string' ? asset.source.length : asset.source.length
    } else if (output.type === 'chunk') {
      const chunk = output as OutputChunk
      size = chunk.code.length
    }

    const baseName = path.basename(fileName, '.css')
    const match = baseName.match(/^(.+?)(?:\.([a-f0-9]+))?$/)

    if (!match) continue

    const [, name, hash = ''] = match
    const isCritical = name.includes('critical')
    const isInline = name.includes('inline')
    const isTemplate = !isCritical && !isInline && name !== 'theme'

    // Extract template name for split files
    let template = name
    if (isTemplate && name.includes('-')) {
      // Handle cases like 'product-gallery' -> 'product'
      const templateMatch = name.match(/^(product|collection|cart|checkout|index|blog|article|page|search|404|password|gift_card|customers)/)
      template = templateMatch ? templateMatch[1] : name
    }

    splitFiles.push({
      name: fileName,
      template,
      size,
      hash,
      isTemplate,
      isCritical,
      isInline,
    })
  }

  return splitFiles
}

/**
 * Generate Liquid snippets for split CSS files
 */
async function generateLiquidSnippets(
  splitFiles: SplitFile[],
  options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string }
): Promise<void> {
  const snippetsPath = path.resolve(options.themeRoot, options.snippetsDir)
  await fs.mkdir(snippetsPath, { recursive: true })

  // Generate main CSS loader snippet
  await generateMainCSSLoader(splitFiles, options, snippetsPath)

  // Generate template-specific loaders
  const templates = [...new Set(splitFiles.filter(f => f.isTemplate).map(f => f.template))]
  for (const template of templates) {
    await generateTemplateLoader(template, splitFiles, options, snippetsPath)
  }

  // Generate critical CSS loader
  const criticalFiles = splitFiles.filter(f => f.isCritical)
  if (criticalFiles.length > 0) {
    await generateCriticalCSSLoader(criticalFiles, options, snippetsPath)
  }

  // Generate inline CSS loader
  const inlineFiles = splitFiles.filter(f => f.isInline)
  if (inlineFiles.length > 0) {
    await generateInlineCSSLoader(inlineFiles, options, snippetsPath)
  }
}

/**
 * Generate main CSS loader snippet
 */
async function generateMainCSSLoader(
  splitFiles: SplitFile[],
  _options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string },
  snippetsPath: string
): Promise<void> {
  const mainFiles = splitFiles.filter(f => !f.isCritical && !f.isInline && !f.isTemplate)

  if (mainFiles.length === 0) return

  const snippet = `{%- comment -%}
  Main CSS Loader - Generated by vite-plugin-liquid-snippets

  Loads main theme CSS files with performance optimizations:
  - Preload for critical resources
  - Async loading for non-critical CSS
  - CDN optimization when configured
{%- endcomment -%}

{%- for file in files -%}
  {%- assign file_url = file | asset_url -%}
  {%- if settings.enable_css_preload and forloop.first -%}
    <link rel="preload" href="{{ file_url }}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="{{ file_url }}"></noscript>
  {%- else -%}
    <link rel="stylesheet" href="{{ file_url }}" media="print" onload="this.media='all'; this.onload=null;">
    <noscript><link rel="stylesheet" href="{{ file_url }}"></noscript>
  {%- endif -%}
{%- endfor -%}

{%- comment -%}
  Usage in theme.liquid:
  {% assign main_css_files = 'theme.min.css' | split: ',' %}
  {% render 'css-main', files: main_css_files %}
{%- endcomment -%}`

  await fs.writeFile(path.join(snippetsPath, 'css-main.liquid'), snippet)
}

/**
 * Generate template-specific CSS loader
 */
async function generateTemplateLoader(
  template: string,
  splitFiles: SplitFile[],
  _options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string },
  snippetsPath: string
): Promise<void> {
  const templateFiles = splitFiles.filter(f => f.isTemplate && f.template === template)

  if (templateFiles.length === 0) return

  const snippet = `{%- comment -%}
  Template CSS Loader: ${template}
  Generated by vite-plugin-liquid-snippets

  Conditionally loads CSS specific to the ${template} template.
  Uses prefetch for improved performance on likely next pages.
{%- endcomment -%}

{%- if template == '${template}' -%}
  {%- comment -%} Current template - load immediately {%- endcomment -%}
  {%- for file in files -%}
    {%- assign file_url = file | asset_url -%}
    <link rel="stylesheet" href="{{ file_url }}">
  {%- endfor -%}
{%- else -%}
  {%- comment -%} Other templates - prefetch for performance {%- endcomment -%}
  {%- if settings.enable_css_prefetch -%}
    {%- for file in files -%}
      {%- assign file_url = file | asset_url -%}
      <link rel="prefetch" href="{{ file_url }}" as="style">
    {%- endfor -%}
  {%- endif -%}
{%- endif -%}

{%- comment -%}
  Usage in templates/${template}.liquid:
  {% assign ${template}_css_files = '${templateFiles[0]?.name || `${template}.min.css`}' | split: ',' %}
  {% render 'css-${template}', files: ${template}_css_files %}
{%- endcomment -%}`

  await fs.writeFile(path.join(snippetsPath, `css-${template}.liquid`), snippet)
}

/**
 * Generate critical CSS loader
 */
async function generateCriticalCSSLoader(
  _criticalFiles: SplitFile[],
  _options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string },
  snippetsPath: string
): Promise<void> {
  const snippet = `{%- comment -%}
  Critical CSS Loader - Generated by vite-plugin-liquid-snippets

  Loads critical above-the-fold CSS immediately in document head.
  This CSS should be under 14KB for optimal performance.
{%- endcomment -%}

{%- for file in files -%}
  {%- assign file_url = file | asset_url -%}
  <link rel="stylesheet" href="{{ file_url }}" media="all">
{%- endfor -%}

{%- comment -%}
  Usage in theme.liquid <head>:
  {% assign critical_css_files = 'critical.min.css' | split: ',' %}
  {% render 'css-critical', files: critical_css_files %}
{%- endcomment -%}`

  await fs.writeFile(path.join(snippetsPath, 'css-critical.liquid'), snippet)
}

/**
 * Generate inline CSS loader
 */
async function generateInlineCSSLoader(
  _inlineFiles: SplitFile[],
  _options: Required<Omit<LiquidSnippetsOptions, 'cdnDomain'>> & { cdnDomain?: string },
  snippetsPath: string
): Promise<void> {
  const snippet = `{%- comment -%}
  Inline CSS Loader - Generated by vite-plugin-liquid-snippets

  Loads component-specific CSS that should be inlined.
  These files are typically very small (< 5KB) and component-scoped.
{%- endcomment -%}

{%- for file in files -%}
  {%- assign file_url = file | asset_url -%}
  <link rel="stylesheet" href="{{ file_url }}" media="all">
{%- endfor -%}

{%- comment -%}
  Usage in component sections:
  {% assign inline_css_files = 'component-inline.min.css' | split: ',' %}
  {% render 'css-inline', files: inline_css_files %}
{%- endcomment -%}`

  await fs.writeFile(path.join(snippetsPath, 'css-inline.liquid'), snippet)
}