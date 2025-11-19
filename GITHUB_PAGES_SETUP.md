# GitHub Pages + GitHub Actions Setup Guide

This guide covers the new GitHub Pages deployment with GitHub Actions-based pipeline processing.

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Frontend (Next.js Static Export)  │
│   Hosted on GitHub Pages            │
└──────────────┬──────────────────────┘
               │ GitHub API
               ↓
┌─────────────────────────────────────┐
│   GitHub Actions Workflows          │
│   • Translation                     │
│   • Audio Generation                │
│   • M3U8 Conversion                 │
│   • Cloudflare R2 Upload            │
│   • Content Upload                  │
└──────────────┬──────────────────────┘
               │ Commits results
               ↓
┌─────────────────────────────────────┐
│   Git Repository                    │
│   • Content files                   │
│   • Audio files                     │
└─────────────────────────────────────┘
```

## Prerequisites

- GitHub account
- Node.js 18+
- Google Cloud Project (Translation + TTS APIs enabled)
- Cloudflare R2 account

## Step 1: Fork or Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/all-weather-protocol.git
cd all-weather-protocol/review-web
```

## Step 2: Configure Repository Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

| Secret Name                           | Description                         | How to Get                                    |
| ------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Base64-encoded service account JSON | See below                                     |
| `R2_ACCESS_KEY_ID`                    | Cloudflare R2 access key            | Cloudflare dashboard                          |
| `R2_SECRET_ACCESS_KEY`                | Cloudflare R2 secret key            | Cloudflare dashboard                          |
| `R2_ENDPOINT`                         | Cloudflare R2 endpoint URL          | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |

### Setting up Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable APIs:
   - Cloud Translation API
   - Cloud Text-to-Speech API
4. Create a service account:
   - Go to **IAM & Admin → Service Accounts**
   - Click **Create Service Account**
   - Grant roles:
     - Cloud Translation API User
     - Cloud Text-to-Speech API User
5. Create JSON key:
   - Click on the service account
   - Go to **Keys** tab
   - **Add Key → Create new key → JSON**
   - Download the JSON file

6. Base64 encode the JSON:

   ```bash
   # macOS/Linux
   base64 -i service-account.json | tr -d '\n'

   # Or use Node.js
   node -e "console.log(Buffer.from(require('fs').readFileSync('service-account.json')).toString('base64'))"
   ```

7. Copy the output and add as `GOOGLE_APPLICATION_CREDENTIALS_JSON` secret

### Setting up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 → Create bucket**
3. Create a bucket (e.g., "fromfedtochain")
4. Go to **Manage R2 API Tokens → Create API token**
5. Select **Admin Read & Write** permissions
6. Copy the Access Key ID and Secret Access Key
7. Get your Account ID from the R2 overview page
8. Endpoint format: `https://ACCOUNT_ID.r2.cloudflarestorage.com`

