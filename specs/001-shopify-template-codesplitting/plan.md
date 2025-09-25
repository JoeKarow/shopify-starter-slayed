
# Implementation Plan: Shopify Template Codesplitting

**Branch**: `001-shopify-template-codesplitting` | **Date**: 2025-09-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/joe/GitHub/shopify-starter-slayed/specs/001-shopify-template-codesplitting/spec.md`

## Execution Flow (/plan command scope)

```text
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Build an automated CSS/JavaScript optimization system for Shopify themes using PostCSS directive processing and TypeScript decorators, integrating with vite-plugin-shopify to achieve sub-2.5s mobile LCP through intelligent code splitting without manual file management. The system will process CSS directives (@split, @critical, @inline) and TypeScript decorators (@Template, @LazyLoad, @NetworkAware) to automatically generate template-specific bundles, extract critical CSS, and enable adaptive loading strategies based on network conditions.

## Technical Context

**Language/Version**: TypeScript 5.3.3, PostCSS 8.4.35, Vite 5.1.0
**Primary Dependencies**: vite-plugin-shopify 3.0.0, TailwindCSS v4.1.13, Alpine.js 3.13.0, LightningCSS 1.24.0, Sass
**Storage**: Shopify CDN for assets, Liquid snippets for critical CSS, frontend/entrypoints/splits for generated files
**Testing**: Vitest, Playwright, Lighthouse CI with performance budget enforcement
**Target Platform**: Shopify Online Store 2.0, Mobile-first web with 3G baseline performance
**Project Type**: web - Shopify theme with frontend focus and Vite build pipeline
**Performance Goals**: LCP<2.5s (from 7.6-10.2s), CSS<250KB (from 1.4MB), Critical<14KB, JS<100KB
**Constraints**: Mobile-first, 3G network compatible, Progressive enhancement required, No manual file management, Declarative patterns only
**Scale/Scope**: Single Shopify theme, ~50 Liquid templates, targeting sub-2.5s mobile load times
**Package Manager**: Bun for fast installs and script execution
**Task Runner**: Mise for tool version management and task orchestration

**User-Provided Architecture Context**: Custom PostCSS plugin for directive processing, TypeScript decorators with Stage 2 support (global auto-imports), Vite integration with vite-plugin-shopify, automatic Liquid snippet generation, IntersectionObserver for lazy loading, Network API for adaptive behavior, lib/ directory for future package extraction

**SCSS Processing**:

- Main entry: `frontend/entrypoints/theme.scss`
- Component styles: `frontend/components/**/styles.scss` and `src/components/**/*.scss`
- Both paths are watched and imported via `@use` or `@import` in theme.scss
- Directives work in any SCSS file in the import chain

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Performance Gates (from Constitution v1.0.0)

- [x] **Declarative Performance**: Uses directives (@split, @critical, @inline) not file management ✓
- [x] **Zero Manual Files**: No manual CSS/JS split file creation - all automated via PostCSS plugin ✓
- [x] **Performance Budget**: LCP<2.5s, CSS<250KB, Critical<14KB, JS<100KB - enforced in build ✓
- [x] **Progressive Enhancement**: Works without JavaScript - CSS-first approach with JS enhancements ✓
- [x] **Template-Aware**: Respects Shopify template routing - @Template decorator integration ✓
- [x] **Developer Experience**: Clear patterns, HMR support - Vite dev server with source maps ✓
- [x] **Measurement-Driven**: Metrics defined and trackable - Lighthouse CI automation ✓

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```text
lib/
├── postcss-shopify-directive-splitter/
│   ├── index.ts
│   ├── parser.ts
│   ├── generator.ts
│   └── test/
├── vite-plugin-performance-budget/
│   ├── index.ts
│   └── test/
└── shopify-decorator-system/
    ├── index.ts
    ├── decorators/
    ├── registry.ts
    └── test/

frontend/
├── entrypoints/
│   ├── theme.scss         # Main SCSS with directives
│   ├── theme.ts          # Main TypeScript entry
│   └── splits/           # Generated split files
├── components/           # TypeScript components with decorators
│   ├── ProductGallery/
│   │   ├── index.ts      # Component class
│   │   └── styles.scss   # Component-specific styles (imported in theme.scss)
│   └── HeaderNav/
│       ├── index.ts
│       └── styles.scss
├── decorators/          # Global decorator exports
└── styles/             # SCSS partials and utilities
    ├── _variables.scss
    ├── _mixins.scss
    └── _utilities.scss

src/
├── js/                 # Existing Alpine.js and Prodify
├── css/               # Legacy CSS (to be migrated)
└── components/        # Component SCSS files (yes, these are picked up)
    └── **/*.scss      # All SCSS in subdirs imported via @import or @use

tests/
├── unit/
├── integration/
└── e2e/

.mise.toml              # Tool versions and task definitions
```

**Structure Decision**: Shopify theme with lib/ directory for extractable plugins

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate code contracts** from functional requirements:
   - PostCSS plugin interface (TypeScript definitions)
   - Decorator system interfaces (TypeScript)
   - Build tool contracts (configuration schemas)
   - Output to `/contracts/` as `.ts` files

3. **Define plugin interfaces** in contracts:
   - Input/output types for each plugin
   - Configuration schemas
   - Error types and handling

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update CLAUDE.md incrementally** (O(1) operation):
   - Add Shopify-specific context from current plan
   - Document any new directives (@split, @critical, etc.)
   - Update performance optimization patterns
   - Document Liquid snippet generation
   - Keep focus on declarative patterns
   - Update recent changes (keep last 3)
   - Preserve existing project context

**Output**: data-model.md, /contracts/*.ts, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- PostCSS plugin implementation tasks (core functionality, directive parsers)
- TypeScript decorator system tasks (decorators, registry, auto-discovery)
- Vite integration tasks (pipeline setup, HMR support)
- Liquid template generation tasks
- Performance testing setup tasks
- Each acceptance scenario → E2E test

**Task Categories**:

1. **PostCSS Plugin Development** (5-6 tasks)
   - Create plugin structure [P]
   - Implement directive parsers [P]
   - Add file generation logic
   - Integrate with Vite pipeline

2. **TypeScript Decorators** (4-5 tasks)
   - Setup decorator configuration [P]
   - Create core decorators [P]
   - Implement registry system
   - Add auto-discovery

3. **Build Integration** (3-4 tasks)
   - Configure PostCSS pipeline
   - Setup performance budgets
   - Add Liquid snippet generation

4. **Testing Infrastructure** (4-5 tasks)
   - Unit tests for directives [P]
   - Integration tests for build [P]
   - E2E performance tests
   - Lighthouse CI setup

5. **Documentation & Validation** (2-3 tasks)
   - Update configuration files
   - Run quickstart validation
   - Performance benchmarking

**Ordering Strategy**:

- Foundation first: PostCSS plugin before decorators
- Tests alongside implementation (TDD approach)
- Integration after components complete
- Performance validation last
- Mark [P] for parallel execution where no dependencies exist

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) ✓
- [x] Phase 1: Design complete (/plan command) ✓
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✓
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✓
- [x] Post-Design Constitution Check: PASS ✓
- [x] All NEEDS CLARIFICATION resolved ✓
- [x] Complexity deviations documented (none required) ✓

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
