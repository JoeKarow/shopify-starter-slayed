# Implementation Context for /plan Command

## Technical Approach Summary

Build an automated CSS/JavaScript optimization system for Shopify themes using PostCSS directive processing and TypeScript decorators, integrating with vite-plugin-shopify to achieve sub-2.5s mobile LCP through intelligent code splitting without manual file management.

## Architecture Decisions

### PostCSS Directive Processing
**Choice**: Custom PostCSS plugin (`postcss-shopify-directive-splitter.js`)
**Rationale**: 
- PostCSS provides AST manipulation capabilities needed for directive parsing
- Integrates naturally with existing Vite/TailwindCSS pipeline
- Allows in-place transformation without separate preprocessing step
- Maintains source maps for debugging

**Implementation**:
- Plugin parses `@split`, `@critical`, `@inline`, `@responsive` directives
- Generates separate CSS files in `frontend/entrypoints/splits/`
- Creates Liquid snippets in `snippets/` directory
- Produces manifest file for tracking generated assets

### TypeScript Decorator System
**Choice**: Stage 2 decorators with experimental support
**Rationale**:
- Provides declarative component organization
- Enables runtime behavior modification
- Supports metadata for automatic registration
- Compatible with esbuild through TypeScript compilation

**Implementation**:
- Decorators modify class constructors and methods
- Global registry tracks component associations
- IntersectionObserver handles lazy loading
- Network API enables adaptive behavior

### Build Tool Integration
**Choice**: Vite with vite-plugin-shopify
**Rationale**:
- Fast HMR for development productivity
- Native ESM support
- Excellent plugin ecosystem
- Specific Shopify integration available

**Configuration Stack**:
```javascript
// Core plugins
- vite-plugin-shopify // Shopify theme integration
- @tailwindcss/vite   // TailwindCSS v4
- postcss-shopify-directive-splitter // Custom directive processing

// Build optimization
- LightningCSS for minification
- esbuild for TypeScript
- Rollup for chunking
```

## Implementation Phases

### Phase 1: PostCSS Plugin Development
1. Create PostCSS plugin with directive parsers
2. Implement AST transformation logic
3. Add file generation for splits
4. Create Liquid snippet generation
5. Integrate with Vite build pipeline

### Phase 2: TypeScript Decorator Implementation
1. Setup TypeScript with decorator support
2. Create core decorators (@Template, @LazyLoad, @Critical)
3. Implement component registry
4. Add automatic initialization logic
5. Create utility decorators (@Debounced, @NetworkAware)

### Phase 3: Vite Integration
1. Configure vite-plugin-shopify
2. Setup PostCSS pipeline
3. Configure TailwindCSS v4
4. Add development server middleware
5. Implement HMR for directives

### Phase 4: Liquid Template Updates
1. Modify theme.liquid for critical CSS
2. Add conditional split loading
3. Create snippet templates
4. Update section templates
5. Add performance hints (preload, prefetch)

### Phase 5: Performance Optimization
1. Implement CSS minification
2. Add JavaScript chunking strategy
3. Setup lazy loading boundaries
4. Configure adaptive loading
5. Add performance monitoring

## Technical Stack Details

### Dependencies
```json
{
  "devDependencies": {
    "vite": "^5.1.0",
    "vite-plugin-shopify": "^3.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "postcss": "^8.4.35",
    "lightningcss": "^1.24.0",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "alpinejs": "^3.13.0"
  }
}
```

### File Structure
```
frontend/
├── entrypoints/
│   ├── theme.css         # Main styles with directives
│   ├── theme.ts          # Main TypeScript entry
│   └── splits/           # Generated split files
│       ├── product.css
│       ├── collection.css
│       └── cart.css
├── components/           # TypeScript components
│   ├── ProductGallery.ts
│   ├── CartDrawer.ts
│   └── LazyImage.ts
├── decorators/
│   └── shopify.ts        # Decorator implementations
└── styles/
    └── utilities.css     # Shared utilities
```

### PostCSS Configuration
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('./postcss-shopify-directive-splitter')({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      validSplits: ['product', 'collection', 'cart', 'account'],
      generateViteTags: true,
      minify: process.env.NODE_ENV === 'production'
    })
  ]
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

