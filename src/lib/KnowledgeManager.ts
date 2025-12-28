import fs from 'fs/promises';
import path from 'path';
import type {
  KnowledgeConcept,
  KnowledgeIndex as IKnowledgeIndex,
  KnowledgeRelationships,
  SearchOptions,
  KnowledgeStats,
  CreateConceptData,
  ConceptSummary,
} from '@/types/knowledge';
import { getErrorMessage } from './utils/error-handler';
import { KnowledgeIndex } from './knowledge/KnowledgeIndex';
import { ConceptStorage } from './knowledge/ConceptStorage';

/**
 * KnowledgeManager - Manages knowledge concept indexing
 * Provides concept creation, querying, updating and relationship management
 */
export class KnowledgeManager {
  static KNOWLEDGE_DIR =
    process.env.KNOWLEDGE_DIR || path.join(process.cwd(), 'knowledge');
  static CONCEPTS_DIR = path.join(
    process.env.KNOWLEDGE_DIR || path.join(process.cwd(), 'knowledge'),
    'concepts'
  );
  static INDEX_FILE = path.join(
    process.env.KNOWLEDGE_DIR || path.join(process.cwd(), 'knowledge'),
    'concepts',
    'index.json'
  );
  static RELATIONSHIPS_FILE = path.join(
    process.env.KNOWLEDGE_DIR || path.join(process.cwd(), 'knowledge'),
    'relationships.json'
  );

  // Components
  private static indexManager = new KnowledgeIndex(KnowledgeManager.INDEX_FILE);
  private static storageManager = new ConceptStorage(
    KnowledgeManager.CONCEPTS_DIR
  );

