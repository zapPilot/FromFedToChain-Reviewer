# review-web Setup Guide

## Prerequisites

### 1. System Dependencies

Install the following tools on your system:

#### FFmpeg (Required for audio processing)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

#### rclone (Required for Cloudflare R2 uploads)
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version
```

### 2. Configure rclone for Cloudflare R2

```bash
rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id=YOUR_ACCESS_KEY \
  secret_access_key=YOUR_SECRET_KEY \
  endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  region=auto
```

Verify configuration:
```bash
rclone lsd r2:
```

### 3. Google Cloud Setup

1. Create a Google Cloud Project
2. Enable the following APIs:
   - Cloud Text-to-Speech API
   - Cloud Translation API
3. Create a service account with the following roles:
   - Cloud Translation API User
   - Cloud Text-to-Speech API User
4. Download the service account JSON key
5. Save it as `service-account.json` in the project root

## Installation

### 1. Install Node.js Dependencies

```bash
cd review-web
npm install
```

This will install all required dependencies including:
- `@google-cloud/text-to-speech` - Google TTS
- `@google-cloud/translate` - Google Translation
- `@aws-sdk/client-s3` - Cloudflare R2 (S3 compatible)
- `fluent-ffmpeg` - FFmpeg wrapper for audio processing
- Next.js and React dependencies

### 2. Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the following:

```bash
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Content & Knowledge Directories
CONTENT_DIR=./content
AUDIO_ROOT=./audio
KNOWLEDGE_DIR=./knowledge

# Cloudflare R2 Configuration
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket-url.r2.dev

