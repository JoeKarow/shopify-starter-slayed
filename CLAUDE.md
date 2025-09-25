# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a performance-optimized Shopify starter theme built with Vite, Alpine.js, TailwindCSS v4, and Liquid. It features automated CSS/JS code splitting through declarative directives and decorators, achieving sub-2.5s mobile load times. The theme uses the Shopify Vite Plugin for development and build processes.

## Essential Commands

### Development

```bash
npm run dev              # Start local dev server with Shopify theme dev
npm run vite:watch       # Run Vite dev server only
npm run shopify:dev      # Run Shopify theme dev only
```

### Building & Deployment

```bash
npm run build            # Build production assets
npm run deploy           # Build and push to production (interactive)
npm run deploy:dev       # Build and push to development environment
npm run deploy:staging   # Build and push to staging environment
npm run deploy:new       # Build and push as new unpublished theme
```

### Code Quality

```bash
npm run lint             # Run Biome linter
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Biome
```

### Testing

```bash
npm run test             # Run Vitest tests
npm run test:ui          # Run Vitest with UI
npm run test:run         # Run tests once
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright tests with UI
```

### Shopify CLI

```bash
npm run shopify:pull     # Pull theme from Shopify
npm run shopify:pull-dev # Pull development theme
```

## Architecture & Key Components

### Vite Configuration

- Uses `vite-plugin-shopify` for Shopify integration
- SSL enabled for local development (port 3000)
- Custom plugin copies files from `public/` to `assets/` during development
- Entry points located in `src/entrypoints/`
- Additional entry point: `src/js/prodify/index.ts` for product variant handling

### Frontend Stack

- **Alpine.js**: Component system with auto-registration in `src/js/alpine/`
  - Magic properties, stores, directives, and components auto-loaded
  - Plugins: Collapse, Focus, Morph
- **TailwindCSS v4.1.13**: Using PostCSS with `@tailwindcss/typography` plugin
  - Custom variants: `scrolled`, `mobile-menu-visible`
  - Custom colors: `cloud-burst`, `woodland`
- **Liquid Ajax Cart v2**: AJAX cart functionality with directives throughout sections
- **Performance Optimization System**:
  - CSS Directives: `@split`, `@critical`, `@inline` for automated code splitting
  - TypeScript Decorators: `@Template`, `@LazyLoad`, `@NetworkAware` for component loading
  - PostCSS plugin: `postcss-shopify-directive-splitter` for build-time processing
  - Performance budgets enforced: CSS<250KB, Critical<14KB, JS<100KB

### Project Structure

- `frontend/entrypoints/`: Vite entry points with directive-based CSS (theme.css, theme.ts)
- `frontend/entrypoints/splits/`: Auto-generated template-specific CSS files
- `frontend/components/`: TypeScript components with decorators
- `frontend/decorators/`: Decorator implementations and component registry
- `src/js/alpine/`: Alpine.js components, stores, directives, magic properties
- `src/js/prodify/`: TypeScript-based product variant picker system
- `src/css/`: CSS files including global.css for non-tree-shaken styles
- `sections/`, `snippets/`, `templates/`: Shopify Liquid theme files
- `public/`: Static assets (copied to assets/ on build)

### Prodify System

Custom variant picker implementation in TypeScript:

- Handles both select and radio variant pickers
- Updates DOM, manages variant availability
- Located in `src/js/prodify/` with modular architecture

### Code Standards

- **Formatter**: Biome with 2-space indentation, single quotes, semicolons as needed
- **TypeScript**: Config in `tsconfig.json`, types in `src/js/prodify/ts-types.ts`
- **Testing**: Vitest for unit tests, Playwright for E2E

### Shopify Configuration

- Environments configured in `shopify.theme.toml` (development, staging, production)
- Theme check configuration in `.theme-check.yml`
- Shopify-specific ignores in `.shopifyignore`

## Development Notes

### SSL Certificate

If assets aren't loading due to SSL errors:

1. Visit <https://127.0.0.1:3000>
2. Click Advanced and proceed past warning
3. Return to <http://127.0.0.1:9292>

### Hot Reload

- Shopify theme changes trigger reload via `/tmp/theme.update`
- Liquid file changes handled by custom Vite plugin to prevent full refresh
- HMR enabled for JavaScript/CSS changes
- Directive changes in CSS trigger automatic re-splitting

## Performance Optimization System

This theme implements a comprehensive performance optimization system using CSS directives and TypeScript decorators to achieve sub-2.5s mobile load times while maintaining developer experience.

### CSS Directives

#### @critical Directive

Extract above-the-fold CSS for immediate rendering:

```css
/* Global critical styles for all templates */
@critical global {
  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    line-height: 1.6;
  }

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
  .nav-trigger {
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
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

/* Hero section critical styles */
@critical hero {
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
}
```

#### @split Directive

Split CSS by Shopify template for better caching:

