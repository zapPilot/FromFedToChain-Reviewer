# Scripts Directory

This directory contains utility scripts for content management, database operations, and CI/CD pipeline stages.

## Script Categories

### 1. Pipeline Scripts (GitHub Actions)

Scripts executed automatically by `.github/workflows/pipeline-unified.yml`:

- **`run-translation.ts`** - Translates content using Google Cloud Translation API
- **`run-audio-generation.ts`** - Generates audio files from translated text using Text-to-Speech
- **`run-m3u8-conversion.ts`** - Converts WAV audio files to M3U8 streaming format
- **`run-cloudflare-upload.ts`** - Uploads M3U8 files to Cloudflare R2 storage
- **`run-content-upload.ts`** - Uploads content JSON metadata to R2

### 2. NPM Scripts (package.json)

Scripts invoked via npm commands:

- **`migrate-content-to-supabase.ts`** - One-time migration from Git JSON files to Supabase
  - Command: `npm run migrate:content`
  - Purpose: Database initialization and historical data import

- **`upload-drafts.ts`** - Batch upload draft content to Supabase
  - Command: `npm run drafts:upload`
  - Purpose: Upload content from `content-drafts/` directory

### 3. Configuration-Driven Scripts

Scripts not in package.json but invoked programmatically by external configurations:

- **`create-draft.ts`** - Creates content drafts programmatically
  - Used by: Prompts defined in `write_from_url.toml`
  - Purpose: Generate structured JSON drafts from AI-assisted workflows
  - Can also be run directly: `npx tsx scripts/create-draft.ts <input.json>`

## Usage Patterns

### Pipeline Scripts

Automatically executed by GitHub Actions when workflow is triggered manually with a content ID.
These scripts:

- Read from Supabase
- Process content through various stages
- Update status back to Supabase
- Handle errors gracefully with status rollback

### Manual Scripts

Run locally for content management tasks:

```bash
# Create a draft (via JSON input)
npx tsx scripts/create-draft.ts input.json

# Upload drafts to Supabase
npm run drafts:upload

# Run one-time migration (historical)
npm run migrate:content
```

## Environment Variables

Most scripts require these environment variables (from `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Related Files

- **`.github/scripts/check-stage-completion.sh`** - Shell script for checking pipeline stage completion
- **`.github/workflows/pipeline-unified.yml`** - Main pipeline workflow configuration
- **`package.json`** - NPM script definitions

## Adding New Scripts

When adding new scripts, categorize them appropriately:

1. **Pipeline scripts**: Reference in workflow YAML files
2. **NPM scripts**: Add to `package.json` scripts section
3. **Configuration-driven**: Document in this README and add inline comments
4. **One-time utilities**: Mark clearly as migration/setup scripts

## Maintenance Notes

- Migration scripts can be archived after successful execution
- Deprecated scripts should be removed promptly to avoid confusion
- All scripts should include clear error messages and usage instructions
