# Performance Tasks: Shopify Template Codesplitting

**Input**: Design documents from `/specs/001-shopify-template-codesplitting/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/
**Performance Baseline**: Mobile LCP: 7.6-10.2s, Total CSS: 1.4MB, JS main: 312KB, Lighthouse: 42

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Extract: TypeScript 5.3.3, PostCSS 8.4.35, Vite 5.1.0, vite-plugin-shopify 3.0.0
2. Load design documents:
   → data-model.md: CSSDirective, TypeScriptDecorator, BuildArtifact entities
   → contracts/: postcss-plugin.ts, decorator-system.ts
   → research.md: PostCSS plugin architecture, Stage 2 decorators
3. Generate tasks by category:
   → Setup: PostCSS config, TypeScript decorators, performance budgets
   → Tests: contract tests for plugins, performance tests
   → Core: directive parsers, decorator implementations, registry
   → Integration: Vite pipeline, Liquid generation, HMR
   → Polish: unit tests, performance validation, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- **Commits**: Use Conventional Commits with Task ID as scope (e.g., `feat(T001): initialize PostCSS plugin structure`)
- **Documentation**: Consult `shopify-dev` for Shopify APIs and `context7` for library documentation
- **TypeScript First**: Use TypeScript (.ts) files wherever possible instead of JavaScript

## Phase 3.1: Project Setup & Configuration

- [ ] T001 Initialize lib/postcss-shopify-directive-splitter package structure with index.ts, parser.ts, generator.ts
- [ ] T002 [P] Initialize lib/shopify-decorator-system package with index.ts, decorators/, registry.ts
- [ ] T003 [P] Initialize lib/vite-plugin-performance-budget package with index.ts for budget enforcement
- [ ] T004 Configure PostCSS pipeline in postcss.config.ts with directive splitter plugin
- [ ] T005 [P] Update tsconfig.json with experimentalDecorators: true, Stage 2 decorator support, and any other necessary TypeScript configurations
- [ ] T006 [P] Configure Vite auto-imports for global decorator availability in vite.config.ts
- [ ] T007 Create frontend/entrypoints/splits/ directory for generated CSS files
- [ ] T008 [P] Update existing mise.toml with performance tasks and create bootstrap.sh script for mise installation
- [ ] QA-01 Launch QA agent to verify setup configuration (commit with `chore(QA-01): verify phase 3.1 setup`)

## Phase 3.2: Contract & Performance Tests First ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T009 [P] Contract test: PostCSS plugin processDirective() in tests/unit/postcss-plugin.test.ts
- [ ] T010 [P] Contract test: PostCSS plugin generateFiles() in tests/unit/postcss-generator.test.ts
- [ ] T011 [P] Contract test: PostCSS plugin checkBudget() in tests/unit/postcss-budget.test.ts
- [ ] T012 [P] Contract test: Decorator system Template decorator in tests/unit/decorator-template.test.ts
- [ ] T013 [P] Contract test: Decorator system LazyLoad decorator in tests/unit/decorator-lazyload.test.ts
- [ ] T014 [P] Contract test: Component registry in tests/unit/component-registry.test.ts
- [ ] T015 [P] Performance test: LCP < 2.5s mobile in tests/e2e/performance-lcp.test.ts
- [ ] T016 [P] Performance test: Total CSS < 250KB in tests/e2e/performance-css.test.ts
- [ ] T017 [P] Performance test: Critical CSS < 14KB in tests/e2e/performance-critical.test.ts
- [ ] T018 [P] Performance test: Main JS < 100KB in tests/e2e/performance-js.test.ts
- [ ] T018a [P] Performance test: TTI < 3.5s on 3G in tests/e2e/performance-tti.test.ts
- [ ] T018b [P] Performance test: FCP < 1.8s in tests/e2e/performance-fcp.test.ts
- [ ] T018c [P] Performance test: CLS < 0.1 in tests/e2e/performance-cls.test.ts
- [ ] T019 [P] Integration test: @split directive processing in tests/integration/directive-split.test.ts
- [ ] T020 [P] Integration test: @critical directive extraction in tests/integration/directive-critical.test.ts
- [ ] T021 [P] Integration test: Decorator auto-discovery in tests/integration/decorator-discovery.test.ts
- [ ] T022 [P] Integration test: Network-aware loading in tests/integration/network-aware.test.ts
- [ ] QA-02 Launch QA agent to verify all tests are written and failing (commit with `chore(QA-02): verify phase 3.2 tests`)

## Phase 3.3: Core Implementation - PostCSS Plugin (ONLY after tests are failing)

- [ ] T023 Implement directive parser for @split in lib/postcss-shopify-directive-splitter/parser.ts (check shopify-dev and context7 for existing parsers)
- [ ] T024 Implement directive parser for @critical in lib/postcss-shopify-directive-splitter/parser.ts
- [ ] T025 Implement directive parser for @inline in lib/postcss-shopify-directive-splitter/parser.ts
- [ ] T026 [P] Implement file generator for CSS splits in lib/postcss-shopify-directive-splitter/generator.ts
- [ ] T027 [P] Implement Liquid snippet generator in lib/postcss-shopify-directive-splitter/generator.ts (use shopify-dev docs for Liquid best practices)
- [ ] T028 [P] Implement performance budget checker in lib/postcss-shopify-directive-splitter/budget.ts
- [ ] T029 Implement directive validation and conflict detection in lib/postcss-shopify-directive-splitter/validator.ts
- [ ] T030 Implement main plugin with PostCSS API in lib/postcss-shopify-directive-splitter/index.ts
- [ ] T031 [P] Create content hash generation for cache busting in lib/postcss-shopify-directive-splitter/utils.ts
- [ ] QA-03 Launch QA agent to verify PostCSS plugin implementation (commit with `chore(QA-03): verify phase 3.3 postcss`)

## Phase 3.4: Core Implementation - TypeScript Decorators

- [ ] T032 [P] Implement @Template decorator in lib/shopify-decorator-system/decorators/template.ts
- [ ] T033 [P] Implement @LazyLoad decorator in lib/shopify-decorator-system/decorators/lazyload.ts
- [ ] T034 [P] Implement @Critical decorator in lib/shopify-decorator-system/decorators/critical.ts
- [ ] T035 [P] Implement @NetworkAware decorator in lib/shopify-decorator-system/decorators/network-aware.ts
- [ ] T036 [P] Implement @Debounced method decorator in lib/shopify-decorator-system/decorators/debounced.ts
- [ ] T037 [P] Implement @Cached method decorator in lib/shopify-decorator-system/decorators/cached.ts
- [ ] T038 Implement component registry with metadata storage in lib/shopify-decorator-system/registry.ts
- [ ] T039 Implement component auto-discovery with Vite glob imports in lib/shopify-decorator-system/discovery.ts
- [ ] T040 [P] Implement loading strategy calculator in lib/shopify-decorator-system/strategies.ts
- [ ] T041 [P] Implement IntersectionObserver manager for lazy loading in lib/shopify-decorator-system/observer.ts (check Alpine.js for existing observer utilities)
- [ ] T042 [P] Implement Network Information API wrapper in lib/shopify-decorator-system/network.ts
- [ ] QA-04 Launch QA agent to verify decorator system implementation (commit with `chore(QA-04): verify phase 3.4 decorators`)

## Phase 3.5: Vite & Build Integration

- [ ] T043 Integrate PostCSS plugin into Vite pipeline in vite.config.ts
- [ ] T044 Configure vite-plugin-shopify to recognize split CSS files in vite.config.ts (consult shopify-dev for plugin API)
- [ ] T045 [P] Implement performance budget plugin in lib/vite-plugin-performance-budget/index.ts
- [ ] T046 Add performance budget enforcement to Vite build in vite.config.ts
- [ ] T047 Setup HMR for directive changes without full refresh in vite.config.ts
- [ ] T048 [P] Configure source map generation for split files in vite.config.ts
- [ ] T048a Configure development-mode source maps in PostCSS pipeline for debugging
- [ ] T049 [P] Create Vite plugin for Liquid snippet generation in lib/vite-plugin-liquid-snippets/index.ts
- [ ] T050 Configure asset fingerprinting for cache busting in vite.config.ts
- [ ] QA-05 Launch QA agent to verify Vite integration (commit with `chore(QA-05): verify phase 3.5 vite`)

## Phase 3.6: Shopify Theme Integration

- [ ] T051 Update layout/theme.liquid to include critical CSS snippet
- [ ] T052 Create snippets/critical-global-css.liquid template
- [ ] T053 [P] Add template-specific CSS loading to templates/product.liquid
- [ ] T054 [P] Add template-specific CSS loading to templates/collection.liquid
- [ ] T055 [P] Add template-specific CSS loading to templates/cart.liquid
- [ ] T056 Update frontend/entrypoints/theme.scss with directive examples
- [ ] T057 [P] Create frontend/components/ProductGallery/index.ts with decorators
- [ ] T058 [P] Create frontend/components/HeaderNav/index.ts with @Critical decorator
- [ ] T059 Configure Shopify CLI to recognize generated assets in shopify.theme.toml
- [ ] T060 Add generated files to .shopifyignore patterns
- [ ] QA-06 Launch QA agent to verify Shopify theme integration (commit with `chore(QA-06): verify phase 3.6 shopify`)

## Phase 3.7: Component Migration & Testing

- [ ] T061 Migrate existing Alpine.js components to use @Template decorators (leverage Alpine.js existing features via context7)
- [ ] T062 Add @split directives to existing component styles in src/components/**/*.scss
- [ ] T063 Extract critical styles from src/css/global.css using @critical directive
- [ ] T064 [P] Test lazy loading for below-fold components on product pages
- [ ] T065 [P] Test network adaptation on slow 3G connections
- [ ] T066 [P] Validate HMR with directive changes in development
- [ ] T067 Run quickstart.md validation scenarios end-to-end
- [ ] QA-07 Launch QA agent to verify component migration and testing (commit with `chore(QA-07): verify phase 3.7 migration`)

## Phase 3.8: Performance Validation & Polish

- [ ] T068 Run Lighthouse CI on all major templates (target: score > 90)
- [ ] T069 Measure mobile LCP improvement (baseline: 7.6s, target: < 2.5s)
- [ ] T070 Measure CSS bundle reduction (baseline: 1.4MB, target: < 250KB)
- [ ] T071 [P] Create unit tests for all directive parsers in tests/unit/
- [ ] T072 [P] Create unit tests for all decorators in tests/unit/
- [ ] T073 [P] Add visual regression tests for critical CSS in tests/visual/
- [ ] T074 Update CLAUDE.md with new directive patterns and examples
- [ ] T075 Document performance metrics and improvements in specs/001-shopify-template-codesplitting/metrics.md
- [ ] T076 Create migration guide for existing themes in docs/migration.md
- [ ] T077 [P] Setup RUM collection with Web Vitals library in frontend/entrypoints/rum.ts
- [ ] T078 [P] Configure RUM data reporting to analytics endpoint
- [ ] QA-08 Launch QA agent for final validation and performance verification (commit with `chore(QA-08): verify phase 3.8 performance`)

## Dependencies

- Setup (T001-T008) must complete first
- All tests (T009-T022) must be written and failing before implementation
- PostCSS implementation (T023-T031) can run parallel with Decorators (T032-T042)
- Vite integration (T043-T050, including T048a) requires PostCSS implementation
- Shopify integration (T051-T060) requires Vite integration
- Component migration (T061-T067) requires all core implementation
- Performance validation (T068-T076) must run last

## Parallel Execution Example

```bash
# Launch contract tests together (T009-T014):
# Each agent commits with: test(T00X): add contract test for [component]
Task: "Contract test PostCSS processDirective in tests/unit/postcss-plugin.test.ts"
Task: "Contract test PostCSS generateFiles in tests/unit/postcss-generator.test.ts"
Task: "Contract test PostCSS checkBudget in tests/unit/postcss-budget.test.ts"
Task: "Contract test Template decorator in tests/unit/decorator-template.test.ts"
Task: "Contract test LazyLoad decorator in tests/unit/decorator-lazyload.test.ts"
Task: "Contract test Component registry in tests/unit/component-registry.test.ts"

