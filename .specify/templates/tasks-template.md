# Performance Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/
**Performance Baseline**: [Current metrics before implementation]

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Performance Setup

- [ ] T001 Configure performance budget in build tools (CSS<250KB, JS<100KB)
- [ ] T002 Setup Lighthouse CI with minimum score 90
- [ ] T003 [P] Configure PostCSS directive processing (@split, @critical, @inline)
- [ ] T004 [P] Setup TypeScript decorators (@Template, @LazyLoad, @Critical)

## Phase 3.2: Performance Tests First ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T005 [P] Performance test: LCP < 2.5s on mobile
- [ ] T006 [P] Performance test: Total CSS < 250KB
- [ ] T007 [P] Performance test: Critical CSS < 14KB per template
- [ ] T008 [P] Performance test: Main JS bundle < 100KB
- [ ] T009 Progressive enhancement test: Works without JavaScript

## Phase 3.3: Directive Implementation (ONLY after tests are failing)

- [ ] T010 [P] Implement @split directive in PostCSS plugin
- [ ] T011 [P] Implement @critical directive for inline CSS
- [ ] T012 [P] Implement @inline directive for Liquid snippets
- [ ] T013 [P] Implement @Template decorator for components
- [ ] T014 [P] Implement @LazyLoad decorator for viewport loading
- [ ] T015 Template-specific CSS generation
- [ ] T016 Network-aware loading strategies

## Phase 3.4: Shopify Integration

- [ ] T017 Integrate with vite-plugin-shopify asset pipeline
- [ ] T018 Generate Liquid snippets for critical CSS
- [ ] T019 Template detection and routing
- [ ] T020 Section Rendering API compatibility
- [ ] T021 CDN asset fingerprinting

## Phase 3.5: Performance Validation

- [ ] T022 Measure mobile LCP improvement (target: 7.6s → 2.5s)
- [ ] T023 Measure CSS bundle reduction (target: 1.4MB → 250KB)
- [ ] T024 Run Lighthouse CI (target: score > 90)
- [ ] T025 Test on slow 3G network
- [ ] T026 Visual regression tests for critical styles
- [ ] T027 Update performance metrics documentation

## Dependencies

- Performance setup (T001-T004) before all tests
- Performance tests (T005-T009) before implementation
- Directive implementation (T010-T016) before Shopify integration
- All implementation before validation (T022-T027)

## Parallel Example

```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify performance tests fail before implementing
- Measure performance impact after each task
- Use directives, not manual file management
- Commit after each measurable improvement

## Task Generation Rules

*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist

*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
