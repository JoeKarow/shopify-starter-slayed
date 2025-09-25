# Vite-Plugin-Shopify + CSS Directive Splitting Integration Guide

This solution provides seamless integration between `vite-plugin-shopify` and advanced CSS splitting through custom PostCSS directives, including the new `@inline` directive for direct Liquid template insertion.

## Complete Integration Setup

### 1. Installation

```bash
npm install -D vite vite-plugin-shopify postcss tailwindcss@next @tailwindcss/vite
```

### 2. Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import shopify from 'vite-plugin-shopify';
import shopifySplitter from './postcss-shopify-directive-splitter.js';

export default defineConfig({
  plugins: [
    // vite-plugin-shopify handles entrypoints and vite-tag generation
    shopify({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      snippetFile: 'vite-tag.liquid'
    }),
    
    // Our custom splitter integrates with vite-plugin-shopify
    shopifySplitter.vitePlugin({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      generateViteTags: true // Creates vite-tag compatible snippets
    })
  ],
  
  css: {
    postcss: {
      plugins: [
        require('./postcss-shopify-directive-splitter')({
          // Configuration aligned with vite-plugin-shopify
          themeRoot: './',
          sourceCodeDir: 'frontend',
          entrypointsDir: 'frontend/entrypoints'
        })
      ]
    }
  }
});
```

## CSS Directive Usage Examples

### Main Theme Stylesheet with Directives

```css
/* frontend/entrypoints/theme.css */
@import "tailwindcss";

/* Global styles - always loaded */
:root {
  --color-primary: {{ settings.colors_primary | default: '#000000' }};
  --color-secondary: {{ settings.colors_secondary | default: '#666666' }};
}

/* Critical styles for all pages */
@critical global
  .header {
    @apply fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm;
  }
  
  .main-content {
    @apply container mx-auto px-4 pt-20;
  }
@endcritical

/* Inline styles for header - inserted directly in theme.liquid */
@inline header-styles if:always
  .site-header {
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 1000;
  }
  
  .announcement-bar {
    @apply bg-black text-white text-center py-2 text-sm;
  }
@endinline

/* Product page specific styles - auto-split into separate file */
@split product
  .product-gallery {
    @apply grid grid-cols-1 md:grid-cols-2 gap-8;
  }
  
  .product-image {
    @apply aspect-square rounded-lg overflow-hidden;
  }
  
  .product-info {
    @apply space-y-6;
  }
  
  /* Glass morphism effect for product cards */
  .product-card {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
@endsplit

/* Collection page styles */
@split collection
  .collection-grid {
    @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6;
  }
  
  .collection-filter {
    @apply sticky top-24 space-y-4;
  }
@endsplit

/* Cart drawer styles - loaded on demand */
@split cart
  .cart-drawer {
    @apply fixed right-0 top-0 h-full w-full max-w-md;
    @apply bg-white shadow-2xl transform transition-transform;
  }
  
  .cart-item {
    @apply flex gap-4 py-4 border-b;
  }
@endsplit

/* Inline styles for mobile menu - lazy loaded */
@inline mobile-menu lazy
  .mobile-menu {
    @apply fixed inset-0 bg-white z-50;
    @apply transform transition-transform;
    transform: translateX(-100%);
  }
  
  .mobile-menu.active {
    transform: translateX(0);
  }
@endinline

/* Scoped inline styles for promotional banner */
@inline promo-banner scoped if:template.name=='index'
  .banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    text-align: center;
    color: white;
  }
  
  .banner-title {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
@endinline

/* Critical styles for product pages only */
@critical product
  .product-hero {
    @apply relative w-full h-[60vh] md:h-[70vh];
  }
  
  .product-title {
    @apply text-3xl md:text-4xl font-bold mb-4;
  }
  
  .product-price {
    @apply text-2xl font-semibold;
  }
@endcritical

/* Responsive styles with automatic media query wrapping */
@responsive 768px product
  .product-gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  
  .product-thumbnails {
    display: flex;
    gap: 1rem;
  }
@endresponsive
```

## Liquid Template Integration

### theme.liquid - Main Layout

```liquid
<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  
  <!-- Critical CSS for immediate rendering -->
  {% render 'critical-global-css' %}
  
  {% if template contains 'product' %}
    {% render 'critical-product-css' %}
  {% elsif template contains 'collection' %}
    {% render 'critical-collection-css' %}
  {% endif %}
  
  <!-- Inline header styles (always loaded) -->
  {% render 'inline-styles-header-styles' %}
  
  <!-- Main theme styles via vite-tag -->
  {% render 'vite-tag' with 'theme.css', preload_stylesheet: true %}
  
  <!-- Load split CSS based on template -->
  {% if template contains 'product' %}
    {% render 'vite-split-product' %}
  {% elsif template contains 'collection' %}
    {% render 'vite-split-collection' %}
  {% endif %}
  
  <!-- Preload cart styles for likely interaction -->
  <link rel="prefetch" href="{{ 'splits/cart.css' | asset_url }}" as="style">
</head>
<body data-template="{{ template | handleize }}">
  {{ content_for_header }}
  
  {% sections 'header-group' %}
  
  <main class="main-content">
    {{ content_for_layout }}
  </main>
  
  {% sections 'footer-group' %}
  
  <!-- Lazy-loaded mobile menu styles -->
  {% render 'inline-styles-mobile-menu' %}
  
  <!-- Main JavaScript bundle -->
  {% render 'vite-tag' with 'theme.ts' %}
</body>
</html>
```

### Product Template

```liquid
<!-- templates/product.liquid -->
{% comment %}
  Split CSS for product pages is automatically loaded
  via the vite-split-product snippet in theme.liquid
{% endcomment %}

<div class="product-page">
  <!-- Product hero with critical CSS already loaded -->
  <div class="product-hero">
    {{ product.featured_image | image_url: width: 1200 | image_tag }}
  </div>
  
  <div class="product-gallery" data-component="ProductGallery">
    {% for image in product.images %}
      <img 
        src="{{ image | image_url: width: 400 }}"
        data-high-res="{{ image | image_url: width: 1200 }}"
        loading="lazy"
        alt="{{ image.alt | escape }}"
      />
    {% endfor %}
  </div>
  
  <div class="product-info">
    <h1 class="product-title">{{ product.title }}</h1>
    <div class="product-price">{{ product.price | money }}</div>
    
    <!-- Add to cart form -->
    {% form 'product', product %}
      <!-- form contents -->
    {% endform %}
  </div>
</div>
```

### Using Inline Styles in Sections

```liquid
<!-- sections/promotional-banner.liquid -->
{% comment %}
  The scoped inline styles are only loaded on the index page
  and automatically scoped to prevent conflicts
{% endcomment %}

{% render 'inline-styles-promo-banner' %}

<section class="banner" data-inline="promo-banner">
  <h2 class="banner-title">{{ section.settings.title }}</h2>
  <p>{{ section.settings.text }}</p>
  <a href="{{ section.settings.link }}" class="banner-cta">
    {{ section.settings.button_text }}
  </a>
</section>

{% schema %}
{
  "name": "Promotional Banner",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title"
    },
    {
      "type": "textarea",
      "id": "text",
      "label": "Text"
    }
  ]
}
{% endschema %}
```

## Generated File Structure

After running the build, the plugin generates:

```
shopify-theme/
├── frontend/
│   ├── entrypoints/
│   │   ├── theme.css          # Main stylesheet with directives
│   │   ├── theme.ts           # Main TypeScript entry
│   │   └── splits/            # Auto-generated split files
│   │       ├── product.css
│   │       ├── collection.css
│   │       └── cart.css
├── snippets/
│   ├── vite-tag.liquid        # Generated by vite-plugin-shopify
│   ├── vite-split-product.liquid
│   ├── vite-split-collection.liquid
│   ├── vite-split-cart.liquid
│   ├── critical-global-css.liquid
│   ├── critical-product-css.liquid
│   ├── inline-styles-header-styles.liquid
│   ├── inline-styles-mobile-menu.liquid
│   └── inline-styles-promo-banner.liquid
├── assets/
│   ├── theme.css              # Built CSS (production)
│   ├── splits/                # Built split CSS (production)
│   └── css-splitting-manifest.json
└── templates/
```

## Advanced @inline Directive Features

### 1. Conditional Loading

```css
/* Only load on specific templates */
@inline checkout-styles if:template.name=='checkout'
  .checkout-form { /* styles */ }