```css
/* Product page specific styles */
@split product {
  .product-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .product-form {
    max-width: 500px;
    margin: 0 auto;
  }

  .variant-selector select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .add-to-cart {
    width: 100%;
    padding: 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }
}

/* Collection page specific styles */
@split collection {
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
    padding: 2rem 0;
  }

  .product-card {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  }
}

/* Cart page specific styles */
@split cart {
  .cart-items {
    border-bottom: 1px solid #eee;
    padding-bottom: 2rem;
    margin-bottom: 2rem;
  }

  .cart-item {
    display: flex;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #f5f5f5;
  }

  .cart-summary {
    background: #f9f9f9;
    padding: 2rem;
    border-radius: 8px;
  }
}

/* Multi-template shared styles */
@split product, collection {
  .product-price {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2d3748;
  }

  .product-price.sale {
    color: #e53e3e;
  }

  .product-price .compare-at {
    text-decoration: line-through;
    color: #718096;
    margin-right: 0.5rem;
  }
}
```

#### @inline Directive

Inline component-specific CSS that should load with the component:

```css
/* Modal component styles */
@inline modal {
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .modal-overlay.active {
    opacity: 1;
    visibility: visible;
  }

  .modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  }
}

/* Cart drawer component */
@inline cart-drawer lazy {
  .cart-drawer {
    position: fixed;
    top: 0;
    right: -100%;
    width: min(400px, 90vw);
    height: 100vh;
    background: white;
    box-shadow: -4px 0 20px rgba(0,0,0,0.1);
    transition: right 0.3s ease;
    z-index: 1001;
  }

  .cart-drawer.open {
    right: 0;
  }

  .cart-drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }
}

/* Search modal with lazy loading and scoped styles */
@inline search-modal lazy scoped {
  .search-modal {
    --search-modal-bg: rgba(0, 0, 0, 0.8);
    --search-modal-content-bg: white;
    --search-modal-border-radius: 12px;

    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--search-modal-bg);
    z-index: 2000;
    padding: 2rem;
  }

  .search-content {
    background: var(--search-modal-content-bg);
    border-radius: var(--search-modal-border-radius);
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }

  .search-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1.1rem;
  }
}

/* Notification component */
@inline notification scoped {
  .notification {
    position: fixed;
    top: 1rem;
    right: 1rem;
    min-width: 300px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .notification.show {
    transform: translateX(0);
  }

  .notification.success {
    border-left: 4px solid #28a745;
  }

  .notification.error {
    border-left: 4px solid #dc3545;
  }
}
```

### TypeScript Decorators

#### @Template Decorator

Load components only on specific Shopify templates:

```typescript
// Product page only
@Template(['product'])
class ProductGallery {
  private currentImageIndex = 0

  init() {
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

// Multiple templates
@Template(['product', 'collection'])
class ProductCard {
  init() {
    this.setupQuickView()
    this.setupVariantSelection()
  }
}

// All templates (global component)
@Template(['*'])
class GlobalNotification {
  init() {
    this.setupNotificationSystem()
  }
}

// Exclude specific templates
@ExcludeTemplate(['cart', '404'])
class ProductRecommendations {
  init() {
    this.loadRecommendations()
  }
}
```

#### @LazyLoad Decorator

Enable viewport-based lazy loading for below-the-fold components:

```typescript
// Basic lazy loading
@LazyLoad()
class ProductReviews {
  init() {
    this.loadReviews()
  }
}

// Custom intersection observer options
@LazyLoad({
  rootMargin: '100vh',    // Start loading 1 viewport before visible
  threshold: 0.1          // Trigger when 10% visible
})
class RelatedProducts {
  init() {
    this.fetchRelatedProducts()
  }
}

// With placeholder component
@LazyLoad({
  rootMargin: '50vh',
  threshold: 0.25,
  placeholder: 'ProductGallerySkeleton'
})
class ProductGallery {
  init() {
    this.initializeGallery()
  }
}

// Advanced lazy loading for heavy components
@LazyLoad({
  rootMargin: '200px',
  threshold: [0.1, 0.5, 1.0]  // Multiple thresholds for progressive loading
})
class InteractiveMap {
  private mapLoaded = false

  init() {
    if (!this.mapLoaded) {
      this.loadMapLibrary()
    }
  }
}
```

#### @Critical Decorator

Mark components as critical for immediate loading:

```typescript
@Critical()
class HeaderNavigation {
  init() {
    this.setupMobileMenu()
    this.setupSearch()
  }
}

@Critical()
class CartNotification {
  init() {
    this.listenForCartUpdates()
  }
}
```

#### @NetworkAware Decorator

Adapt component behavior based on network conditions:

```typescript
@NetworkAware({
  slowThreshold: 10,      // Consider connection slow if > 10s
  adaptiveLoading: true
})
class HeroVideo {
  init() {
    const connection = this.getNetworkInfo()

    if (connection.slow) {
      this.loadStaticImage()
    } else {
      this.loadVideo()
    }
  }
}

@NetworkAware({
  saveData: true,         // Respect user's data saver preference
  adaptiveQuality: true
})
class ProductImages {
  init() {
    const quality = this.shouldSaveData() ? 'low' : 'high'
    this.loadImages(quality)
  }
}
```

