# Review Web - Content Review Interface

Modern web-based review interface for the FromFedToChain content management system.

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

The app needs access to the `content/` directory from the FromFedToChain repository.

**Option A: Environment Variable (Recommended)**

Create a `.env.local` file:

```env
CONTENT_DIR=/absolute/path/to/FromFedToChain/content
```

**Option B: Default Relative Path**

By default, the app assumes FromFedToChain is a sibling directory:

```
/path/to/all-weather-protocol/
├── FromFedToChain/
│   └── content/
└── review-web/
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

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variable: `CONTENT_DIR`
4. Deploy

The app will auto-deploy on every push to main.

## Contributing

This is part of the FromFedToChain project. See the main repository for contribution guidelines.

## License

Same as FromFedToChain project.