# Launch performance tests together (T015-T018c):
# Each agent commits with: test(T01X): add performance test for [metric]
Task: "Performance test LCP < 2.5s in tests/e2e/performance-lcp.test.ts"
Task: "Performance test CSS < 250KB in tests/e2e/performance-css.test.ts"
Task: "Performance test Critical < 14KB in tests/e2e/performance-critical.test.ts"
Task: "Performance test JS < 100KB in tests/e2e/performance-js.test.ts"
Task: "Performance test TTI < 3.5s in tests/e2e/performance-tti.test.ts"
Task: "Performance test FCP < 1.8s in tests/e2e/performance-fcp.test.ts"
Task: "Performance test CLS < 0.1 in tests/e2e/performance-cls.test.ts"

# Launch decorator implementations together (T032-T037):
# Each agent commits with: feat(T03X): implement @[Decorator] decorator
# Agents should check context7 for Alpine.js utilities before recreating functionality
Task: "Implement @Template decorator in lib/shopify-decorator-system/decorators/template.ts"
Task: "Implement @LazyLoad decorator in lib/shopify-decorator-system/decorators/lazyload.ts"
Task: "Implement @Critical decorator in lib/shopify-decorator-system/decorators/critical.ts"
Task: "Implement @NetworkAware decorator in lib/shopify-decorator-system/decorators/network-aware.ts"
Task: "Implement @Debounced decorator in lib/shopify-decorator-system/decorators/debounced.ts"
Task: "Implement @Cached decorator in lib/shopify-decorator-system/decorators/cached.ts"
```

## Notes

- [P] tasks = different files, no shared dependencies
- TDD approach: Tests MUST fail before implementation
- Each task produces measurable improvement
- Use directives (@split, @critical) not manual file management
- Decorators are globally auto-imported (no manual imports)
- Commit often (at the end of each task, at minimum) for rollback safety.
- **Commit Convention**: Use `type(TASK-ID): description` format
  - `feat(T023)`: New feature implementation
  - `test(T009)`: Test creation
  - `chore(QA-01)`: QA verification
  - `fix(T045)`: Bug fixes
  - `docs(T074)`: Documentation updates
- **Documentation First**: Check `shopify-dev` and `context7` before implementing
- **Alpine.js Integration**: Leverage existing Alpine.js features rather than recreating them
- QA agents report findings only; fixes delegated to specialized agents
- Performance metrics tracked after each integration task

## Validation Checklist

*GATE: All must pass before marking feature complete*

- [ ] All contract tests written and passing (T009-T014)
- [ ] All performance tests passing (T015-T018c)
- [ ] All integration tests passing (T019-T022)
- [ ] PostCSS plugin processes all directive types
- [ ] TypeScript decorators auto-discovered and registered
- [ ] Vite HMR works with directive changes
- [ ] Liquid snippets generated for all critical CSS
- [ ] Performance budgets enforced in production build
- [ ] Mobile LCP < 2.5s achieved
- [ ] Total CSS < 250KB achieved
- [ ] Lighthouse score > 90 on all templates
- [ ] Quickstart scenarios validated end-to-end

---
*Tasks generated from design documents in /specs/001-shopify-template-codesplitting/*
