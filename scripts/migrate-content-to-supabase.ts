/**
 * One-time migration: Git JSON files → Supabase content table
 *
 * Usage:
 *   npx tsx scripts/migrate-content-to-supabase.ts
 *   or
 *   npm run migrate:content
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *
 * This script:
 * 1. Scans the content/ directory for all JSON files
 * 2. Transforms them to match the review_web.content table schema
 * 3. Batch upserts to Supabase with error handling
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CONTENT_DIR = './content';
const BATCH_SIZE = 50;

interface ContentFile {
  filePath: string;
  id: string;
  language: string;
  category: string;
  data: any;
}

async function main() {
  console.log('🚀 Starting content migration to Supabase...\n');

  // 1. Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // 2. Initialize Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'review_web' },
  });

  console.log('✓ Connected to Supabase');
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Schema: review_web\n`);

  // 3. Scan content directory
  console.log(`📂 Scanning ${CONTENT_DIR} directory...`);
  const contentFiles = await scanContentDirectory(CONTENT_DIR);
  console.log(`✓ Found ${contentFiles.length} content files\n`);

  // 3.1 Deduplicate files by id + language
  const uniqueFilesMap = new Map<string, ContentFile>();
  const duplicates: string[] = [];

  for (const file of contentFiles) {
    const key = `${file.id}:${file.language}`;
    if (uniqueFilesMap.has(key)) {
      duplicates.push(file.filePath);
      // We keep the LAST seen file (arbitrary decision, but consistent with overwrite behavior)
      // Or we could keep the first. Let's keep the LAST one found to simulate "overwrite".
      // Actually, let's keep the one already there and warn, or just overwrite.
      // Overwrite:
      uniqueFilesMap.set(key, file);
    } else {
      uniqueFilesMap.set(key, file);
    }
  }

  if (duplicates.length > 0) {
    console.warn(
      `⚠️  Found ${duplicates.length} duplicate (id, language) pairs. Using last seen version.`
    );
    duplicates.forEach((d) =>
      console.warn(`   - Duplicate ignored/overwritten: ${d}`)
    );
  }

  const uniqueFiles = Array.from(uniqueFilesMap.values());
  console.log(`✓ Deduplicated to ${uniqueFiles.length} unique records\n`);

  if (contentFiles.length === 0) {
    console.log('⚠️  No content files found. Exiting.');
    return;
  }

  // 4. Transform and batch insert
  const batches = chunkArray(uniqueFiles, BATCH_SIZE);
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  console.log(
    `📦 Processing ${batches.length} batches (${BATCH_SIZE} per batch)...\n`
  );

  for (const [index, batch] of batches.entries()) {
    console.log(`  Batch ${index + 1}/${batches.length}...`);

    const records = batch.map(transformToTableSchema);

    const { error, count } = await supabase
      .from('content')
      .upsert(records, { onConflict: 'id,language' });

    if (error) {
      console.error(`  ❌ Batch ${index + 1} failed:`, error.message);
      errorCount += batch.length;
      batch.forEach((file) => {
        errors.push({
          file: file.filePath,
          error: error.message,
        });
      });
    } else {
      console.log(`  ✓ Batch ${index + 1} succeeded (${batch.length} records)`);
      successCount += batch.length;
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`Total files: ${contentFiles.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Failed files:');
    errors.forEach(({ file, error }) => {
      console.log(`  - ${file}`);
      console.log(`    Error: ${error}`);
    });
  }

  console.log('\n✨ Migration complete!');
}

/**
 * Recursively scan content directory for all JSON files
 */
async function scanContentDirectory(dir: string): Promise<ContentFile[]> {
  const files: ContentFile[] = [];

  try {
    const languages = await fs.readdir(dir);

    for (const language of languages) {
      // Skip non-directory files (e.g., .DS_Store)
      const langDir = path.join(dir, language);
      const langStat = await fs.stat(langDir);
      if (!langStat.isDirectory()) continue;

      const categories = await fs.readdir(langDir);

      for (const category of categories) {
        // Skip non-directory files
        const categoryDir = path.join(langDir, category);
        const categoryStat = await fs.stat(categoryDir);
        if (!categoryStat.isDirectory()) continue;

        const jsonFiles = (await fs.readdir(categoryDir)).filter((f) =>
          f.endsWith('.json')
        );

        for (const file of jsonFiles) {
          const filePath = path.join(categoryDir, file);
          const id = file.replace('.json', '');

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            files.push({
              filePath,
              id,
              language,
              category,
              data,
            });
          } catch (error) {
            console.warn(`⚠️  Skipping invalid file: ${filePath}`);
            console.warn(
              `   Error: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(
      `Failed to scan content directory: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  return files;
}

/**
 * Transform file data to match review_web.content table schema
 */
function transformToTableSchema(file: ContentFile) {
  const { id, language, category, data } = file;

  return {
    id,
    language,
    category,
    status: data.status || 'draft',
    date: validateDate(data.date, id),
    title: data.title,
    content: data.content,
    references: data.references || [],
    framework: data.framework || null,
    audio_file: data.audio_file || null,
    social_hook: data.social_hook || null,
    knowledge_concepts_used: data.knowledge_concepts_used || [],
    feedback: data.feedback || {},
    streaming_urls: data.streaming_urls || {},
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

function validateDate(date: string | undefined, id: string): string {
  if (date) return date;

  // Try to infer from ID (YYYY-MM-DD-...)
  const match = id.match(/^(\d{4}-\d{2}-\d{2})-/);
  if (match) {
    console.warn(`⚠️  Missing date for ${id}, inferred ${match[1]} from ID`);
    return match[1];
  }

  throw new Error(`Missing date for content: ${id}`);
}

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Run migration
main().catch((error) => {
  console.error('\n❌ Migration failed:');
  console.error(error);
  process.exit(1);
});
