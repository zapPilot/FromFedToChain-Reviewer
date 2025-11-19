import fs from 'fs/promises';
import path from 'path';
import type {
  KnowledgeConcept,
  KnowledgeIndex,
  KnowledgeRelationships,
  SearchOptions,
  KnowledgeStats,
  CreateConceptData,
  ConceptSummary,
} from '@/types/knowledge';

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

  // Initialize knowledge base structure
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.KNOWLEDGE_DIR, { recursive: true });
      await fs.mkdir(this.CONCEPTS_DIR, { recursive: true });

      // Check if index file exists, create if not
      try {
        await fs.access(this.INDEX_FILE);
      } catch (error) {
        await this.createEmptyIndex();
      }

      // Check if relationships file exists, create if not
      try {
        await fs.access(this.RELATIONSHIPS_FILE);
      } catch (error) {
        await this.createEmptyRelationships();
      }

      console.log('✅ Knowledge index initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize knowledge index: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Create empty index file
  static async createEmptyIndex(): Promise<void> {
    const emptyIndex: KnowledgeIndex = {
      concepts: [],
      categories: ['經濟學', '技術', '商業', '政策', '歷史'],
      total_concepts: 0,
      last_updated: new Date().toISOString(),
    };
    await fs.writeFile(this.INDEX_FILE, JSON.stringify(emptyIndex, null, 2));
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

  // Read index file
  static async readIndex(): Promise<KnowledgeIndex> {
    try {
      const indexContent = await fs.readFile(this.INDEX_FILE, 'utf-8');
      return JSON.parse(indexContent) as KnowledgeIndex;
    } catch (error) {
      throw new Error(
        `Failed to read knowledge index: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Update index file
  static async updateIndex(indexData: KnowledgeIndex): Promise<void> {
    try {
      indexData.last_updated = new Date().toISOString();
      await fs.writeFile(this.INDEX_FILE, JSON.stringify(indexData, null, 2));
    } catch (error) {
      throw new Error(
        `Failed to update knowledge index: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
    const conceptFile = path.join(this.CONCEPTS_DIR, `${concept.name}.json`);
    await fs.writeFile(conceptFile, JSON.stringify(concept, null, 2));

    // Update index
    const index = await this.readIndex();
    index.concepts.push({
      id: concept.id,
      name: concept.name,
      category: concept.category,
      first_introduced: concept.first_introduced,
    });
    index.total_concepts = index.concepts.length;
    await this.updateIndex(index);

    console.log(`✅ Created concept: ${concept.name} (${concept.id})`);
    return concept;
  }

  // Get concept by ID or name
  static async getConcept(
    identifier: string
  ): Promise<KnowledgeConcept | null> {
    try {
      // First try to find concept from index
      const index = await this.readIndex();
      const conceptInfo = index.concepts.find(
        (c) => c.id === identifier || c.name === identifier
      );

      if (!conceptInfo) {
        return null;
      }

      // Read full concept file
      const conceptFile = path.join(
        this.CONCEPTS_DIR,
        `${conceptInfo.name}.json`
      );
      const conceptContent = await fs.readFile(conceptFile, 'utf-8');
      return JSON.parse(conceptContent) as KnowledgeConcept;
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
      const index = await this.readIndex();
      const results: KnowledgeConcept[] = [];

      for (const conceptInfo of index.concepts) {
        // Category filter
        if (category && conceptInfo.category !== category) {
          continue;
        }

        // Read full concept data
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
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
      const conceptFile = path.join(this.CONCEPTS_DIR, `${concept.name}.json`);
      await fs.writeFile(conceptFile, JSON.stringify(concept, null, 2));

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
      const conceptFile = path.join(this.CONCEPTS_DIR, `${concept.name}.json`);
      await fs.writeFile(conceptFile, JSON.stringify(concept, null, 2));

      console.log(`🗑️ Removed reference: ${concept.name} -> ${articleId}`);
    }
  }

  // List all concepts
  static async listConcepts(
    category: string | null = null
  ): Promise<ConceptSummary[]> {
    try {
      const index = await this.readIndex();
      let concepts = index.concepts;

      if (category) {
        concepts = concepts.filter((c) => c.category === category);
      }

      return concepts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(
        `Failed to list concepts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Get all categories
  static async getCategories(): Promise<string[]> {
    try {
      const index = await this.readIndex();
      return index.categories;
    } catch (error) {
      throw new Error(
        `Failed to get categories: ${error instanceof Error ? error.message : String(error)}`
      );
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
    const oldFile = path.join(this.CONCEPTS_DIR, `${concept.name}.json`);
    const newFile = path.join(this.CONCEPTS_DIR, `${updatedConcept.name}.json`);

    await fs.writeFile(newFile, JSON.stringify(updatedConcept, null, 2));

    if (concept.name !== updatedConcept.name) {
      await fs.unlink(oldFile);

      // Update name in index
      const index = await this.readIndex();
      const conceptIndex = index.concepts.findIndex((c) => c.id === conceptId);
      if (conceptIndex > -1) {
        index.concepts[conceptIndex].name = updatedConcept.name;
        await this.updateIndex(index);
      }
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
    const conceptFile = path.join(this.CONCEPTS_DIR, `${concept.name}.json`);
    await fs.unlink(conceptFile);

    // Remove from index
    const index = await this.readIndex();
    index.concepts = index.concepts.filter((c) => c.id !== conceptId);
    index.total_concepts = index.concepts.length;
    await this.updateIndex(index);

    console.log(`🗑️ Deleted concept: ${concept.name}`);
  }

  // Get statistics
  static async getStats(): Promise<KnowledgeStats> {
    try {
      const index = await this.readIndex();
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
      throw new Error(
        `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
