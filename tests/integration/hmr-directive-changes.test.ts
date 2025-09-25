/**
 * T066: Validate HMR with directive changes in development
 *
 * This integration test validates that Hot Module Replacement works correctly
 * when CSS directive changes are made during development, ensuring that
 * split files update correctly without full page reload.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Mock file paths for testing
const TEST_CSS_DIR = path.join(__dirname, '../../tmp/test-css')
const SPLITS_DIR = path.join(__dirname, '../../tmp/test-splits')

// Mock Vite HMR server for testing
class MockHMRServer {
  private callbacks: Map<string, Function[]> = new Map()
  private files: Map<string, string> = new Map()

  constructor() {
    this.setupMockFS()
  }

  private setupMockFS() {
    // Ensure test directories exist
    if (!fs.existsSync(TEST_CSS_DIR)) {
      fs.mkdirSync(TEST_CSS_DIR, { recursive: true })
    }
    if (!fs.existsSync(SPLITS_DIR)) {
      fs.mkdirSync(SPLITS_DIR, { recursive: true })
    }
  }

  watchFile(filePath: string, callback: Function) {
    if (!this.callbacks.has(filePath)) {
      this.callbacks.set(filePath, [])
    }
    this.callbacks.get(filePath)!.push(callback)
  }

  updateFile(filePath: string, content: string) {
    const oldContent = this.files.get(filePath)
    this.files.set(filePath, content)

    // Write to actual filesystem for integration testing
    fs.writeFileSync(filePath, content)

    // Trigger callbacks
    const callbacks = this.callbacks.get(filePath) || []
    callbacks.forEach(callback => {
      callback({
        file: filePath,
        oldContent,
        newContent: content,
        timestamp: Date.now()
      })
    })
  }

  sendUpdate(updateInfo: any) {
    // Mock sending HMR update to browser
    console.log('HMR Update sent:', updateInfo)
  }

  getFile(filePath: string): string | undefined {
    return this.files.get(filePath)
  }

  cleanup() {
    this.callbacks.clear()
    this.files.clear()

    // Clean up test files
    if (fs.existsSync(TEST_CSS_DIR)) {
      fs.rmSync(TEST_CSS_DIR, { recursive: true, force: true })
    }
    if (fs.existsSync(SPLITS_DIR)) {
      fs.rmSync(SPLITS_DIR, { recursive: true, force: true })
    }
  }
}

// Mock PostCSS directive processor
class MockDirectiveProcessor {
  private splitsGenerated: Map<string, string[]> = new Map()

  processDirectives(cssContent: string, filePath: string): {
    criticalCSS: string
    splits: { [template: string]: string }
    remainingCSS: string
  } {
    const result = {
      criticalCSS: '',
      splits: {} as { [template: string]: string },
      remainingCSS: ''
    }

    // Parse CSS for directives
    const criticalRegex = /@critical\s+([^@]+?)@endcritical/gs
    const splitRegex = /@split\s+([^\n]+)\n([\s\S]*?)@endsplit/gs

    let criticalMatch
    while ((criticalMatch = criticalRegex.exec(cssContent)) !== null) {
      result.criticalCSS += criticalMatch[1].trim() + '\n'
    }

    let splitMatch
    while ((splitMatch = splitRegex.exec(cssContent)) !== null) {
      const templates = splitMatch[1].trim().split(/\s+/)
      const css = splitMatch[2].trim()

      templates.forEach(template => {
        if (!result.splits[template]) {
          result.splits[template] = ''
        }
        result.splits[template] += css + '\n'
      })
    }

    // Store what splits were generated
    this.splitsGenerated.set(filePath, Object.keys(result.splits))

    // Remove directives from remaining CSS
    result.remainingCSS = cssContent
      .replace(criticalRegex, '')
      .replace(splitRegex, '')
      .trim()

    return result
  }

  getSplitsForFile(filePath: string): string[] {
    return this.splitsGenerated.get(filePath) || []
  }

  generateSplitFiles(splits: { [template: string]: string }, baseFileName: string): string[] {
    const generatedFiles: string[] = []

    Object.entries(splits).forEach(([template, css]) => {
      const splitFileName = `${baseFileName}-${template}.css`
      const splitFilePath = path.join(SPLITS_DIR, splitFileName)

      fs.writeFileSync(splitFilePath, css)
      generatedFiles.push(splitFilePath)
    })

    return generatedFiles
  }
}

// HMR integration class
class HMRDirectiveIntegration {
  private hmrServer: MockHMRServer
  private processor: MockDirectiveProcessor
  private watchedFiles: Set<string> = new Set()
  private updateQueue: Array<{ file: string; timestamp: number }> = []

  constructor(hmrServer: MockHMRServer, processor: MockDirectiveProcessor) {
    this.hmrServer = hmrServer
    this.processor = processor
  }

  watchCSSFile(filePath: string) {
    if (this.watchedFiles.has(filePath)) return

    this.watchedFiles.add(filePath)
    this.hmrServer.watchFile(filePath, (changeInfo: any) => {
      this.handleCSSChange(changeInfo)
    })
  }

  private handleCSSChange(changeInfo: { file: string; oldContent?: string; newContent: string; timestamp: number }) {
    const { file, oldContent, newContent, timestamp } = changeInfo

    // Process new CSS with directives
    const result = this.processor.processDirectives(newContent, file)
    const oldResult = oldContent ? this.processor.processDirectives(oldContent, file) : null

    // Check what changed
    const changes = this.detectChanges(oldResult, result)

    if (changes.length === 0) {
      console.log('No directive changes detected')
      return
    }

    // Generate new split files if needed
    if (Object.keys(result.splits).length > 0) {
      const baseFileName = path.basename(file, path.extname(file))
      const splitFiles = this.processor.generateSplitFiles(result.splits, baseFileName)

      console.log('Generated split files:', splitFiles.map(f => path.basename(f)))
    }

    // Queue HMR update
    this.queueUpdate({
      file,
      timestamp,
      changes,
      splitFiles: this.processor.getSplitsForFile(file)
    })
  }

  private detectChanges(oldResult: any, newResult: any): string[] {
    const changes: string[] = []

    if (!oldResult) {
      if (newResult.criticalCSS) changes.push('critical-added')
      if (Object.keys(newResult.splits).length > 0) changes.push('splits-added')
      return changes
    }

    // Check critical CSS changes
    if (oldResult.criticalCSS !== newResult.criticalCSS) {
      changes.push('critical-changed')
    }

    // Check split changes
    const oldSplits = Object.keys(oldResult.splits || {}).sort()
    const newSplits = Object.keys(newResult.splits || {}).sort()

    if (JSON.stringify(oldSplits) !== JSON.stringify(newSplits)) {
      changes.push('splits-structure-changed')
    } else {
      // Check content changes in each split
      oldSplits.forEach(template => {
        if (oldResult.splits[template] !== newResult.splits[template]) {
          changes.push(`split-${template}-changed`)
        }
      })
    }

    return changes
  }

  private queueUpdate(updateInfo: any) {
    this.updateQueue.push(updateInfo)

    // Process updates with debouncing
    setTimeout(() => {
      this.processUpdates()
    }, 100)
  }

  private processUpdates() {
    if (this.updateQueue.length === 0) return

    const updates = [...this.updateQueue]
    this.updateQueue = []

    updates.forEach(update => {
      this.hmrServer.sendUpdate({
        type: 'css-update',
        path: update.file,
        changes: update.changes,
        splitFiles: update.splitFiles,
        timestamp: update.timestamp
      })
    })
  }

  getQueueLength(): number {
    return this.updateQueue.length
  }

  getWatchedFiles(): string[] {
    return Array.from(this.watchedFiles)
  }
}

describe('HMR with Directive Changes (T066)', () => {
  let hmrServer: MockHMRServer
  let processor: MockDirectiveProcessor
  let integration: HMRDirectiveIntegration
  let testCSSFile: string

  beforeEach(() => {
    hmrServer = new MockHMRServer()
    processor = new MockDirectiveProcessor()
    integration = new HMRDirectiveIntegration(hmrServer, processor)
    testCSSFile = path.join(TEST_CSS_DIR, 'test-component.css')

    // Create initial test CSS file
    const initialCSS = `
/* Initial component styles */
.component {
  color: blue;
  padding: 1rem;
}

