/**
 * Upload draft content from content-drafts/ directory to Supabase
 *
 * Usage:
 *   npm run drafts:upload
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *
 * This script:
 * 1. Scans content-drafts/ for JSON files
 * 2. Checks for duplicates in Supabase (id, language='zh-TW')
 * 3. Uploads new content using ContentManager.createSource()
 * 4. Deletes successfully uploaded files
 * 5. Moves validation failures to failed/ directory
 */

import fs from 'fs/promises';
import path from 'path';
import { ContentManager } from '@/lib/ContentManager';
import { Category } from '@/types/content';
import { getSupabaseAdmin } from '@/lib/supabase';

const DRAFTS_DIR = './content-drafts';
const FAILED_DIR = './content-drafts/failed';

interface DraftFile {
  filePath: string;
  fileName: string;
  id: string;
  data: DraftContent;
}

interface DraftContent {
  id: string;
  category: Category;
  title: string;
  content: string;
  references?: string[];
  framework?: string;
}

interface ProcessResult {
  uploaded: string[];
  skipped: string[];
  failed: Array<{ file: string; error: string }>;
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

/**
 * Scan content-drafts/ directory for JSON files
 */
async function scanDraftsDirectory(): Promise<DraftFile[]> {
  const files: DraftFile[] = [];

  try {
    // Check if directory exists
    try {
      await fs.access(DRAFTS_DIR);
    } catch {
      console.log('📂 content-drafts/ directory not found. Creating it...');
      await fs.mkdir(DRAFTS_DIR, { recursive: true });
      return [];
    }

    const dirContents = await fs.readdir(DRAFTS_DIR);
    const jsonFiles = dirContents.filter(
      (f) => f.endsWith('.json') && !f.startsWith('upload-log-')
    );

    for (const fileName of jsonFiles) {
      const filePath = path.join(DRAFTS_DIR, fileName);

      // Check if it's a file (not a directory)
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content) as DraftContent;

        // Basic validation
        if (!data.id) {
          console.warn(`⚠️  Skipping ${fileName}: Missing 'id' field`);
          await moveToFailed(fileName, 'Missing required field: id');
          continue;
        }

        files.push({
          filePath,
          fileName,
          id: data.id,
          data,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Invalid JSON format';
        console.warn(`⚠️  Skipping ${fileName}: ${errorMsg}`);
        await moveToFailed(fileName, errorMsg);
      }
    }
  } catch (error) {
    throw new Error(`Failed to scan drafts directory: ${error}`);
  }

  return files;
}

/**
 * Query Supabase for existing zh-TW content IDs
 */
async function getExistingIds(): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdmin()
    .from('content')
    .select('id')
    .eq('language', 'zh-TW');

  if (error) {
    throw new Error(`Failed to query existing content: ${error.message}`);
  }

  return new Set(data?.map((c) => c.id) || []);
}

/**
 * Move file to failed/ directory with error details
 */