  // Initialize knowledge base structure
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.KNOWLEDGE_DIR, { recursive: true });
      await this.storageManager.initialize();

      // Initialize index
      await this.indexManager.initialize([
        '經濟學',
        '技術',
        '商業',
        '政策',
        '歷史',
      ]);

      // Check if relationships file exists, create if not
      try {
        await fs.access(this.RELATIONSHIPS_FILE);
      } catch (error) {
        await this.createEmptyRelationships();
      }

      console.log('✅ Knowledge index initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize knowledge index: ${getErrorMessage(error)}`
      );
    }
  }

  // Create empty relationships file
  static async createEmptyRelationships(): Promise<void> {
    const emptyRelationships: KnowledgeRelationships = {
      relationships: [],
      relationship_types: [
        'applies_to',
        'reinforces',
        'contrasts_with',
        'prerequisite_for',
        'example_of',
      ],
      last_updated: new Date().toISOString(),
    };
    await fs.writeFile(
      this.RELATIONSHIPS_FILE,
      JSON.stringify(emptyRelationships, null, 2)
    );
  }

  // Create new concept
  static async createConcept(
    conceptData: CreateConceptData
  ): Promise<KnowledgeConcept> {
    // Validate required fields
    const requiredFields: (keyof CreateConceptData)[] = [
      'id',
      'name',
      'definition',
      'category',
    ];
    for (const field of requiredFields) {
      if (!conceptData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check if ID already exists
    const existingConcept = await this.getConcept(conceptData.id);
    if (existingConcept) {
      throw new Error(`Concept with id '${conceptData.id}' already exists`);
    }

    // Prepare concept data
    const concept: KnowledgeConcept = {
      id: conceptData.id,
      name: conceptData.name,
      definition: conceptData.definition,
      context: conceptData.context || '',
      examples: conceptData.examples || [],
      category: conceptData.category,
      first_introduced: conceptData.first_introduced || '',
      referenced_in: conceptData.referenced_in || [],
      related_concepts: conceptData.related_concepts || [],
      tags: conceptData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save concept file
    await this.storageManager.save(concept);

    // Update index
    await this.indexManager.addConcept({
      id: concept.id,
      name: concept.name,
      category: concept.category,
      first_introduced: concept.first_introduced,
    });

    console.log(`✅ Created concept: ${concept.name} (${concept.id})`);
    return concept;
  }

  // Get concept by ID or name
  static async getConcept(
    identifier: string
  ): Promise<KnowledgeConcept | null> {
    try {
      // First try to find concept from index
      const index = await this.indexManager.read();
      const conceptInfo = index.concepts.find(
        (c) => c.id === identifier || c.name === identifier
      );

      if (!conceptInfo) {
        return null;
      }

      // Read full concept file
      return await this.storageManager.read(conceptInfo.name);
    } catch (error) {
      return null;
    }
  }

  // Search concepts
  static async searchConcepts(
    query: string,
    options: SearchOptions = {}
  ): Promise<KnowledgeConcept[]> {
    const { category = null, fuzzy = true, includeContext = false } = options;

    try {
      const index = await this.indexManager.read();
      const results: KnowledgeConcept[] = [];

      for (const conceptInfo of index.concepts) {
        // Category filter
        if (category && conceptInfo.category !== category) {
          continue;
        }

        // Read full concept data
        // Optimization: Could we avoid reading full file if not needing context?
        // But we need definition/tags for search.
        const concept = await this.getConcept(conceptInfo.id);
        if (!concept) continue;

        // Search logic
        const searchFields: string[] = [
          concept.name,
          concept.definition,
          ...(concept.tags || []),
        ];

        if (includeContext) {
          searchFields.push(concept.context || '');
        }

        const searchText = searchFields.join(' ').toLowerCase();
        const queryLower = query.toLowerCase();

        let isMatch = false;
        if (fuzzy) {
          isMatch = searchText.includes(queryLower);
        } else {
          isMatch = searchFields.some(
            (field) => field.toLowerCase() === queryLower
          );
        }

        if (isMatch) {
          results.push(concept);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${getErrorMessage(error)}`);
    }
  }

  // Get concept references in articles
  static async getConceptReferences(conceptId: string): Promise<string[]> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }
    return concept.referenced_in || [];
  }

  // Add concept reference to article
  static async addConceptReference(
    conceptId: string,
    articleId: string
  ): Promise<void> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    if (!concept.referenced_in.includes(articleId)) {
      concept.referenced_in.push(articleId);
      concept.updated_at = new Date().toISOString();

      // Save updated concept
      await this.storageManager.save(concept);

      console.log(`📎 Added reference: ${concept.name} -> ${articleId}`);
    }
  }

  // Remove concept reference from article
  static async removeConceptReference(
    conceptId: string,
    articleId: string
  ): Promise<void> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    const index = concept.referenced_in.indexOf(articleId);
    if (index > -1) {
      concept.referenced_in.splice(index, 1);
      concept.updated_at = new Date().toISOString();

      // Save updated concept
      await this.storageManager.save(concept);

      console.log(`🗑️ Removed reference: ${concept.name} -> ${articleId}`);
    }
  }

  // List all concepts
  static async listConcepts(
    category: string | null = null
  ): Promise<ConceptSummary[]> {
    try {
      const index = await this.indexManager.read();
      let concepts = index.concepts;

      if (category) {
        concepts = concepts.filter((c) => c.category === category);
      }

      return concepts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(`Failed to list concepts: ${getErrorMessage(error)}`);
    }
  }

  // Get all categories
  static async getCategories(): Promise<string[]> {
    try {
      const index = await this.indexManager.read();
      return index.categories;
    } catch (error) {
      throw new Error(`Failed to get categories: ${getErrorMessage(error)}`);
    }
  }

  // Update concept
  static async updateConcept(
    conceptId: string,
    updates: Partial<KnowledgeConcept>
  ): Promise<KnowledgeConcept> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    // Apply updates
    const updatedConcept: KnowledgeConcept = {
      ...concept,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // If name changed, need to rename file
    if (concept.name !== updatedConcept.name) {
      await this.storageManager.delete(concept.name);
      await this.storageManager.save(updatedConcept);
      await this.indexManager.updateConceptName(conceptId, updatedConcept.name);
    } else {
      await this.storageManager.save(updatedConcept);
    }

    console.log(`✅ Updated concept: ${updatedConcept.name}`);
    return updatedConcept;
  }

  // Delete concept
  static async deleteConcept(conceptId: string): Promise<void> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    // Delete concept file
    await this.storageManager.delete(concept.name);

    // Remove from index
    await this.indexManager.removeConcept(conceptId);

    console.log(`🗑️ Deleted concept: ${concept.name}`);
  }

  // Get statistics
  static async getStats(): Promise<KnowledgeStats> {
    try {
      const index = await this.indexManager.read();
      const categoryStats: Record<string, number> = {};

      for (const concept of index.concepts) {
        categoryStats[concept.category] =
          (categoryStats[concept.category] || 0) + 1;
      }

      return {
        total_concepts: index.total_concepts,
        categories: categoryStats,
        last_updated: index.last_updated,
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${getErrorMessage(error)}`);
    }
  }
}
