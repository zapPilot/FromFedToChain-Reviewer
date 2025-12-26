# Content Drafts

This directory is for draft content that will be uploaded to Supabase.

## File Format

Create JSON files with the following structure:

```json
{
  "id": "2025-12-25-bitcoin-analysis",
  "category": "daily-news",
  "title": "Bitcoin Price Analysis",
  "content": "Full content body here...",
  "references": ["Source 1", "Source 2"],
  "framework": "万维钢风格.md"
}
```

### Required Fields

- **id**: Unique identifier (format: `YYYY-MM-DD-slug`)
- **category**: One of: `daily-news`, `ethereum`, `macro`, `startup`, `ai`, `defi`
- **title**: Content title
- **content**: Full content body

### Optional Fields

- **references**: Array of source references (default: `[]`)
- **framework**: Template framework name (default: `''`)

### Auto-populated Fields

These fields are automatically populated by the system (no need to include them):

- **language**: Always `'zh-TW'` (Chinese Traditional - source language)
- **status**: `'draft'`
- **date**: Extracted from id or current date
- **updated_at**: Current timestamp
- **feedback**: `{ content_review: null }`

## Upload Process

1. **Create**: Place your JSON files in this directory
2. **Upload**: Run `npm run drafts:upload`
3. **Success**: Successfully uploaded files are automatically deleted
4. **Failures**: Failed validations are moved to `failed/` directory with error details
5. **Duplicates**: Existing content (same id) will be skipped and reported

## Categories

- **daily-news**: Daily News (📰)
- **ethereum**: Ethereum (⚡)
- **macro**: Macro Economics (📊)
- **startup**: Startup (🚀)
- **ai**: AI (🤖)
- **defi**: DeFi (💎)

## Error Handling

If a file fails validation:

- The file is moved to `content-drafts/failed/`
- An `.error` file is created with the error details
- Fix the issue and move the file back to `content-drafts/` to retry

## Example

```json
{
  "id": "2025-12-25-ethereum-merge",
  "category": "ethereum",
  "title": "Understanding the Ethereum Merge",
  "content": "The Ethereum Merge represents a significant milestone...",
  "references": [
    "https://ethereum.org/en/roadmap/merge/",
    "Vitalik Buterin's blog post"
  ],
  "framework": "万维钢风格.md"
}
```

Run `npm run drafts:upload` and this file will be uploaded to Supabase with all fields auto-populated.
