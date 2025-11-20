---
name: nextjs-dev-guidelines
description: Next.js 16 development guidelines for App Router with TypeScript. Modern patterns including Server/Client Components, Suspense, TanStack Query, file organization, Tailwind CSS styling, React Hook Form + Zod validation, performance optimization, and TypeScript best practices. Use when creating components, pages, API routes, or working with Next.js code.
---

# Next.js Development Guidelines

## Purpose

Comprehensive guide for modern Next.js 16 App Router development, emphasizing Server Components, Suspense-based data fetching, proper file organization, and performance optimization.

## When to Use This Skill

- Creating new components or pages
- Building new features
- Fetching data with TanStack Query
- Setting up API routes
- Styling components with Tailwind CSS
- Form handling with React Hook Form + Zod
- Performance optimization
- Organizing frontend code
- TypeScript best practices

---

## Quick Start

### New Component Checklist

Creating a component? Follow this checklist:

**Server Components (default):**

- [ ] No `"use client"` directive (Server Component by default)
- [ ] Async component for data fetching
- [ ] Direct database/API calls (no TanStack Query)
- [ ] Tailwind CSS for styling
- [ ] TypeScript props interface
- [ ] Default export at bottom

**Client Components:**

- [ ] Add `"use client"` directive at top
- [ ] Use `useSuspenseQuery` for data fetching
- [ ] Use `useCallback` for event handlers passed to children
- [ ] Wrap in `<Suspense>` boundary for loading states
- [ ] Tailwind CSS for styling
- [ ] Default export at bottom

### New Page Checklist

Creating a Next.js page? Follow this:

- [ ] Create in `src/app/{route}/page.tsx`
- [ ] Use Server Component by default
- [ ] Add metadata export for SEO
- [ ] Use Suspense for async data
- [ ] Proper error.tsx and loading.tsx files
- [ ] TypeScript page props typing

### New API Route Checklist

Creating an API route? Follow this:

- [ ] Create in `src/app/api/{route}/route.ts`
- [ ] Export named HTTP method handlers (GET, POST, etc.)
- [ ] Use `NextRequest` and `NextResponse`
- [ ] Proper error handling with try/catch
- [ ] Input validation with Zod
- [ ] Return proper HTTP status codes

### New Feature Checklist

Creating a feature? Set up this structure:

- [ ] Create `src/app/{feature}/` directory
- [ ] Create `components/` subdirectory for feature components
- [ ] Create `actions.ts` for Server Actions if needed
- [ ] Set up TypeScript types
- [ ] Use Suspense boundaries
- [ ] Create API routes if needed in `src/app/api/{feature}/`

---

## Import Patterns

```typescript
// Next.js Core
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Client Components
('use client');
import { useState, useCallback, useMemo } from 'react';

// TanStack Query (Client Components only)
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';

// Forms & Validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Styling
import { cn } from '@/lib/utils'; // Tailwind merge utility

// API Routes
import { NextRequest, NextResponse } from 'next/server';

// Custom hooks & utilities
import type { ContentMetadata } from '@/types/content';
```

---

## Key Principles

1. **Server First**: Use Server Components by default, Client Components only when needed
2. **Suspense Everywhere**: Wrap async operations in Suspense boundaries
3. **Type Safety**: Zod for runtime validation, TypeScript for compile-time
4. **Performance**: Image optimization, lazy loading, code splitting
5. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
6. **File Colocation**: Keep related files close in the file system

---

## Common Patterns

### Server Component Data Fetching

```typescript
export default async function Page() {
  const data = await fetchData(); // Direct async/await
  return <div>{data.title}</div>;
}
```

### Client Component with Suspense

```typescript
"use client";
export function Component() {
  const { data } = useSuspenseQuery({ ... });
  return <div>{data.title}</div>;
}
```

### Form Handling

```typescript
'use client';
const form = useForm({
  resolver: zodResolver(schema),
});
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['accept', 'reject']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    // Process...
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}
```

---

**Remember**: Start with Server Components, only add `"use client"` when you need:

- Hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party libraries that require client (TanStack Query, etc.)
