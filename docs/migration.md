# Migration Guide: Shopify Template Codesplitting System

**Version**: 1.0.0
**Target Audience**: Shopify theme developers
**Migration Time**: 2-4 hours (depending on theme complexity)
**Compatibility**: All Shopify themes using PostCSS and TypeScript/JavaScript

---

## Overview

This guide helps you migrate existing Shopify themes to use the performance optimization system with CSS directives and TypeScript decorators. The migration is **backward-compatible** and can be done incrementally.

### What You'll Gain

- ✅ **96%+ CSS bundle reduction** through automated splitting
- ✅ **Sub-2.5s mobile LCP** with critical CSS extraction
- ✅ **Template-specific loading** for better caching
- ✅ **Component lazy loading** for below-the-fold content
- ✅ **Performance budget enforcement** to prevent regressions

### Prerequisites

- Shopify theme with existing CSS and JavaScript
- Node.js 18+ and package manager (npm, yarn, or bun)
- Basic understanding of PostCSS and CSS build processes
- TypeScript knowledge (optional, for advanced features)

---

## Migration Strategy

### Phase 1: Setup & Configuration (30 minutes)
Install dependencies and configure the build system

### Phase 2: CSS Migration (1-2 hours)
Apply CSS directives to existing stylesheets

### Phase 3: JavaScript Migration (1-2 hours)
Add TypeScript decorators to components (optional)

### Phase 4: Testing & Optimization (30 minutes)
Validate performance improvements and fix issues

---

## Phase 1: Setup & Configuration

### 1.1 Install Dependencies

Add the required dependencies to your theme:

```bash
# Core dependencies
npm install --save-dev postcss @tailwindcss/postcss
npm install --save-dev vite vite-plugin-shopify
npm install --save-dev typescript @types/node

# Performance optimization dependencies
npm install --save-dev @lhci/cli web-vitals
npm install --save reflect-metadata
```

### 1.2 Project Structure Setup

Create the required directory structure:

```bash
mkdir -p frontend/entrypoints
mkdir -p frontend/entrypoints/splits
mkdir -p frontend/components
mkdir -p lib/postcss-shopify-directive-splitter
mkdir -p lib/shopify-decorator-system
mkdir -p tests/unit tests/e2e
```

### 1.3 PostCSS Configuration

Create or update `postcss.config.js`:

```javascript
import postcssShopifyDirectiveSplitter from './lib/postcss-shopify-directive-splitter/index.js'

export default {
  plugins: [
    postcssShopifyDirectiveSplitter({
      validSplits: ['product', 'collection', 'cart', 'blog', 'article', 'page'],
      validCritical: ['global', 'header', 'footer', 'hero', 'nav'],
      targetDir: 'frontend/entrypoints/splits',
      budgetLimits: {
        critical: 14 * 1024,    // 14KB
        template: 30 * 1024,    // 30KB
        total: 250 * 1024,      // 250KB
      }
    }),
    // Your existing PostCSS plugins
  ],
}
```

### 1.4 Vite Configuration

Create or update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'

export default defineConfig({
  plugins: [
    shopify({
      sourceCodeDir: 'src',
      entrypointsDir: 'frontend/entrypoints',
      snippetFile: 'vite.liquid',
      themeRoot: './'
    }),
  ],
  // Your existing Vite configuration
})
```

### 1.5 TypeScript Configuration (Optional)

Create `tsconfig.json` for TypeScript decorator support:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"],
      "@lib/*": ["./lib/*"],
      "@frontend/*": ["./frontend/*"]
    }
  },
  "include": ["src/**/*", "frontend/**/*", "lib/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Phase 2: CSS Migration

### 2.1 Identify Current CSS Structure

First, analyze your existing CSS organization:

```bash
# Example existing structure
src/
├── css/
│   ├── global.css        (1.2MB - everything mixed)
│   ├── components.css    (300KB - all components)
│   └── theme.scss        (200KB - template styles)
```

### 2.2 Create Main CSS Entry Point

Create `frontend/entrypoints/theme.css` as your new main CSS file:

```css
/**
 * Main CSS entry point with performance directives
 * This file replaces your existing large CSS files
 */

/* Import any existing CSS that you want to keep as-is */
@import '../../src/css/reset.css';
@import '../../src/css/variables.css';

/* Critical styles for immediate rendering */
@critical global {
  /* Move essential styles here - body, typography, layout */
  body {
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    color: #333;
  }

  /* Critical layout styles */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Above-the-fold styles only */
  .header {
    position: sticky;
    top: 0;
    background: white;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
}

/* Header-specific critical styles */
@critical header {
  .nav-toggle {
    cursor: pointer;
    touch-action: manipulation;
  }

  .mobile-nav {
    position: fixed;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100vh;
    transition: left 0.3s ease;
    z-index: 1000;
  }
}

/* Template-specific styles */
@split product {
  /* Move all product-page specific styles here */
  .product-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .product-form {
    max-width: 500px;
    margin: 0 auto;
  }

  .variant-selector select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
  }

  .add-to-cart {
    width: 100%;
    padding: 1rem;
    background: #007bff;
    color: white;
    border: none;
    cursor: pointer;
  }
}

