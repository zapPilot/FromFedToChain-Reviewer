# Contributing to Review Web

Thank you for your interest in contributing to Review Web! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/YOUR_USERNAME/all-weather-protocol.git`
3. **Install dependencies**: `cd review-web && npm install`
4. **Create a branch**: `git checkout -b feature/your-feature-name`

## Development Workflow

### 1. Set Up Local Environment

```bash
# Copy environment template
cp .env.example .env.local

# Configure content directory
echo "CONTENT_DIR=../FromFedToChain/content" >> .env.local

# Start development server
npm run dev
```

### 2. Make Your Changes

- Follow the existing code style
- Write meaningful commit messages
- Add tests if applicable
- Update documentation as needed

### 3. Code Quality

Before submitting:

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Run tests
npm run test

# Format code
npm run format
```

### 4. Submit Pull Request

1. Push to your fork
2. Create a pull request to the main repository
3. Fill out the PR template
4. Wait for review

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types from `src/types/`

### React/Next.js

- Use **Server Components** by default
- Add `'use client'` only when needed (hooks, event handlers)
- Use `async/await` in Server Components for data fetching
- Use TanStack Query in Client Components

### File Organization

```
src/
├── app/
│   ├── api/                 # API routes
│   │   └── [feature]/
│   └── [feature]/           # Pages
│       ├── page.tsx         # Server Component
│       └── components/      # Feature-specific components
├── components/
│   ├── ui/                  # Reusable UI components (shadcn/ui)
│   └── [feature]/           # Feature components
├── lib/
│   ├── services/            # Backend services
│   └── utils/               # Utility functions
└── types/                   # TypeScript types
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve review submission bug
docs: update setup guide
chore: upgrade dependencies
```

## Areas for Contribution

### 🐛 Bug Fixes

- Check [Issues](https://github.com/chouyasushi/all-weather-protocol/issues) for bugs
- Reproduce the issue locally
- Fix and add regression test
- Submit PR with clear description

### ✨ New Features

- Discuss in Issues first
- Follow existing patterns
- Add tests and documentation
- Update relevant docs

### 📚 Documentation

- Fix typos and unclear sections
- Add examples and use cases
- Improve setup instructions
- Write guides for new features

### 🧪 Testing

- Add missing test coverage
- Write integration tests
- Improve test utilities
- Document testing patterns

## Project Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Fly.io

### Key Concepts

1. **Server Components First**: Use Server Components for data fetching, Client Components for interactivity
2. **API Routes**: RESTful endpoints in `src/app/api/`
3. **Content Manager**: Reads from local content directory or Supabase
4. **Status Tracking**: Supabase database (review state, pipeline progress)

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Writing Tests

Place tests next to the files they test:

```
src/lib/ContentManager.ts
src/lib/ContentManager.test.ts
```

Use Vitest for unit/integration tests.

## Documentation

### Updating Docs

- **README.md**: Overview, quick start, features
- **DEPLOYMENT.md**: Deployment guide (symlink to docs/deployment/flyio.md)
- **docs/setup/pipeline.md**: Pipeline configuration
- **docs/deployment/**: Platform-specific guides

### Adding New Docs

1. Create in appropriate `docs/` subdirectory
2. Link from README.md
3. Follow existing formatting
4. Add table of contents for long docs

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/chouyasushi/all-weather-protocol/discussions)
- **Bugs**: Create an [Issue](https://github.com/chouyasushi/all-weather-protocol/issues)
- **Ideas**: Start a [Discussion](https://github.com/chouyasushi/all-weather-protocol/discussions)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
