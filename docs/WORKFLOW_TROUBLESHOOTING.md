# Workflow Trigger Troubleshooting Guide

This guide helps you debug GitHub Actions workflow trigger failures in the pipeline.

## Common Error: "Not Found" (404)

### Symptom

```
✗ Failed: Workflow trigger failed: Not Found - https://docs.github.com/rest/actions/workflows#create-a-workflow-dispatch-event
```

### Root Cause

The workflow file doesn't exist on the target branch (`main`) in your GitHub repository.

### Solutions

1. **Verify the workflow file exists on GitHub**
   - Go to: `https://github.com/YOUR_OWNER/YOUR_REPO/tree/main/.github/workflows`
   - Check if `pipeline-unified.yml` is present
   - If not, commit and push it:
     ```bash
     git add .github/workflows/pipeline-unified.yml
     git commit -m "Add unified pipeline workflow"
     git push origin main
     ```

2. **Check workflow file name**
   - Ensure the filename matches exactly (case-sensitive)
   - Verify no typos in the route files referencing the workflow

3. **Confirm you're on the correct branch**
   - The API triggers workflows on the `main` branch by default
   - If your default branch is different, update `GitHubWorkflowService.ts`

## Common Error: "Unauthorized" (401)

### Symptom

```
✗ Failed: GitHub authentication failed. Check GITHUB_TOKEN configuration
```

### Root Cause

GitHub token is missing, invalid, or expired.

### Solutions

1. **Check .env.local file**

   ```bash
   # .env.local should contain:
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_GITHUB_OWNER=your-username
   NEXT_PUBLIC_GITHUB_REPO=your-repo-name
   ```

2. **Verify token permissions**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Token needs `workflow` scope to trigger actions
   - Token needs `repo` scope to access private repositories

3. **Generate new token if expired**
   - Navigate to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `workflow`
   - Copy token and update `.env.local`

## Common Error: "Forbidden" (403)

### Symptom

```
✗ Failed: GitHub API rate limit exceeded or insufficient permissions
```

### Root Causes

1. API rate limit exceeded (60 requests/hour for unauthenticated, 5000/hour for authenticated)
2. Token lacks necessary permissions

### Solutions

1. **Check rate limit**

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.github.com/rate_limit
   ```

2. **Verify token scopes**
   - Token must have `workflow` scope
   - Token must have `repo` scope for private repos

3. **Wait for rate limit reset**
   - Check `X-RateLimit-Reset` header for reset time
   - Consider implementing request throttling

## Common Error: "Unprocessable Entity" (422)

### Symptom

```
✗ Failed: Invalid workflow inputs. Check that all required workflow inputs are provided
```

### Root Cause

Missing or invalid workflow inputs.

### Solutions

1. **Verify required inputs are provided**

   ```typescript
   // pipeline-unified.yml requires:
   await GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
     contentId: 'your-content-id', // REQUIRED
     start_stage: 'translate', // REQUIRED
     language: 'en', // OPTIONAL
   });
   ```

2. **Check workflow definition**
   - Open `.github/workflows/pipeline-unified.yml`
   - Verify `inputs` section under `workflow_dispatch`
   - Ensure all required inputs are marked correctly

3. **Validate input format**
   - `start_stage` must be one of: `translate`, `audio`, `m3u8`, `cloudflare`, `content-upload`
   - `contentId` must be a valid string

## Manual Workflow Triggering

### Via GitHub UI

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Pipeline - Unified** from the left sidebar
4. Click **Run workflow** button (top right)
5. Fill in required inputs:
   - `contentId`: The content ID to process
   - `start_stage`: Stage to start from (default: `translate`)
   - `language`: Optional language filter
6. Click **Run workflow**

### Via API (curl)

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/pipeline-unified.yml/dispatches \
  -d '{
    "ref":"main",
    "inputs":{
      "contentId":"2025-10-20-example-content",
      "start_stage":"translate"
    }
  }'
```

### Via Application

```bash
# Trigger via run-all endpoint
curl -X POST http://localhost:3000/api/pipeline/run-all

# Or via generate-audio endpoint
curl -X POST http://localhost:3000/api/pipeline/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "2025-10-20-example-content",
    "language": "en",
    "format": "wav"
  }'
```

## Verifying Workflow Exists

### Method 1: GitHub Web Interface

```
https://github.com/YOUR_OWNER/YOUR_REPO/tree/main/.github/workflows
```

Look for `pipeline-unified.yml` in the file list.

### Method 2: GitHub API

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/contents/.github/workflows/pipeline-unified.yml
```

Should return file content, not a 404.

### Method 3: Git Command Line

```bash
git ls-remote --heads origin main | grep -q . && echo "Branch exists"
git ls-tree -r main --name-only | grep pipeline-unified.yml
```

## Debugging Tips

### Enable Verbose Logging

```typescript
// In your API route
console.log('🚀 Triggering workflow:', {
  workflowId,
  inputs,
  owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
});
```

### Check Workflow Run Status

```typescript
// Get recent runs
const runs = await GitHubWorkflowService.getWorkflowRuns(
  'pipeline-unified.yml',
  10
);
console.log('Recent runs:', runs);
```

### Monitor GitHub Actions Tab

- Go to repository → Actions tab
- Filter by workflow name
- Check run status, logs, and error messages

## Still Having Issues?

### Check GitHub Actions Status

- Visit: https://www.githubstatus.com/
- Ensure GitHub Actions is operational

### Review Workflow Logs

1. Go to repository → Actions
2. Click on the workflow run
3. Expand failed jobs to see detailed logs
4. Look for error messages in red

### Check Environment Variables

```typescript
// Verify config is loaded
console.log('Config:', {
  hasToken: !!process.env.GITHUB_TOKEN,
  owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
});
```

## Migration Notes

### Old Workflow Architecture (Deprecated)

If you see references to these workflows, they've been consolidated:

- `pipeline-audio.yml` → Use `pipeline-unified.yml` with `start_stage: 'audio'`
- `pipeline-m3u8.yml` → Use `pipeline-unified.yml` with `start_stage: 'm3u8'`
- `pipeline-cloudflare.yml` → Use `pipeline-unified.yml` with `start_stage: 'cloudflare'`
- `pipeline-content-upload.yml` → Use `pipeline-unified.yml` with `start_stage: 'content-upload'`

### Why Consolidation?

- **Eliminated fragile regex extraction** from commit messages
- **Simplified debugging** - single workflow run instead of 5 separate runs
- **Better error handling** - enhanced error messages for common failure cases
- **Cleaner git history** - no stage marker commits needed

## Contact & Support

For additional help:

- Review the [Plan File](../.claude/plans/virtual-splashing-thompson.md) for implementation details
- Check [Archive README](../.github/workflows/archive/README.md) for migration information
- File an issue in the repository with workflow run URL and error logs
