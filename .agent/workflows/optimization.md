---
description: Review Web Optimization Workflow (Dead Code, Coverage, Refactoring)
---

# turbo-all

**Working Directory**: `/Users/chouyasushi/htdocs/all-weather-protocol/review-web`

### 1. Remove Dead Code

Manually review for unused exports (no knip/ts-prune configured). Check:

- Unused components in `src/components/`
- Unused services in `src/lib/services/`

### 2. Validate

```bash
npm run lint:all
```

_Runs: lint → type-check_

### 3. Increase Test Coverage

```bash
npm run test:coverage
```

Analyze vitest coverage. Add tests in `tests/` directory.

### 4. Validate

```bash
npm run precommit:test
```

_Runs: type-check → test:node_

### 5. Refactor & Modularize (SOLID/DRY)

1. Extract reusable components from page components
2. Consolidate pipeline service logic
3. Apply single responsibility to API routes

### 6. Final Validation

```bash
npm run lint:all && npm run test:coverage
```

### 7. Commit

```bash
git add . && git commit -m "refactor(review-web): optimize code quality"
```