## Integration Points

### With vite-plugin-shopify
- Plugin generates files in expected locations
- Uses vite-tag snippet system
- Maintains HMR compatibility
- Shares asset pipeline

### With Shopify Theme Structure
- Snippets go in standard location
- Assets use Shopify CDN
- Liquid templates unchanged
- Section API preserved

### With TailwindCSS v4
- Directives work with @apply
- CSS-first configuration supported
- Utility classes preserved through splitting
- Source maps maintained

## Directive Processing Logic

### @split Directive
```css
@split product
  .gallery { }
@endsplit
```
→ Creates `frontend/entrypoints/splits/product.css`
→ Generates `snippets/vite-split-product.liquid`

### @critical Directive
```css
@critical global
  .header { }
@endcritical
```
→ Creates `snippets/critical-global-css.liquid`
→ Inlines in `<style>` tags

### @inline Directive
```css
@inline header lazy scoped
  .nav { }
@endinline
```
→ Creates `snippets/inline-styles-header.liquid`
→ Adds lazy loading wrapper
→ Scopes with data attribute

## Performance Optimization Strategies

### CSS Optimization
- Critical CSS extraction (<14KB)
- Template-specific splitting
- Unused CSS removal via PurgeCSS
- LightningCSS minification
- Deduplication of variables

### JavaScript Optimization
- Dynamic imports for code splitting
- Tree shaking via Rollup
- Lazy component initialization
- Network-aware loading
- Service worker caching

### Asset Loading Strategy
```liquid
<!-- Critical CSS (inline) -->
{% render 'critical-global-css' %}

<!-- Main styles (preloaded) -->
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style">

<!-- Template styles (conditional) -->
{% if template contains 'product' %}
  {% render 'vite-split-product' %}
{% endif %}

<!-- Prefetch likely navigation -->
<link rel="prefetch" href="{{ 'splits/cart.css' | asset_url }}">
```

## Testing Strategy

### Unit Tests
- PostCSS plugin directive parsing
- Decorator functionality
- Component registration
- File generation

### Integration Tests
- Build output verification
- Liquid snippet generation
- Asset loading in browser
- HMR functionality

### Performance Tests
- Lighthouse CI automation
- Bundle size checks
- Loading time measurements
- Network throttling tests

## Migration Plan

### From Existing Codebase
1. Install dependencies
2. Add PostCSS plugin
3. Convert existing CSS to use directives
4. Add decorators to components
5. Update Liquid templates
6. Test and optimize

### Incremental Adoption
- Start with critical CSS extraction
- Add splits for largest templates
- Implement lazy loading for below-fold
- Add network-aware features
- Optimize based on metrics

## Risk Mitigation

### Technical Risks
- **PostCSS compatibility**: Test with all CSS features used
- **Decorator support**: Provide fallback for non-decorator environments
- **Build complexity**: Maintain clear documentation
- **Performance regression**: Automated testing with budgets

### Operational Risks
- **Learning curve**: Comprehensive documentation and examples
- **Debugging complexity**: Source maps and clear error messages
- **Shopify updates**: Abstract Shopify-specific code
- **Browser compatibility**: Progressive enhancement approach

## Success Criteria

### Performance Metrics
- Mobile LCP < 2.5s (currently 7.6-10.2s)
- CSS bundle < 250KB (currently 1.4MB)
- Lighthouse score > 90
- FCP < 1.8s
- CLS < 0.1

### Developer Metrics
- Zero manual file management
- 2-3x faster feature development
- AI tool comprehension improved
- Reduced maintenance overhead

### Business Metrics
- Improved conversion rate
- Better SEO rankings
- Reduced bounce rate
- Increased mobile engagement

## Future Enhancements

### Planned Features
- Service worker integration
- Edge computing optimization
- AI-powered directive suggestions
- Automated performance testing
- Visual regression testing

### Potential Optimizations
- WebP/AVIF image processing
- Font subsetting automation
- Third-party script management
- Predictive prefetching
- Bundle splitting analytics
