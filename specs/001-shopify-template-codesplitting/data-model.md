# Data Model: Shopify Template Codesplitting

**Generated**: 2025-09-24 | **Source**: Feature specification entities

## Core Entities

### CSSDirective

Represents a CSS optimization directive parsed from stylesheets.

```typescript
interface CSSDirective {
  type: 'split' | 'critical' | 'inline' | 'responsive'
  target?: string           // Template name or component identifier
  options?: {
    lazy?: boolean          // For @inline directive
    scoped?: boolean        // For @inline directive
    maxSize?: number        // Byte limit for extraction
    priority?: number       // Loading order
  }
  content: string           // CSS content within directive
  sourceFile: string        // Original file path
  lineNumber: number        // Start line in source
  hash: string             // Content hash for caching
}
```

**Validation Rules**:

- type must be one of the defined directive types
- @critical and @split are mutually exclusive (build error if both present)
- target is required for @split directives
- maxSize defaults to 14KB for critical, 30KB for splits
- content must be valid CSS syntax

**State Transitions**:

- parsed → validated → transformed → generated → written

### TypeScriptDecorator

Represents component loading decorators in TypeScript.

```typescript
interface TypeScriptDecorator {
  type: 'Template' | 'LazyLoad' | 'Critical' | 'NetworkAware'
  parameters: {
    templates?: string[]     // For @Template decorator
    rootMargin?: string     // For @LazyLoad decorator
    slowThreshold?: number  // For @NetworkAware (Mbps)
    fallback?: string      // Loading strategy fallback
  }
  targetClass: string      // Class name being decorated
  filePath: string        // TypeScript file path
  metadata?: Record<string, any>  // Additional decorator metadata
}
```

**Validation Rules**:

- @Critical and @LazyLoad are mutually exclusive
- templates array required for @Template decorator
- slowThreshold defaults to 10 Mbps if not specified
- rootMargin defaults to '100vh' for @LazyLoad

**State Transitions**:

- discovered → registered → initialized → loaded → active

### BuildArtifact

Represents generated files from the build process.

```typescript
interface BuildArtifact {
  id: string               // Unique identifier
  type: 'css-split' | 'critical-css' | 'liquid-snippet' | 'js-chunk'
  template?: string        // Associated Shopify template
  fileName: string         // Generated file name
  path: string            // File system path
  size: number            // File size in bytes
  hash: string            // Content hash
  dependencies: string[]   // Other artifact IDs this depends on
  performance: {
    budget: number        // Size budget in bytes
    actual: number        // Actual size
    withinBudget: boolean
  }
}
```

**Validation Rules**:

- size must not exceed performance.budget (fail in production, warn in dev)
- critical-css artifacts must be < 14KB
- template-specific CSS must be < 30KB
- total CSS across all artifacts < 250KB

### PerformanceMetric

Tracks performance measurements and targets.

```typescript
interface PerformanceMetric {
  name: 'LCP' | 'FCP' | 'CLS' | 'FID' | 'TTI' | 'TBT'
  target: number          // Target value
  actual?: number         // Measured value
  unit: 'ms' | 's' | 'score' | 'kb'
  status: 'pending' | 'pass' | 'fail' | 'warning'
  timestamp: Date
  environment: 'development' | 'staging' | 'production'
  device: 'mobile' | 'desktop'
  network?: '3G' | '4G' | 'WiFi'
}
```

**Validation Rules**:

- LCP must be < 2.5s for 'pass' status
- CLS must be < 0.1 for 'pass' status
- FCP must be < 1.8s for 'pass' status
- All metrics required for production deployments

### LoadingStrategy

Defines asset loading behavior based on conditions.

```typescript
interface LoadingStrategy {
  id: string
  trigger: 'immediate' | 'viewport' | 'interaction' | 'idle'
  condition: {
    template?: string[]      // Template names
    viewport?: {
      rootMargin: string    // IntersectionObserver margin
      threshold: number     // Visibility threshold
    }
    network?: {
      minSpeed: number      // Minimum Mbps
      maxLatency: number    // Maximum RTT in ms
    }
    userAction?: string     // Event trigger
  }
  assets: {
    css?: string[]          // CSS artifact IDs
    js?: string[]           // JS artifact IDs
  }
  fallback?: string         // Fallback strategy ID
  priority: number          // Loading priority (lower = higher)
}
```

**Validation Rules**:

- trigger must match condition type (viewport requires viewport config)
- priority must be unique within template context
- immediate trigger reserved for critical assets only
- fallback must reference valid strategy ID

## Relationships

### Directive → Artifact

- One CSSDirective generates one or more BuildArtifacts
- @split creates css-split and liquid-snippet artifacts
- @critical creates critical-css and liquid-snippet artifacts
- @inline creates liquid-snippet artifact only

### Decorator → Strategy

- TypeScriptDecorator defines LoadingStrategy for components
- @Template decorator creates template-specific strategies
- @LazyLoad decorator creates viewport-triggered strategies
- @NetworkAware decorator modifies strategy conditions

### Artifact → Metric

- Each BuildArtifact impacts multiple PerformanceMetrics
- Critical CSS artifacts directly affect FCP and LCP
- JS chunks affect TTI and TBT
- Large artifacts negatively impact all metrics

### Strategy → Artifact

- LoadingStrategy controls when BuildArtifacts load
- Immediate strategies load critical artifacts
- Viewport strategies load lazy artifacts
- Network conditions can override strategies

## Aggregate Constraints

### Performance Budget Allocation

```typescript
interface PerformanceBudget {
  total: {
    css: 250_000,      // 250KB total CSS
    js: 100_000,       // 100KB main JS
    critical: 14_000   // 14KB critical per template
  }
  perTemplate: {
    css: 30_000,       // 30KB per template
    js: 50_000         // 50KB per template
  }
  enforcement: {
    development: 'warn',
    staging: 'warn',
    production: 'error'
  }
}
```

### Directive Processing Rules

```typescript
interface DirectiveRules {
  mutual_exclusion: [
    ['@critical', '@split'],
    ['@Critical', '@LazyLoad']
  ]
  required_parameters: {
    '@split': ['target'],
    '@Template': ['templates']
  }
  size_limits: {
    '@critical': 14_000,
    '@split': 30_000,
    '@inline': 5_000
  }
}
```

## Data Flow

1. **Parse Phase**: Source files → Directives & Decorators
2. **Validate Phase**: Directives & Decorators → Validated entities
3. **Transform Phase**: Validated entities → Build instructions
4. **Generate Phase**: Build instructions → Artifacts
5. **Optimize Phase**: Artifacts → Optimized artifacts
6. **Measure Phase**: Optimized artifacts → Performance metrics
7. **Deploy Phase**: Metrics pass → Production deployment

## Storage Locations

- **Directives**: In-memory during build only
- **Decorators**: Component registry in `frontend/decorators/registry.json`
- **Artifacts**: File system at paths specified in artifact.path
- **Metrics**: Lighthouse reports in `.lighthouse/`
- **Strategies**: Runtime configuration in `frontend/config/loading.json`

---
*Data model derived from feature specification entities*
