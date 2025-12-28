import fs from 'fs/promises';
import { KnowledgeIndex as IKnowledgeIndex } from '@/types/knowledge';
import { getErrorMessage } from '../utils/error-handler';

export class KnowledgeIndex {
  private indexFile: string;

  constructor(indexFile: string) {
    this.indexFile = indexFile;
  }

  async read(): Promise<IKnowledgeIndex> {
    try {
      const indexContent = await fs.readFile(this.indexFile, 'utf-8');
      return JSON.parse(indexContent) as IKnowledgeIndex;
    } catch (error) {
      throw new Error(
        `Failed to read knowledge index: ${getErrorMessage(error)}`
      );
    }
  }

  async update(indexData: IKnowledgeIndex): Promise<void> {
    try {
      indexData.last_updated = new Date().toISOString();
      await fs.writeFile(this.indexFile, JSON.stringify(indexData, null, 2));
    } catch (error) {
      throw new Error(
        `Failed to update knowledge index: ${getErrorMessage(error)}`
      );
    }
  }

  async initialize(defaultCategories: string[]): Promise<void> {
    try {
      await fs.access(this.indexFile);
    } catch (error) {
      // Create empty index
      const emptyIndex: IKnowledgeIndex = {
        concepts: [],
        categories: defaultCategories,
        total_concepts: 0,
        last_updated: new Date().toISOString(),
      };
      await fs.writeFile(this.indexFile, JSON.stringify(emptyIndex, null, 2));
    }
  }

  async addConcept(concept: {
    id: string;
    name: string;
    category: string;
    first_introduced: string;
  }): Promise<void> {
    const index = await this.read();
    index.concepts.push(concept);
    index.total_concepts = index.concepts.length;
    await this.update(index);
  }

  async removeConcept(conceptId: string): Promise<void> {
    const index = await this.read();
    index.concepts = index.concepts.filter((c) => c.id !== conceptId);
    index.total_concepts = index.concepts.length;
    await this.update(index);
  }

  async updateConceptName(conceptId: string, newName: string): Promise<void> {
    const index = await this.read();
    const conceptIndex = index.concepts.findIndex((c) => c.id === conceptId);
    if (conceptIndex > -1) {
      index.concepts[conceptIndex].name = newName;
      await this.update(index);
    }
  }
}