#### Combining Decorators

Use multiple decorators together for fine-grained control:

```typescript
// Template-specific lazy-loaded component
@Template(['product'])
@LazyLoad({ rootMargin: '100vh', threshold: 0.1 })
class ProductReviews {
  init() {
    this.loadReviews()
  }
}

// Network-aware lazy loading
@Template(['collection'])
@LazyLoad({ rootMargin: '50vh' })
@NetworkAware({ slowThreshold: 5 })
class CollectionFilters {
  init() {
    if (this.isSlowConnection()) {
      this.loadBasicFilters()
    } else {
      this.loadAdvancedFilters()
    }
  }
}

// Critical component with network awareness
@Template(['*'])
@Critical()
@NetworkAware({ adaptiveLoading: true })
class GlobalHeader {
  init() {
    this.setupNavigation()

    if (!this.isSlowConnection()) {
      this.loadEnhancements()
    }
  }
}
```

### Advanced Performance Patterns

#### Progressive Enhancement

```typescript
@Template(['product'])
@NetworkAware({ progressiveEnhancement: true })
class ProductGallery {
  init() {
    // Basic functionality first
    this.setupBasicGallery()

    // Enhanced features for faster connections
    if (this.canLoadEnhancements()) {
      this.setupZoom()
      this.setupThumbnails()
      this.setup360View()
    }
  }
}
```

#### Adaptive Image Loading

```css
/* Responsive images with directive splitting */
@split product {
  .product-image {
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  /* High-quality images for fast connections */
  @media (min-width: 768px) and (prefers-reduced-data: no-preference) {
    .product-image {
      image-rendering: high-quality;
    }
  }

  /* Optimized images for slow connections */
  @media (prefers-reduced-data: reduce) {
    .product-image {
      filter: blur(0.5px);
      image-rendering: optimizeSpeed;
    }
  }
}
```

#### Cache-Optimized Component Loading

```typescript
@Template(['*'])
@Cached({ duration: '1hour', key: 'global-header' })
class GlobalHeader {
  init() {
    // Component state cached for 1 hour
    this.loadCachedState()
  }
}

@Template(['product'])
@LazyLoad()
@Cached({ duration: '30min', key: (productId) => `reviews-${productId}` })
class ProductReviews {
  init() {
    this.loadCachedReviews()
  }
}
```

### Performance Guidelines

#### Critical CSS Budget (< 14KB per template)
- Include only above-the-fold styles in `@critical` blocks
- Focus on layout, typography, and critical interactive elements
- Avoid decorative styles and animations in critical CSS
- Use system fonts initially, load custom fonts progressively

#### Template CSS Budget (< 30KB per template)
- Split styles logically by Shopify template using `@split`
- Share common styles across multiple templates when beneficial
- Optimize for HTTP/2 multiplexing with smaller, focused files

#### Total CSS Budget (< 250KB)
- Monitor total CSS bundle size across all templates
- Use tree-shaking and PurgeCSS for unused style removal
- Leverage CSS custom properties for theming without duplication

#### JavaScript Budget (< 100KB main bundle)
- Use `@LazyLoad` for below-the-fold components
- Apply `@Template` decorators to reduce unused code
- Leverage dynamic imports for heavy features

#### Mobile Performance Targets
- **LCP < 2.5s**: Use `@critical` for above-the-fold content
- **FCP < 1.8s**: Minimize critical CSS and use system fonts
- **CLS < 0.1**: Reserve space for dynamic content
- **TTI < 3.5s**: Use `@LazyLoad` and `@NetworkAware` strategically

#### Network Adaptation Strategy
- Use `@NetworkAware` for connection-sensitive features
- Implement progressive enhancement patterns
- Respect `prefers-reduced-data` CSS media query
- Provide fallbacks for slow connections

### Build-Time Optimizations

The system automatically:
- Extracts and optimizes critical CSS
- Generates template-specific CSS bundles
- Creates Liquid snippets for conditional loading
- Enforces performance budgets during build
- Generates source maps for debugging
- Optimizes asset delivery with content hashing

### Development Workflow

1. **Write CSS with directives** in `frontend/entrypoints/theme.css`
2. **Create components with decorators** in `frontend/components/`
3. **Run development server** with `npm run dev`
4. **CSS automatically splits** based on directives
5. **Components load conditionally** based on decorators
6. **Performance budgets enforced** in production builds

## Recent Changes

- **2025-09-25**: Completed Phase 3.8: Performance Validation & Polish with comprehensive testing and documentation
- **2025-09-25**: Added Lighthouse CI configuration for automated performance monitoring
- **2025-09-25**: Created extensive unit tests for directive parsers and decorators
- **2025-09-25**: Enhanced CLAUDE.md with detailed performance optimization patterns and examples
- **2025-09-24**: Implemented performance optimization system with CSS directives and TypeScript decorators
- **2025-09-24**: Added PostCSS plugin for automated code splitting
- **2025-09-24**: Configured performance budget enforcement in build pipeline