## Step 3: Create GitHub Personal Access Token

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Token name: "Review Web Pipeline"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Generate token and **copy it immediately** (you won't see it again)

## Step 4: Configure Environment Variables

Create `.env.local` in `review-web` directory:

```env
NEXT_PUBLIC_GITHUB_OWNER=YOUR_GITHUB_USERNAME
NEXT_PUBLIC_GITHUB_REPO=all-weather-protocol
NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_personal_access_token_here
```

**Important**:

- Do NOT commit this file
- It's already in `.gitignore`
- This is only for local development

## Step 5: Update Configuration

### Update `next.config.js`

If your repository name is different from "review-web", update `next.config.js`:

```javascript
basePath: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME' : '',
assetPrefix: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '',
```

### Update GitHub Client

In `src/lib/github-client.ts`, verify these match your setup:

```typescript
const REPO_OWNER =
  process.env.NEXT_PUBLIC_GITHUB_OWNER || 'YOUR_GITHUB_USERNAME';
const REPO_NAME = process.env.NEXT_PUBLIC_GITHUB_REPO || 'all-weather-protocol';
```

## Step 6: Enable GitHub Pages

1. Go to **Repository → Settings → Pages**
2. Under **Source**, select: **GitHub Actions**
3. Click **Save**

## Step 7: Deploy

### Option A: Automatic Deployment (Recommended)

Push to main branch:

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

The deployment workflow will automatically:

1. Build Next.js static export
2. Deploy to GitHub Pages

### Option B: Manual Deployment

1. Go to **Actions** tab
2. Select **Deploy to GitHub Pages**
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow**

## Step 8: Verify Deployment

After 2-3 minutes, check:

1. **Actions** tab - workflow should show ✅ green checkmark
2. Visit your site: `https://YOUR_USERNAME.github.io/review-web/`

## Using the Pipeline

### From Web Interface

1. **Navigate to review page**:

   ```
   https://YOUR_USERNAME.github.io/review-web/review
   ```

2. **Review content** and approve items

3. **Trigger pipeline**:
   - Click on approved content
   - Click "Process Pipeline" button
   - Navigate to pipeline page to monitor progress

4. **Monitor progress**:
   ```
   https://YOUR_USERNAME.github.io/review-web/pipeline/[content-id]
   ```

### Pipeline Workflows

Each workflow runs automatically via GitHub Actions:

#### 1. Translation (`pipeline-translate.yml`)

- **Trigger**: Manual or automatic after approval
- **Duration**: ~1-2 minutes
- **Output**: Translated content files in `content/*/`

#### 2. Audio Generation (`pipeline-audio.yml`)

- **Trigger**: After translation completes
- **Duration**: ~3-5 minutes per language
- **Output**: WAV files in `audio/*/`

#### 3. M3U8 Conversion (`pipeline-m3u8.yml`)

- **Trigger**: After audio generation
- **Duration**: ~2-3 minutes per language
- **Output**: M3U8 playlists + TS segments

#### 4. Cloudflare Upload (`pipeline-cloudflare.yml`)

- **Trigger**: After M3U8 conversion
- **Duration**: ~2-5 minutes
- **Output**: Files uploaded to R2, streaming URLs added

#### 5. Content Upload (`pipeline-content-upload.yml`)

- **Trigger**: After Cloudflare upload
- **Duration**: ~30-60 seconds
- **Output**: Content JSON uploaded to R2

### Manual Workflow Triggers

You can also trigger workflows manually:

1. Go to **Actions** tab
2. Select workflow (e.g., "Pipeline - Translation")
3. Click **Run workflow**
4. Enter content ID
5. Click **Run workflow** button

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build static export
npm run build

# Check types
npm run type-check

# Lint code
npm run lint
```

### Testing Changes

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. GitHub Actions will auto-deploy

## Troubleshooting

### Deployment Fails

**Error: "API routes not supported in static export"**

- Static export doesn't support API routes
- All backend logic runs in GitHub Actions
- Frontend uses GitHub API to read/write files

**Solution**: Use GitHub Actions for server-side operations

### Workflow Fails

Check the **Actions** tab for detailed logs:

1. Click on failed workflow run
2. Click on failed job
3. Expand steps to see error messages

#### Common Issues:

**Translation fails**:

```
Error: Could not load the default credentials
```

- Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` secret
- Verify it's properly base64 encoded
- Ensure no newlines in the secret value

**Audio generation fails**:

```
Error: Permission denied
```

- Verify service account has TTS permissions
- Check API is enabled in Google Cloud

**R2 upload fails**:

```
Error: Failed to configure rclone
```

- Verify R2 credentials in secrets
- Check endpoint URL format
- Ensure bucket exists

### GitHub Token Issues

**Error: "GitHub token not configured"**

In browser console, check:

```javascript
console.log(process.env.NEXT_PUBLIC_GITHUB_TOKEN);
```

- For local dev: Set in `.env.local`
- For production: User must configure in browser (not recommended) or use public readonly mode

### 404 Errors

**All pages show 404**:

1. Check `basePath` in `next.config.js` matches repo name
2. Ensure GitHub Pages source is set to "GitHub Actions"
3. Wait a few minutes for DNS propagation
4. Clear browser cache

**API calls fail**:

- API routes don't exist in static export
- Check GitHub API calls are working
- Verify CORS settings

## Advanced Configuration

### Custom Domain

To use a custom domain (e.g., `review.yoursite.com`):

1. Create `public/CNAME` file:

   ```
   review.yoursite.com
   ```

2. Update `next.config.js`:

   ```javascript
   basePath: '',  // Remove basePath
   assetPrefix: '',  // Remove assetPrefix
   ```

3. Configure DNS:
   - Add CNAME record pointing to `YOUR_USERNAME.github.io`
   - Or A records to GitHub Pages IPs

4. In repo **Settings → Pages**, add custom domain

### Environment-Specific Builds

Create different build configurations:

```javascript
// next.config.js
const isProd = process.env.NODE_ENV === 'production';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  basePath: isGitHubPages ? '/review-web' : '',
  // ...
};
```

### Monitoring

Add monitoring to track:

- Pipeline execution times
- Failure rates
- API quota usage

Example using GitHub API:

```typescript
const stats = await githubClient.getWorkflowRuns('pipeline-translate.yml', 100);
const successRate =
  stats.filter((r) => r.conclusion === 'success').length / stats.length;
```

## Security Best Practices

1. **Never commit secrets**: Use GitHub Secrets for all sensitive data
2. **Rotate tokens**: Change GitHub tokens every 90 days
3. **Limit permissions**: Use least-privilege service accounts
4. **Enable 2FA**: On GitHub and Google Cloud
5. **Review workflows**: Check Actions logs regularly
6. **Branch protection**: Require reviews for workflow changes

## Rate Limits

### GitHub API

- Authenticated: 5,000 requests/hour
- Workflow polling (10s interval): ~360 requests/hour

### Google Cloud

- Translation: 500,000 characters/100 seconds
- TTS: 100 requests/100 seconds

### GitHub Actions

- Workflow run time: 6 hours max
- Concurrent jobs: 20 (free tier)
- Storage: 500 MB artifacts

## FAQ

**Q: Can I run the pipeline locally?**
A: No, the pipeline runs in GitHub Actions. You can test individual services locally, but full pipeline requires Actions.

**Q: How long does the full pipeline take?**
A: Typically 10-15 minutes for all phases, depending on content size and languages.

**Q: Can I process multiple content items at once?**
A: Yes, trigger multiple workflows. They'll queue and run in parallel (up to concurrency limits).

**Q: Where are the files stored?**
A: Content and audio files are committed to the Git repository. Streaming files are in Cloudflare R2.

**Q: Can I use a different cloud provider?**
A: Yes, modify the workflow files to use AWS S3, Azure Blob, or Google Cloud Storage instead of R2.

## Support

- 📝 [GitHub Issues](https://github.com/YOUR_USERNAME/all-weather-protocol/issues)
- 📖 [Main Documentation](../FromFedToChain/CLAUDE.md)
- 🔧 [Workflow Logs](https://github.com/YOUR_USERNAME/all-weather-protocol/actions)

## Next Steps

- [ ] Set up email notifications for workflow failures
- [ ] Add progress webhooks for real-time updates
- [ ] Implement batch processing UI
- [ ] Add authentication for pipeline triggers
- [ ] Create admin dashboard for monitoring

---

_Last updated: 2025-01-19_