@endinline

/* Custom Liquid conditions */
@inline premium-styles if:customer.tags contains 'premium'
  .premium-badge { /* styles */ }
@endinline
```

### 2. Lazy Loading

```css
/* Load after page interaction or idle time */
@inline animations lazy
  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
@endinline
```

### 3. Scoped Styles

```css
/* Automatically scope to prevent conflicts */
@inline widget-styles scoped
  .title { /* Won't conflict with other .title classes */ }
  .content { /* Scoped to [data-inline="widget-styles"] */ }
@endinline
```

### 4. Priority Loading

```css
/* Control loading priority */
@inline hero-styles priority:high
  .hero { /* Critical hero styles */ }
@endinline

@inline footer-styles priority:low
  .footer { /* Non-critical footer styles */ }
@endinline
```

## TypeScript Component Integration

```typescript
// frontend/entrypoints/theme.ts
import { Template, LazyLoad } from '@/decorators/shopify';

// Component automatically loads only on product pages
// because the CSS is already split
@Template('product')
export class ProductGallery {
  constructor(element: HTMLElement) {
    // Initialize gallery
  }
  
  @LazyLoad()
  async loadHighResImages() {
    // Load high-res images when visible
  }
}

// Cart styles are loaded on-demand when cart is opened
@Template('global')
export class CartDrawer {
  private loaded = false;
  
  async open() {
    if (!this.loaded) {
      // Dynamically load cart CSS if not already loaded
      await this.loadCartStyles();
      this.loaded = true;
    }
    // Open cart drawer
  }
  
  private async loadCartStyles() {
    // The vite-split-cart snippet handles this automatically
    // but we can also load programmatically if needed
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = window.Shopify.routes.root + 'assets/splits/cart.css';
    document.head.appendChild(link);
  }
}
```

## Performance Benefits

With this integrated approach:

1. **Zero Configuration Splitting**: CSS automatically splits based on directives
2. **Vite-Plugin-Shopify Compatible**: Works seamlessly with existing vite-tag system
3. **Direct Liquid Insertion**: @inline directive eliminates extra HTTP requests
4. **Smart Loading**: Critical, lazy, and conditional loading strategies
5. **Type-Safe**: TypeScript decorators match CSS splits automatically

Expected improvements:
- **Initial CSS**: ~50KB (critical only)
- **Total CSS**: ~250KB (split across templates)
- **Mobile LCP**: <2.0s
- **Zero manual file management**

The `@inline` directive is particularly powerful for:
- Header/navigation styles (always needed)
- Section-specific styles (scoped and conditional)
- Interactive element styles (lazy-loaded)
- User-specific styles (conditional based on customer data)

This approach maintains full compatibility with `vite-plugin-shopify` while adding sophisticated CSS organization that AI coding tools can easily understand and modify through simple directives.