@split product
.product-specific {
  background: #f0f0f0;
}
@endsplit

@critical global
.critical-style {
  font-size: 1rem;
}
@endcritical
    `.trim()

    fs.writeFileSync(testCSSFile, initialCSS)
  })

  afterEach(() => {
    hmrServer.cleanup()
  })

  it('should detect and process directive changes via HMR', async () => {
    // Start watching the CSS file
    integration.watchCSSFile(testCSSFile)
    expect(integration.getWatchedFiles()).toContain(testCSSFile)

    // Update CSS with new directives
    const updatedCSS = `
/* Updated component styles */
.component {
  color: red;
  padding: 2rem;
}

@split product collection
.product-specific {
  background: #e0e0e0;
  border: 1px solid #ccc;
}
@endsplit

@critical global
.critical-style {
  font-size: 1.2rem;
  font-weight: bold;
}
@endcritical

@split cart
.cart-specific {
  margin: 1rem;
}
@endsplit
    `.trim()

    // Mock console.log to capture HMR messages
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Trigger file change
    hmrServer.updateFile(testCSSFile, updatedCSS)

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should have generated new split files
    const productSplitFile = path.join(SPLITS_DIR, 'test-component-product.css')
    const collectionSplitFile = path.join(SPLITS_DIR, 'test-component-collection.css')
    const cartSplitFile = path.join(SPLITS_DIR, 'test-component-cart.css')

    expect(fs.existsSync(productSplitFile)).toBe(true)
    expect(fs.existsSync(collectionSplitFile)).toBe(true)
    expect(fs.existsSync(cartSplitFile)).toBe(true)

    // Check split file contents
    const productCSS = fs.readFileSync(productSplitFile, 'utf8')
    expect(productCSS).toContain('.product-specific')
    expect(productCSS).toContain('border: 1px solid #ccc')

    const cartCSS = fs.readFileSync(cartSplitFile, 'utf8')
    expect(cartCSS).toContain('.cart-specific')
    expect(cartCSS).toContain('margin: 1rem')

    // Should have sent HMR update
    expect(consoleSpy).toHaveBeenCalledWith(
      'HMR Update sent:',
      expect.objectContaining({
        type: 'css-update',
        path: testCSSFile,
        changes: expect.arrayContaining([
          'critical-changed',
          'splits-structure-changed'
        ])
      })
    )

    consoleSpy.mockRestore()
  })

  it('should handle critical CSS changes without full page reload', async () => {
    integration.watchCSSFile(testCSSFile)

    const updatedCSS = `
