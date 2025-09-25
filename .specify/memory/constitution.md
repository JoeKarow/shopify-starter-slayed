<!-- Sync Impact Report
Version change: [NEW] → 1.0.0
Modified principles: N/A (initial version)
Added sections: All (initial creation)
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md (already aligned)
  ✅ spec-template.md (already aligned)
  ✅ tasks-template.md (already aligned)
  ✅ agent-file-template.md (already aligned)
Follow-up TODOs: None
-->

# Shopify Performance Optimization System Constitution

## Core Principles

### I. Declarative Performance

All performance optimizations MUST be achieved through declarative directives and patterns that express intent, not implementation. CSS splitting uses `@split`, `@critical`, `@inline` directives. Component loading uses `@Template`, `@LazyLoad` decorators. This ensures AI tools and developers can understand and modify the system without managing file structures.

### II. Zero Manual File Management

The system MUST NOT require manual creation or management of CSS/JS split files. All code splitting, chunk generation, and asset optimization happens automatically through build-time processing of directives. Developers work with logical components, not physical file boundaries.

### III. Performance Budget Enforcement (NON-NEGOTIABLE)

Every build MUST enforce strict performance budgets:

- Mobile LCP < 2.5s (MUST achieve from current 7.6-10.2s)
- Total CSS < 250KB (MUST achieve from current 1.4MB)
- Critical CSS < 14KB per template
- Main JS bundle < 100KB
These are hard limits that fail the build if exceeded, ensuring performance never regresses.

### IV. Progressive Enhancement First

Features MUST be built assuming the worst-case scenario: slow 3G networks, low-powered devices, JavaScript disabled. Core functionality works with HTML/CSS alone. JavaScript enhances but never gates functionality. Network-aware loading adapts to connection quality automatically.

### V. Template-Aware Architecture

The system MUST respect Shopify's template-based routing and Section Rendering API. Each template gets optimized assets specific to its needs. Components know which templates they belong to via decorators. No global bundles that load unnecessary code.

### VI. Developer Experience Priority

The optimization system MUST NOT impede development velocity. Hot Module Replacement works seamlessly. Source maps available in development. Clear error messages guide fixes. Directives are self-documenting. AI assistants can understand and modify patterns without external context.

### VII. Measurement-Driven Development

Every optimization MUST be measurable and measured. Performance metrics tracked in CI/CD. Before/after comparisons for every change. Real User Metrics (RUM) inform optimization priorities. Synthetic tests prevent regression.

## Build System Requirements

### PostCSS Directive Processing

- Plugin processes `@split`, `@critical`, `@inline`, `@responsive` directives
- Generates template-specific CSS files automatically
- Creates Liquid snippets for inline insertion
- Integrates with vite-plugin-shopify asset pipeline

### TypeScript Decorator System

- `@Template` decorator for template association
- `@LazyLoad` decorator for viewport-based loading
- `@Critical` decorator for immediate loading
- `@NetworkAware` decorator for connection adaptation
- Auto-discovery without manual registration

### Asset Output Constraints

- Main CSS bundle: Maximum 50KB
- Template CSS: Maximum 30KB per template
- Critical inline CSS: Maximum 14KB per template
- JavaScript main: Maximum 100KB
- Total CSS across all templates: Maximum 250KB

## Development Workflow

### Local Development

- Vite dev server with SSL on port 3000
- HMR for all directive changes
- Real-time performance budget warnings
- Shopify Theme Inspector integration

### Build Process

- Directives processed before bundling
- Liquid snippets auto-generated
- Performance budgets enforced
- Asset fingerprinting maintained

### Testing Requirements

- Lighthouse CI with minimum score 90
- Visual regression tests for critical styles
- Network simulation tests (3G, slow 3G)
- Cross-browser compatibility checks

## Governance

### Amendment Process

- Constitution changes require performance impact analysis
- Breaking changes require migration path documentation
- All changes must maintain or improve performance metrics
- Version bumps follow semantic versioning

### Compliance Verification

- Every PR must pass performance budget checks
- Directive usage reviewed in code review
- Performance regression tests run automatically
- Monthly performance audit reviews

### Runtime Guidance

- Use CLAUDE.md for Claude Code development guidance
- Performance optimization patterns documented in specs/
- Build configuration in vite.config.js
- Shopify integration via shopify.theme.toml

**Version**: 1.0.0 | **Ratified**: 2025-01-24 | **Last Amended**: 2025-01-24
