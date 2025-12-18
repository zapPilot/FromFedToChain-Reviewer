# Archived Pipeline Workflows

## Migration Date

2025-12-18

## Reason for Archival

These workflows were consolidated into a single unified pipeline workflow (`pipeline-unified.yml`) to:

- Eliminate fragile contentId extraction from commit messages
- Simplify debugging with single workflow run view
- Reduce maintenance overhead (5 YAML files → 1)
- Improve reliability by removing regex-based state passing

## Archived Workflows

### Individual Stage Workflows (Old Architecture)

- `pipeline-translate.yml` - Translation stage (entry point)
- `pipeline-audio.yml` - Audio generation stage
- `pipeline-m3u8.yml` - M3U8 conversion stage
- `pipeline-cloudflare.yml` - Cloudflare R2 upload stage
- `pipeline-content-upload.yml` - Content metadata upload stage

### Old Architecture Pattern

```
run-all API → triggers Translation
  ↓ commits "Translation: X" + workflow_run trigger
Audio (extracts X via regex) → commits "Audio generation: X"
  ↓ workflow_run trigger
M3U8 (extracts X via regex) → commits "M3U8 conversion: X"
  ↓ workflow_run trigger
Cloudflare (extracts X via regex) → commits "Cloudflare R2 upload: X"
  ↓ workflow_run trigger
Content-Upload (extracts X via regex) → commits "Content upload complete: X"
```

**Issues with old approach:**

- ContentId extraction from commit messages was brittle (regex failures)
- Hard to debug across 5 separate workflow runs
- Commit message pollution with stage markers
- Complex mental model with workflow_run triggers

### New Architecture (Unified)

```
run-all API → triggers pipeline-unified.yml
  ↓
Single workflow with sequential jobs:
  - translate
  - audio (needs: translate)
  - m3u8 (needs: audio)
  - cloudflare (needs: m3u8)
  - content-upload (needs: cloudflare)
```

**Benefits:**

- Direct contentId passing (no regex extraction)
- Single workflow run shows all stages
- Cleaner git history
- Stage restart capability via workflow_dispatch inputs

## How to Restore Old Workflows (if needed)

If you need to temporarily revert to the old multi-workflow architecture:

1. Move workflows from this archive directory back to `.github/workflows/`
2. Revert changes in `src/app/api/pipeline/run-all/route.ts`:
   - Change `pipeline-unified.yml` back to `pipeline-translate.yml`
   - Remove `start_stage` parameter
3. Disable or delete `pipeline-unified.yml`

## Migration Validation Checklist

Before permanently removing old workflows, ensure:

- [x] Unified workflow created with all 5 stages
- [x] Run-all endpoint updated to trigger unified workflow
- [x] Generate-audio endpoint updated to use unified workflow
- [x] Upload endpoint updated to use unified workflow
- [x] Unified workflow committed and pushed to main branch
- [x] Old workflows removed from filesystem (archived)
- [x] Better error handling added (404, 401, 403, 422)
- [x] GitHub constants updated to reference unified workflow
- [ ] Manual testing: Trigger workflow via GitHub UI
- [ ] Automatic testing: Run via run-all API endpoint
- [ ] Failure testing: Verify rollback works at each stage
- [ ] Stage restart testing: Test start_stage parameter
- [ ] Monitor first few production runs for issues

## Files Modified

**Created:**

- `.github/workflows/pipeline-unified.yml` - New unified workflow

**Modified:**

- `src/app/api/pipeline/run-all/route.ts` - Updated to trigger unified workflow

**To be archived (after validation):**

- `.github/workflows/pipeline-translate.yml`
- `.github/workflows/pipeline-audio.yml`
- `.github/workflows/pipeline-m3u8.yml`
- `.github/workflows/pipeline-cloudflare.yml`
- `.github/workflows/pipeline-content-upload.yml`
