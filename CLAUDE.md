# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify starter theme built with Vite, Alpine.js, TailwindCSS v4, and Liquid. It uses the Shopify Vite Plugin for development and build processes.

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

### Project Structure

- `src/entrypoints/`: Vite entry points (theme.js, etc.)
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