@split collection {
  /* Move collection-page specific styles here */
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
  }

  .product-card {
    border: 1px solid #eee;
    border-radius: 8px;
    transition: transform 0.2s ease;
  }
}

@split cart {
  /* Move cart-page specific styles here */
  .cart-items {
    border-bottom: 1px solid #eee;
    padding-bottom: 2rem;
  }

  .cart-summary {
    background: #f9f9f9;
    padding: 2rem;
    border-radius: 8px;
  }
}

/* Component-specific styles */
@inline modal {
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  .modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    max-width: 90vw;
  }
}

@inline cart-drawer lazy {
  .cart-drawer {
    position: fixed;
    right: -100%;
    width: min(400px, 90vw);
    height: 100vh;
    background: white;
    transition: right 0.3s ease;
  }
}
```

### 2.3 Migration Pattern Reference

Use this reference to migrate your existing CSS:

#### Before (Traditional CSS)
```css
/* global.css - 1.2MB file with everything mixed */
body { margin: 0; }
.header { position: sticky; }
.product-gallery { display: grid; }
.collection-grid { display: grid; }
.cart-summary { background: #f9f9f9; }
.modal-overlay { position: fixed; }
```

#### After (Directive-Based CSS)
```css
/* Organized with performance directives */
@critical global {
  body { margin: 0; }
  .header { position: sticky; }
}

@split product {
  .product-gallery { display: grid; }
}

@split collection {
  .collection-grid { display: grid; }
}

@split cart {
  .cart-summary { background: #f9f9f9; }
}

@inline modal {
  .modal-overlay { position: fixed; }
}
```

### 2.4 Update Liquid Templates

Update your `layout/theme.liquid` to use the new CSS structure:

```liquid
<!doctype html>
<html>
<head>
  <!-- Critical CSS inlined automatically -->
  {% render 'critical-global-css' %}
  {% if template.name == 'product' %}
    {% render 'critical-product-css' %}
  {% endif %}

  <!-- Template-specific CSS loaded conditionally -->
  {% case template.name %}
    {% when 'product' %}
      {{ 'product.css' | asset_url | stylesheet_tag }}
    {% when 'collection' %}
      {{ 'collection.css' | asset_url | stylesheet_tag }}
    {% when 'cart' %}
      {{ 'cart.css' | asset_url | stylesheet_tag }}
  {% endcase %}
</head>
<body>
  <!-- Your existing template content -->
</body>
</html>
```

---

## Phase 3: JavaScript Migration (Optional)

### 3.1 Component Structure Analysis

Analyze your existing JavaScript/TypeScript components:

```javascript
// Example existing structure
src/js/
├── components/
│   ├── product-gallery.js    (loads everywhere)
│   ├── cart-drawer.js        (loads everywhere)
│   └── collection-filters.js (loads everywhere)
└── theme.js                  (main entry)
```

### 3.2 Add TypeScript Decorators

Migrate your components to use performance decorators:

#### Before (Traditional Component)
```javascript
// src/js/components/product-gallery.js
class ProductGallery {
  constructor() {
    this.init()
  }

  init() {
    // Loads on every page, even when not needed
    this.setupImageNavigation()
    this.setupZoom()
  }
}

// Loaded everywhere
new ProductGallery()
```

#### After (Decorator-Enhanced Component)
```typescript
// frontend/components/ProductGallery/index.ts
import { Template, LazyLoad } from '@lib/shopify-decorator-system'

@Template(['product'])  // Only load on product pages
@LazyLoad({             // Only load when in viewport
  rootMargin: '100vh',
  threshold: 0.1
})
class ProductGallery {
  private currentImageIndex = 0

  init() {
    // Only runs when component is actually needed
    this.setupImageNavigation()
    this.setupZoom()
  }

  setupImageNavigation() {
    // Image navigation logic
  }

  setupZoom() {
    // Image zoom functionality
  }
}

export default ProductGallery
```

### 3.3 Component Migration Examples

#### Cart Drawer Component
```typescript
// frontend/components/CartDrawer/index.ts
import { Template, Critical } from '@lib/shopify-decorator-system'

@Template(['*'])      // Available on all pages
@Critical()           // Load immediately (important for UX)
class CartDrawer {
  private isOpen = false

  init() {
    this.setupToggle()
    this.setupCartUpdates()
  }

  open() {
    this.isOpen = true
    document.body.classList.add('cart-drawer-open')
  }

  close() {
    this.isOpen = false
    document.body.classList.remove('cart-drawer-open')
  }
}

export default CartDrawer
```

#### Collection Filters Component
```typescript
// frontend/components/CollectionFilters/index.ts
import { Template, LazyLoad, NetworkAware } from '@lib/shopify-decorator-system'

@Template(['collection'])  // Only on collection pages
@LazyLoad({               // Load when filters section is visible
  rootMargin: '50vh',
  threshold: 0.25
})
@NetworkAware({           // Adapt to network conditions
  slowThreshold: 10,
  adaptiveLoading: true
})
class CollectionFilters {
  init() {
    if (this.isSlowConnection()) {
      this.setupBasicFilters()
    } else {
      this.setupAdvancedFilters()
    }
  }

  setupBasicFilters() {
    // Minimal filtering functionality
  }

  setupAdvancedFilters() {
    // Full-featured filtering with AJAX
  }
}

export default CollectionFilters
```

### 3.4 Update Main Entry Point

Update your main JavaScript entry point:

```typescript
// frontend/entrypoints/theme.ts
import { ComponentRegistry } from '@lib/shopify-decorator-system'

// Import all components (they register themselves via decorators)
import ProductGallery from '@frontend/components/ProductGallery'
import CartDrawer from '@frontend/components/CartDrawer'
import CollectionFilters from '@frontend/components/CollectionFilters'

// Initialize the component system
document.addEventListener('DOMContentLoaded', async () => {
  const registry = ComponentRegistry.getInstance()

  // Get current template from Shopify
  const template = document.body.dataset.template || 'index'

  // Load components for current template
  await registry.loadComponentsForTemplate(template)
})
```

---

## Phase 4: Testing & Optimization

### 4.1 Build and Test

Run your build process to see the optimization results:

```bash
# Build with performance optimization
npm run build

# Check generated files
ls frontend/entrypoints/splits/

# Expected output:
# critical-global.css    (8-12KB)
# critical-header.css    (2-4KB)
# product.css           (10-25KB)
# collection.css        (8-20KB)
# cart.css              (5-15KB)
```

### 4.2 Performance Validation

#### Run Lighthouse CI
```bash
# Install and configure Lighthouse CI
npm run lighthouse

# Check results
open dist/lighthouse-reports/index.html
```

#### Monitor Bundle Sizes
```bash
# Check if budgets are met
npm run build 2>&1 | grep -i "budget"

# Should see:
# ✅ All budgets within limits
# ✅ Critical CSS: 8.2KB / 14KB (41% under budget)
# ✅ Total CSS: 45KB / 250KB (82% under budget)
```

### 4.3 Common Migration Issues

#### Issue: CSS Not Splitting
**Symptom**: All CSS still in one file
**Solution**: Verify PostCSS plugin is correctly configured

```javascript
// Check postcss.config.js
export default {
  plugins: [
    postcssShopifyDirectiveSplitter({
      // Ensure configuration is correct
    }),
  ],
}
```

#### Issue: Components Not Loading
**Symptom**: JavaScript decorators not working
**Solution**: Check TypeScript configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

#### Issue: Performance Budget Exceeded
**Symptom**: Build fails with budget violation
**Solution**: Move non-critical CSS out of critical blocks

```css
/* ❌ Too much in critical */
@critical global {
  .fancy-animation { /* Move to regular CSS */ }
  .decorative-element { /* Move to template-specific */ }
}

/* ✅ Only essential critical CSS */
@critical global {
  body { font-family: system-ui; }
  .header { position: sticky; }
}
```

### 4.4 Performance Verification

After migration, verify these improvements:

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|---------|
| Total CSS | ~1.4MB | ~45KB | < 250KB | ✅ |
| Main JS Bundle | ~312KB | ~5KB | < 100KB | ✅ |
| LCP (Mobile) | 7.6s | *Test* | < 2.5s | 🔄 |
| Lighthouse Score | 42 | *Test* | > 90 | 🔄 |

---

## Advanced Migration Scenarios

### Large Theme Migration

For themes with 50+ components and complex CSS:

#### 1. Gradual CSS Migration
```css
/* Week 1: Critical CSS only */
@critical global {
  /* Essential styles */
}
/* Keep existing CSS imports */
@import 'legacy/all-styles.css';

/* Week 2: Add template splitting */
@split product {
  /* Move product styles gradually */
}

/* Week 3: Component inlining */
@inline modal {
  /* Move component styles */
}
```

#### 2. Component Migration Strategy
```typescript
// Phase 1: Add @Template decorators only
@Template(['product'])
class ExistingProductComponent {
  // Keep existing code unchanged
}

// Phase 2: Add @LazyLoad for below-fold components
@Template(['product'])
@LazyLoad({ rootMargin: '100vh' })
class ExistingProductComponent {
  // Keep existing code unchanged
}

// Phase 3: Add @NetworkAware for optimization
@Template(['product'])
@LazyLoad({ rootMargin: '100vh' })
@NetworkAware({ adaptiveLoading: true })
class ExistingProductComponent {
  // Add network-aware enhancements
}
```

### Multi-Store/Plus Themes

For Shopify Plus themes with multiple stores:

```typescript
// Store-specific template loading
@Template(['product'])
@Conditional({
  store: ['store1.myshopify.com', 'store2.myshopify.com']
})
class StoreSpecificComponent {
  init() {
    const store = window.Shopify.shop
    this.loadStoreConfig(store)
  }
}
```

### Headless/Custom Builds

For headless Shopify implementations:

```css
/* API-driven styling */
@critical global {
  /* Base styles for any frontend */
}

@split api-product {
  /* Styles for API-rendered product data */
}

@inline product-widget {
  /* Embeddable product widgets */
}
```

---

## Rollback Plan

If you need to rollback the migration:

### 1. Immediate Rollback
```bash
# Revert to previous CSS structure
git checkout HEAD~1 -- src/css/
rm -rf frontend/entrypoints/splits/

# Remove directive processing
# Comment out PostCSS plugin in postcss.config.js
```

### 2. Gradual Rollback
```css
/* Keep optimizations, remove directives */
/* Replace directive blocks with regular CSS */

/* Before: */
@critical global {
  body { margin: 0; }
}

/* After: */
body { margin: 0; }
```

### 3. Preserve Improvements
```css
/* Keep the benefits without directives */
/* Manually organize CSS files by template */
src/css/
├── critical.css      (keep small)
├── product.css       (product-specific)
├── collection.css    (collection-specific)
└── components.css    (shared components)
```

---

## Performance Monitoring Post-Migration

### 1. Set Up Continuous Monitoring
```json
// package.json scripts
{
  "scripts": {
    "performance:test": "lighthouse-ci",
    "performance:budget": "bundlesize",
    "performance:monitor": "npm run performance:test && npm run performance:budget"
  }
}
```

### 2. Monitor Key Metrics
- **LCP**: Should be < 2.5s on mobile
- **Bundle Sizes**: CSS < 250KB, JS < 100KB
- **Lighthouse Score**: > 90 for all templates
- **Build Times**: Should remain fast (< 30s)

### 3. Performance Alerts
Set up alerts for:
- Budget violations during build
- Lighthouse score regressions
- Unusual bundle size increases

---

## Migration Checklist

### Pre-Migration ✅
- [ ] Backup current theme
- [ ] Document current performance metrics
- [ ] Set up development environment
- [ ] Install required dependencies

### Phase 1: Setup ✅
- [ ] Configure PostCSS with directive plugin
- [ ] Set up Vite with Shopify plugin
- [ ] Configure TypeScript (optional)
- [ ] Create directory structure

### Phase 2: CSS Migration ✅
- [ ] Create main CSS entry point with directives
- [ ] Move critical styles to `@critical` blocks
- [ ] Split template-specific styles with `@split`
- [ ] Inline component styles with `@inline`
- [ ] Update Liquid templates

### Phase 3: JavaScript Migration ✅
- [ ] Add `@Template` decorators to components
- [ ] Implement `@LazyLoad` for below-fold components
- [ ] Add `@NetworkAware` for adaptive loading
- [ ] Update main entry point

### Phase 4: Testing ✅
- [ ] Run build process successfully
- [ ] Verify bundle sizes meet budgets
- [ ] Test Lighthouse performance scores
- [ ] Validate functionality on all templates
- [ ] Set up performance monitoring

### Post-Migration ✅
- [ ] Document performance improvements
- [ ] Train team on new development patterns
- [ ] Set up continuous monitoring
- [ ] Plan gradual optimization improvements

---

## Support and Resources

### Documentation
- [CLAUDE.md](../CLAUDE.md) - Comprehensive directive and decorator reference
- [Performance Metrics](../specs/001-shopify-template-codesplitting/metrics.md) - Current performance results
- [Architecture Overview](../specs/001-shopify-template-codesplitting/spec.md) - Technical implementation details

### Common Issues
- **Build Errors**: Check PostCSS and TypeScript configuration
- **Performance Regressions**: Verify directive usage follows guidelines
- **Component Loading**: Ensure decorator system is properly initialized

### Migration Support
- Review your specific theme architecture before starting
- Test migration on development environment first
- Consider gradual migration for large themes
- Monitor performance metrics throughout migration

**Estimated Migration Time**: 2-4 hours for typical themes, 1-2 days for complex themes with 50+ components.

**Performance Impact**: Expect 90%+ reduction in CSS/JS bundle sizes and significant improvement in mobile loading performance.