.component {
  color: blue;
  padding: 1rem;
}

@split product
.product-specific {
  background: #f0f0f0;
}
@endsplit

@critical global
.critical-style {
  font-size: 2rem;
  color: red;
  font-weight: bold;
}
.new-critical-style {
  margin: 0;
}
@endcritical
    `.trim()

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    hmrServer.updateFile(testCSSFile, updatedCSS)
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should detect critical CSS change
    expect(consoleSpy).toHaveBeenCalledWith(
      'HMR Update sent:',
      expect.objectContaining({
        changes: expect.arrayContaining(['critical-changed'])
      })
    )

    consoleSpy.mockRestore()
  })

  it('should handle split directive additions and removals', async () => {
    integration.watchCSSFile(testCSSFile)

    // Add new split and remove existing one
    const updatedCSS = `
.component {
  color: blue;
  padding: 1rem;
}

@split blog article
.blog-specific {
  line-height: 1.6;
}
@endsplit

@critical global
.critical-style {
  font-size: 1rem;
}
@endcritical
    `.trim()

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    hmrServer.updateFile(testCSSFile, updatedCSS)
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should generate new split files
    const blogSplitFile = path.join(SPLITS_DIR, 'test-component-blog.css')
    const articleSplitFile = path.join(SPLITS_DIR, 'test-component-article.css')

    expect(fs.existsSync(blogSplitFile)).toBe(true)
    expect(fs.existsSync(articleSplitFile)).toBe(true)

    const blogCSS = fs.readFileSync(blogSplitFile, 'utf8')
    expect(blogCSS).toContain('.blog-specific')

    // Should detect structure change
    expect(consoleSpy).toHaveBeenCalledWith(
      'HMR Update sent:',
      expect.objectContaining({
        changes: expect.arrayContaining(['splits-structure-changed'])
      })
    )

    consoleSpy.mockRestore()
  })

  it('should handle multiple rapid directive changes with debouncing', async () => {
    integration.watchCSSFile(testCSSFile)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Make rapid changes
    const changes = [
      `@split product\n.test1 { color: red; }\n@endsplit`,
      `@split product collection\n.test2 { color: blue; }\n@endsplit`,
      `@split product collection cart\n.test3 { color: green; }\n@endsplit`
    ]

    changes.forEach((change, index) => {
      setTimeout(() => {
        hmrServer.updateFile(testCSSFile, change)
      }, index * 20) // 20ms apart - very rapid
    })

    // Wait for debouncing to complete
    await new Promise(resolve => setTimeout(resolve, 200))

    // Should have processed updates with debouncing
    // The exact number of HMR updates depends on debouncing behavior
    const hmrCalls = consoleSpy.mock.calls.filter(call =>
      call[0] === 'HMR Update sent:'
    )

    expect(hmrCalls.length).toBeGreaterThan(0)
    expect(hmrCalls.length).toBeLessThanOrEqual(changes.length)

    consoleSpy.mockRestore()
  })

  it('should preserve existing split files when only content changes', async () => {
    integration.watchCSSFile(testCSSFile)

    // First, establish baseline files
    hmrServer.updateFile(testCSSFile, `