async function moveToFailed(fileName: string, errorMsg: string): Promise<void> {
  await fs.mkdir(FAILED_DIR, { recursive: true });

  const sourcePath = path.join(DRAFTS_DIR, fileName);
  const targetPath = path.join(FAILED_DIR, fileName);
  const errorPath = `${targetPath}.error`;

  try {
    await fs.rename(sourcePath, targetPath);
    await fs.writeFile(errorPath, errorMsg, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Failed to move ${fileName} to failed/ directory`);
  }
}

/**
 * Upload a single draft file to Supabase
 */
async function uploadDraft(draft: DraftFile): Promise<void> {
  const { data } = draft;

  // Upload using ContentManager (includes validation)
  await ContentManager.createSource(
    data.id,
    data.category,
    data.title,
    data.content,
    data.references || [],
    data.framework || ''
  );
}

/**
 * Process all draft files
 */
async function processUploads(
  drafts: DraftFile[],
  existingIds: Set<string>
): Promise<ProcessResult> {
  const result: ProcessResult = {
    uploaded: [],
    skipped: [],
    failed: [],
  };

  let uploadCount = 0;

  for (const draft of drafts) {
    // Check for duplicates
    if (existingIds.has(draft.id)) {
      result.skipped.push(draft.fileName);
      console.log(`  ⏭️  Skipping duplicate: ${draft.fileName}`);
      continue;
    }

    try {
      await uploadDraft(draft);

      // Success - delete file
      await fs.unlink(draft.filePath);
      result.uploaded.push(draft.fileName);
      uploadCount++;
      console.log(
        `  ✓ [${uploadCount}/${drafts.length - result.skipped.length}] ${draft.fileName}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Validation error - move to failed
      if (
        errorMsg.includes('Invalid') ||
        errorMsg.includes('Missing') ||
        errorMsg.includes('required')
      ) {
        await moveToFailed(draft.fileName, errorMsg);
        result.failed.push({ file: draft.fileName, error: errorMsg });
        console.log(`  ❌ ${draft.fileName} - ${errorMsg}`);
      } else {
        // Upload error - keep file for retry
        result.failed.push({ file: draft.fileName, error: errorMsg });
        console.log(`  ❌ ${draft.fileName} - Upload failed: ${errorMsg}`);
      }
    }
  }

  return result;
}

/**
 * Print summary report
 */
function printSummary(result: ProcessResult, totalFiles: number): void {
  console.log('\n════════════════════════════════════════');
  console.log('📊 Upload Summary');
  console.log('════════════════════════════════════════');
  console.log(`Total files:        ${totalFiles}`);
  console.log(`✅ Uploaded:        ${result.uploaded.length}`);
  console.log(`⏭️  Skipped (dup):  ${result.skipped.length}`);
  console.log(`❌ Failed:          ${result.failed.length}`);

  if (result.skipped.length > 0) {
    console.log('\nSkipped (duplicates):');
    result.skipped.forEach((file) => console.log(`  - ${file}`));
  }

  if (result.failed.length > 0) {
    console.log('\nFailed files:');
    result.failed.forEach(({ file, error }) => {
      console.log(`  - ${file}`);
      console.log(`    → Error: ${error.split('\n')[0]}`);
      if (
        error.includes('Invalid') ||
        error.includes('Missing') ||
        error.includes('required')
      ) {
        console.log(`    → Moved to: content-drafts/failed/`);
      } else {
        console.log(`    → Kept for retry`);
      }
    });
  }

  console.log('\n✨ Upload complete!');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting draft content upload...\n');

  // Phase 1: Initialization
  validateEnvironment();

  // Phase 2: File Discovery
  console.log('📂 Scanning content-drafts/ directory...');
  const drafts = await scanDraftsDirectory();

  if (drafts.length === 0) {
    console.log('✓ No draft files found in content-drafts/');
    console.log('\n💡 Add JSON files to content-drafts/ to upload content');
    return;
  }

  console.log(`✓ Found ${drafts.length} draft files\n`);

  // Phase 3: Duplicate Detection
  console.log('📊 Pre-flight checks:');
  const existingIds = await getExistingIds();
  const newDrafts = drafts.filter((d) => !existingIds.has(d.id));
  const duplicates = drafts.filter((d) => existingIds.has(d.id));

  console.log(`  - ${newDrafts.length} new content items`);
  console.log(`  - ${duplicates.length} duplicates (will skip)\n`);

  if (newDrafts.length === 0) {
    console.log('✓ All files are duplicates. Nothing to upload.');
    if (duplicates.length > 0) {
      console.log('\nDuplicate files:');
      duplicates.forEach((d) => console.log(`  - ${d.fileName}`));
    }
    return;
  }

  // Phase 4: Upload Processing
  console.log('⬆️  Uploading content...');
  const result = await processUploads(drafts, existingIds);

  // Phase 5: Summary
  printSummary(result, drafts.length);

  // Exit with appropriate code
  if (result.failed.length > 0) {
    process.exit(1);
  }
}

// Execute
main().catch((err) => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
