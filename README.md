# Review Web

Content review interface for From Fed to Chain with translation and audio pipeline integration.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Features

| Feature               | Description                                  |
| --------------------- | -------------------------------------------- |
| 📋 Review Queue       | Filter, search, and paginate pending content |
| ✅ Accept/Reject      | Submit decisions with optional feedback      |
| 📝 Category Editing   | Inline category updates                      |
| 📊 Statistics         | Review counts and analytics dashboard        |
| 📜 History            | Full audit trail of review decisions         |
| ⌨️ Keyboard Shortcuts | `j/k` navigation, `a` accept, `r` reject     |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **State**: TanStack Query
- **Testing**: Vitest + Testing Library

## Environment Setup

Copy `.env.example` to `.env.local`:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional - GitHub Workflow Integration
GITHUB_TOKEN=your-github-pat
NEXT_PUBLIC_GITHUB_OWNER=your-username
NEXT_PUBLIC_GITHUB_REPO=review-web
```

## Scripts

| Command                   | Description                     |
| ------------------------- | ------------------------------- |
| `npm run dev`             | Start development server        |
| `npm run build`           | Production build                |
| `npm run start`           | Start production server         |
| `npm run test`            | Run tests                       |
| `npm run lint`            | ESLint check                    |
| `npm run type-check`      | TypeScript validation           |
| `npm run format`          | Prettier formatting             |
| `npm run drafts:upload`   | Upload local drafts to Supabase |
| `npm run migrate:content` | Migrate content to Supabase     |

## Content Workflow

### Creating Drafts

1. Generate draft with Gemini CLI:

   ```bash
   gemini
   /write_from_url https://www.panewslab.com/xxxxx
   ```

2. Upload drafts to Supabase:

   ```bash
   npm run drafts:upload
   ```

3. Review at: https://from-fed-to-chain-reviewer.vercel.app/review

### Draft Files

Local drafts are stored in `content-drafts/` before upload:

```
content-drafts/
├── 2025-12-28-article-id.json
└── README.md
```

## API Routes

### Review Operations

| Endpoint                    | Method | Description                                                           |
| --------------------------- | ------ | --------------------------------------------------------------------- |
| `/api/review/pending`       | GET    | List pending content (supports `category`, `page`, `limit`, `search`) |
| `/api/review/[id]`          | GET    | Get content with navigation context                                   |
| `/api/review/[id]/submit`   | POST   | Submit review decision                                                |
| `/api/review/[id]/category` | PATCH  | Update content category                                               |
| `/api/review/stats`         | GET    | Review statistics                                                     |
| `/api/review/history`       | GET    | Review history (supports `reviewer`, `decision`, `page`, `limit`)     |

### Pipeline Operations

| Endpoint                    | Method | Description           |
| --------------------------- | ------ | --------------------- |
| `/api/pipeline/[id]/[step]` | POST   | Trigger pipeline step |

## Project Structure

```
review-web/
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── review/          # Review pages
│   │   └── pipeline/        # Pipeline status pages
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── review/          # Review-specific components
│   ├── lib/
│   │   ├── ContentManager.ts
│   │   ├── ContentSchema.ts
│   │   ├── KnowledgeManager.ts
│   │   ├── services/        # Pipeline services
│   │   └── supabase.ts
│   ├── hooks/               # React hooks
│   └── types/               # TypeScript definitions
├── scripts/                 # CLI utilities
├── content-drafts/          # Local draft storage
├── tests/                   # Test files
└── docs/                    # Documentation
```

## Pipeline Services

Located in `src/lib/services/`:

| Service                    | Purpose                     |
| -------------------------- | --------------------------- |
| `TranslationService.ts`    | Google Cloud Translation    |
| `AudioService.ts`          | Google Cloud Text-to-Speech |
| `M3U8ConversionService.ts` | FFmpeg HLS conversion       |
| `CloudflareR2Service.ts`   | R2 upload for streaming     |
| `ContentUploadService.ts`  | Content metadata sync       |

## Deployment

### Vercel (Recommended)

The app is deployed on Vercel with automatic deployments from `main` branch.

**Live URL**: https://from-fed-to-chain-reviewer.vercel.app

### Local Production Build

```bash
npm run build
npm run start
```

## Documentation

- [Pipeline Setup](docs/setup/pipeline.md) - FFmpeg, rclone, Google Cloud configuration
- [GitHub Pages Deployment](docs/deployment/github-pages.md) - Static deployment option
- [Workflow Troubleshooting](docs/WORKFLOW_TROUBLESHOOTING.md) - Common issues and fixes
- [Contributing](CONTRIBUTING.md) - Contribution guidelines

## License

MIT