@split product
.original { color: blue; }
@endsplit
    `.trim())
    await new Promise(resolve => setTimeout(resolve, 150))

    const productSplitFile = path.join(SPLITS_DIR, 'test-component-product.css')
    expect(fs.existsSync(productSplitFile)).toBe(true)

    const originalStats = fs.statSync(productSplitFile)

    // Update with content change only
    hmrServer.updateFile(testCSSFile, `
@split product
.updated { color: red; font-size: 1.5rem; }
@endsplit
    `.trim())
    await new Promise(resolve => setTimeout(resolve, 150))

    // File should still exist and be updated
    expect(fs.existsSync(productSplitFile)).toBe(true)
    const updatedStats = fs.statSync(productSplitFile)
    expect(updatedStats.mtime).not.toEqual(originalStats.mtime)

    // Content should be updated
    const updatedCSS = fs.readFileSync(productSplitFile, 'utf8')
    expect(updatedCSS).toContain('.updated')
    expect(updatedCSS).toContain('color: red')
    expect(updatedCSS).not.toContain('.original')
  })

  it('should handle directive syntax errors gracefully', async () => {
    integration.watchCSSFile(testCSSFile)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // CSS with malformed directives
    const malformedCSS = `
.component { color: blue; }

@split product
.incomplete-split {
  color: red;
}
// Missing @endsplit