# Optional: Claude API for social hooks
ANTHROPIC_API_KEY=your-claude-api-key-here
```

### 3. Copy Service Account Key

Place your Google Cloud service account JSON file in the project root:
```bash
cp /path/to/your/service-account.json ./service-account.json
```

**Important**: Ensure `service-account.json` is listed in `.gitignore` to avoid committing credentials.

### 4. Initialize Directory Structure

The migration has already copied the following directories from FromFedToChain:
- `content/` - Content files organized by language and category
- `audio/` - Generated audio files
- `knowledge/` - Knowledge concepts and relationships
- `public/guidelines/` - Writing guidelines

If these directories are missing, copy them from FromFedToChain:
```bash
cp -r ../FromFedToChain/content ./
cp -r ../FromFedToChain/audio ./
cp -r ../FromFedToChain/knowledge ./
mkdir -p public/guidelines
cp -r ../FromFedToChain/guidelines/* public/guidelines/
```

## Running the Application

### Development Mode

```bash
npm run dev
```

Access the application at: http://localhost:3000

### Production Build

```bash
npm run build
npm run start
```

## Testing the Migration

### 1. Test Knowledge Management API

```bash
# List all concepts
curl http://localhost:3000/api/knowledge/concepts

# Search concepts
curl "http://localhost:3000/api/knowledge/concepts?query=crypto"

# Get specific concept
curl http://localhost:3000/api/knowledge/concepts/[concept-id]

# Get knowledge stats
curl http://localhost:3000/api/knowledge/stats
```

### 2. Test Review API

```bash
# Get pending content for review
curl http://localhost:3000/api/review/pending

# Get specific content
curl http://localhost:3000/api/review/[content-id]

# Get review stats
curl http://localhost:3000/api/review/stats
```

### 3. Test Pipeline API

```bash
# Get content needing translation
curl http://localhost:3000/api/pipeline/translate

# Translate content (POST)
curl -X POST http://localhost:3000/api/pipeline/translate \
  -H "Content-Type: application/json" \
  -d '{"contentId": "2025-06-30-bitcoin-news", "targetLanguage": "en-US"}'

# Generate audio (POST)
curl -X POST http://localhost:3000/api/pipeline/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"contentId": "2025-06-30-bitcoin-news", "language": "en-US", "format": "wav"}'

# Upload to R2 (POST)
curl -X POST http://localhost:3000/api/pipeline/upload \
  -H "Content-Type: application/json" \
  -d '{"contentId": "2025-06-30-bitcoin-news", "language": "en-US", "format": "both"}'

# Process full pipeline (POST)
curl -X POST http://localhost:3000/api/pipeline/process \
  -H "Content-Type: application/json" \
  -d '{"contentId": "2025-06-30-bitcoin-news"}'
```

## Directory Structure

```
review-web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── knowledge/         # Knowledge Management API
│   │   │   ├── pipeline/          # Pipeline Processing API
│   │   │   └── review/            # Review API
│   │   └── review/                # Review UI Pages
│   ├── components/
│   │   ├── knowledge/             # Knowledge UI Components
│   │   └── review/                # Review UI Components
│   ├── lib/
│   │   ├── services/              # Backend Services
│   │   │   ├── AudioService.ts
│   │   │   ├── CloudflareR2Service.ts
│   │   │   ├── ContentPipelineService.ts
│   │   │   ├── GoogleTTSService.ts
│   │   │   ├── M3U8AudioService.ts
│   │   │   ├── SocialService.ts
│   │   │   └── TranslationService.ts
│   │   ├── ContentManager.ts
│   │   ├── ContentSchema.ts
│   │   └── KnowledgeManager.ts
│   └── types/
│       ├── content.ts
│       └── knowledge.ts
├── content/                       # Content files (shared)
├── audio/                         # Audio files (shared)
├── knowledge/                     # Knowledge base (shared)
├── public/
│   └── guidelines/                # Writing guidelines
├── service-account.json           # Google Cloud credentials (git-ignored)
├── .env.local                     # Environment variables (git-ignored)
└── package.json
```

## Troubleshooting

### FFmpeg Not Found
```
Error: ffmpeg not found
```
**Solution**: Install FFmpeg using your package manager

### rclone Not Configured
```
Error: remote "r2" not found
```
**Solution**: Configure rclone for Cloudflare R2 (see Prerequisites)

### Google Cloud Authentication Failed
```
Error: Google Cloud authentication failed
```
**Solution**:
1. Verify `service-account.json` exists in project root
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` in `.env.local` points to the file
3. Ensure the service account has the required API roles

### Content Directory Not Found
```
Error: ENOENT: no such file or directory
```
**Solution**: Copy content directories from FromFedToChain (see Installation step 4)

## API Documentation

### Knowledge Management API

- `GET /api/knowledge/concepts` - List/search concepts
- `GET /api/knowledge/concepts/[id]` - Get concept details
- `GET /api/knowledge/stats` - Get knowledge base statistics

### Pipeline API

- `POST /api/pipeline/translate` - Translate content
- `POST /api/pipeline/generate-audio` - Generate audio files
- `POST /api/pipeline/upload` - Upload to Cloudflare R2
- `POST /api/pipeline/process` - Process full pipeline
- `GET /api/pipeline/process?contentId=...` - Get pipeline status

### Review API

- `GET /api/review/pending` - Get pending content
- `GET /api/review/[id]` - Get content by ID
- `POST /api/review/[id]/submit` - Submit review
- `PUT /api/review/[id]/category` - Update category
- `GET /api/review/stats` - Get review statistics
- `GET /api/review/history` - Get review history

## Next Steps

1. **Install Dependencies**: Run `npm install`
2. **Configure Environment**: Set up `.env.local` with your credentials
3. **Test APIs**: Use the curl commands above to verify functionality
4. **Review UI**: Access http://localhost:3000/review to use the web interface
5. **Process Content**: Use the pipeline API to translate and generate audio

## Migration Notes

This application is the result of migrating code review and content management functionality from FromFedToChain. The Flutter mobile app remains in FromFedToChain, while all web-based review and pipeline processing has been moved here.

**What was migrated**:
- Knowledge Management System
- Translation Service
- Audio Generation Services (TTS, M3U8)
- Cloudflare R2 Upload Service
- Social Media Hook Generation
- Content Pipeline Orchestration
- All API routes for the above services

**What remains in FromFedToChain**:
- Flutter mobile/web app for audio playback
- Mobile-specific UI and audio streaming features
