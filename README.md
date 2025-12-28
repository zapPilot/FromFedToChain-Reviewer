# Review Web - Content Review Interface

Modern web-based review interface for content management with integrated translation and audio processing pipeline.

## Quick Start

Get up and running in 5 minutes!

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open browser
open http://localhost:3000
```

That's it! The app will use the default content directory (`./content`).

> **Need custom setup?** See [Setup](#setup) below or check [docs/setup/pipeline.md](docs/setup/pipeline.md) for full pipeline configuration.

## Features

- 📋 Review queue with filtering and search
- ✅ Accept/reject content with feedback
- 📝 Inline category editing
- 📊 Review statistics dashboard
- 📜 Review history tracking
- ⌨️ Keyboard shortcuts for navigation
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form + Zod
- **UI Components**: shadcn/ui

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Content Directory

The app stores content in the local `content/` directory or Supabase.

**Option A: Environment Variable (Optional)**

Create a `.env.local` file to customize the content directory:

```env
CONTENT_DIR=/absolute/path/to/content
```

**Option B: Default Path**

By default, the app uses `./content` in the review-web directory:

```
/path/to/review-web/
├── content/
└── src/
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

- `GET /api/review/pending` - List pending content for review
  - Query params: `category`, `page`, `limit`, `search`
- `GET /api/review/[id]` - Get single content with navigation
- `POST /api/review/[id]/submit` - Submit review decision
  - Body: `{ action: "accept" | "reject", feedback: string, newCategory?: string }`
- `PATCH /api/review/[id]/category` - Update content category
  - Body: `{ category: string }`
- `GET /api/review/stats` - Get review statistics
- `GET /api/review/history` - Get review history
  - Query params: `reviewer`, `decision`, `page`, `limit`

## Development Roadmap

### Phase 1: MVP (Current)

- [x] Project setup with TypeScript and Tailwind
- [x] API routes for review operations
- [ ] Review queue page UI
- [ ] Content detail/review page UI
- [ ] Basic keyboard shortcuts
- [ ] Testing with real data

### Phase 2: Enhanced Features

- [ ] Authentication with NextAuth.js
- [ ] Multi-user support
- [ ] Advanced filtering and search
- [ ] Review analytics dashboard
- [ ] Dark mode toggle

### Phase 3: Advanced

- [ ] Real-time collaboration
- [ ] Commenting and discussions
- [ ] Pipeline status integration
- [ ] Admin panel

## Project Structure

```
review-web/
├── src/
│   ├── app/
│   │   ├── api/review/          # API routes
│   │   ├── review/              # Review pages
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Home (redirects to /review)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   └── review/              # Custom review components
│   ├── lib/
│   │   ├── ContentManager.ts    # Content CRUD operations
│   │   ├── ContentSchema.ts     # Schema utilities
│   │   └── utils.ts             # Helper functions
│   ├── hooks/                   # Custom React hooks
│   └── types/
│       └── content.ts           # TypeScript types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

Choose your deployment platform:

- **Fly.io** (Recommended) - Full-stack deployment with Supabase
  - See [DEPLOYMENT.md](DEPLOYMENT.md) or [docs/deployment/flyio.md](docs/deployment/flyio.md)
  - Supports all features including API routes and pipeline
  - Free tier available

- **GitHub Pages** - Static deployment with GitHub Actions
  - See [docs/deployment/github-pages.md](docs/deployment/github-pages.md)
  - Pipeline runs via GitHub Actions
  - Free for public repositories

## Documentation

- **[Quick Start](#quick-start)** - Get running in 5 minutes
- **[Pipeline Setup](docs/setup/pipeline.md)** - FFmpeg, rclone, Google Cloud configuration
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to Fly.io with Supabase
- **[GitHub Pages Setup](docs/deployment/github-pages.md)** - Alternative static deployment
- **[API Reference](#api-routes)** - Complete API documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License

## For generating drafts

1. `gemini` , and then `/write_from_url https://www.panewslab.com/xxxxx`
2. `npm run drafts:upload`
3. visit https://from-fed-to-chain-reviewer.vercel.app/review