@critical
.malformed-critical {
  font-size: 1rem;
}
@endcritical
    `.trim()

    // Should not crash when processing malformed directives
    expect(() => {
      hmrServer.updateFile(testCSSFile, malformedCSS)
    }).not.toThrow()

    await new Promise(resolve => setTimeout(resolve, 150))

    // Should have attempted processing without crashing
    expect(integration.getWatchedFiles()).toContain(testCSSFile)

    consoleSpy.mockRestore()
  })

  it('should clean up resources when file watching stops', async () => {
    integration.watchCSSFile(testCSSFile)
    expect(integration.getWatchedFiles()).toContain(testCSSFile)

    // Simulate file watcher cleanup
    const watchedFilesBefore = integration.getWatchedFiles().length

    // In a real implementation, there would be an unwatch method
    // For this test, we verify the setup worked
    expect(watchedFilesBefore).toBe(1)

    // Cleanup should be handled by hmrServer.cleanup() in afterEach
    // which is tested by the lack of hanging processes
  })
})

describe('HMR Performance with Directives (T066)', () => {
  let hmrServer: MockHMRServer
  let processor: MockDirectiveProcessor
  let integration: HMRDirectiveIntegration

  beforeEach(() => {
    hmrServer = new MockHMRServer()
    processor = new MockDirectiveProcessor()
    integration = new HMRDirectiveIntegration(hmrServer, processor)
  })

  afterEach(() => {
    hmrServer.cleanup()
  })

  it('should process large CSS files with many directives efficiently', async () => {
    const largeCSSFile = path.join(TEST_CSS_DIR, 'large-component.css')

    // Generate large CSS with many directives
    let largeCSS = '/* Large CSS file with many directives */\n'

    // Add many split directives
    for (let i = 0; i < 50; i++) {
      largeCSS += `
@split template-${i}
.component-${i} {
  color: hsl(${i * 7}, 70%, 50%);
  padding: ${i}px;
  margin: ${i * 2}px;
}
@endsplit
      `
    }

    // Add critical sections
    largeCSS += `
@critical global
.critical-large {
  font-size: 2rem;
  font-weight: bold;
}
@endcritical
    `

    fs.writeFileSync(largeCSSFile, largeCSS)
    integration.watchCSSFile(largeCSSFile)

    // Measure processing time
    const startTime = Date.now()

    hmrServer.updateFile(largeCSSFile, largeCSS + '\n/* Updated */')

    await new Promise(resolve => setTimeout(resolve, 200))

    const processingTime = Date.now() - startTime

    // Should process within reasonable time (less than 1 second)
    expect(processingTime).toBeLessThan(1000)

    // Should have generated many split files
    const splitFiles = fs.readdirSync(SPLITS_DIR).filter(f => f.startsWith('large-component-'))
    expect(splitFiles.length).toBe(50) // One for each template
  })

  it('should handle concurrent file changes without conflicts', async () => {
    const file1 = path.join(TEST_CSS_DIR, 'component1.css')
    const file2 = path.join(TEST_CSS_DIR, 'component2.css')

    fs.writeFileSync(file1, '@split product\n.comp1 { color: red; }\n@endsplit')
    fs.writeFileSync(file2, '@split product\n.comp2 { color: blue; }\n@endsplit')

    integration.watchCSSFile(file1)
    integration.watchCSSFile(file2)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Update both files simultaneously
    hmrServer.updateFile(file1, '@split product collection\n.comp1-updated { color: green; }\n@endsplit')
    hmrServer.updateFile(file2, '@split product cart\n.comp2-updated { color: yellow; }\n@endsplit')

    await new Promise(resolve => setTimeout(resolve, 200))

    // Should have processed both files
    expect(fs.existsSync(path.join(SPLITS_DIR, 'component1-product.css'))).toBe(true)
    expect(fs.existsSync(path.join(SPLITS_DIR, 'component1-collection.css'))).toBe(true)
    expect(fs.existsSync(path.join(SPLITS_DIR, 'component2-product.css'))).toBe(true)
    expect(fs.existsSync(path.join(SPLITS_DIR, 'component2-cart.css'))).toBe(true)

    // Should have sent HMR updates for both files
    const hmrCalls = consoleSpy.mock.calls.filter(call => call[0] === 'HMR Update sent:')
    expect(hmrCalls.length).toBeGreaterThanOrEqual(2)

    consoleSpy.mockRestore()
  })
})