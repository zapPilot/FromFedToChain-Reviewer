/**
 * Create a content draft and save to content-drafts/
 *
 * Usage in AI prompts:
 * "Generate a title, content, and choose a category, then call:
 *  await createDraft({
 *    topic: 'short-slug-here',
 *    category: 'macro',
 *    title: '生成的標題',
 *    content: '生成的內容...',
 *    references: ['https://...'],
 *    knowledge_concepts_used: ['concept1', 'concept2']
 *  })"
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Valid categories
type Category = 'daily-news' | 'ethereum' | 'macro' | 'startup' | 'ai' | 'defi';

// Draft input parameters
interface DraftParams {
  topic: string; // Short slug (e.g., "bitcoin-surge")
  category: Category; // Content category
  title: string; // Article title (Chinese)
  content: string; // Full content (Chinese)
  references?: string[]; // Source URLs
  knowledge_concepts_used?: string[]; // Knowledge graph concepts
  keywords?: string[]; // New field for SEO keywords
}

/**
 * Create a draft file in content-drafts/
 */
async function createDraft(params: DraftParams): Promise<void> {
  // Auto-generate ID: YYYY-MM-DD-topic
  const date = new Date().toISOString().split('T')[0];
  const id = `${date}-${params.topic}`;

  // Build draft object matching template.json
  const draft = {
    id,
    title: params.title,
    category: params.category,
    content: params.content,
    references: params.references || [],
    knowledge_concepts_used: params.knowledge_concepts_used || [],
    keywords: params.keywords || [],
  };

  // Save to content-drafts/
  const filename = `${id}.json`;
  const filepath = path.join(process.cwd(), 'content-drafts', filename);

  await fs.writeFile(filepath, JSON.stringify(draft, null, 2), 'utf-8');

  console.log(`✅ Draft created: ${filename}`);
  console.log(`📁 Location: content-drafts/${filename}`);
  console.log(`🚀 Next step: npm run drafts:upload`);

  return;
}

// Allow running directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const inputPath = process.argv[2];
    if (!inputPath) {
      console.error('❌ Error: Please provide a path to the input JSON file.');
      console.error(
        'Usage: npx tsx scripts/create-draft.ts <path-to-json-input>'
      );
      process.exit(1);
    }

    try {
      const content = await fs.readFile(inputPath, 'utf-8');
      const params = JSON.parse(content) as DraftParams;
      await createDraft(params);
    } catch (error) {
      console.error('❌ Error processing draft:', error);
      process.exit(1);
    }
  })();
}

// Export for use in other scripts
export { createDraft, type DraftParams, type Category };
