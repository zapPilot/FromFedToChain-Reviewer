import fs from 'fs/promises';
import path from 'path';
import { KnowledgeConcept } from '@/types/knowledge';

export class ConceptStorage {
  private conceptsDir: string;

  constructor(conceptsDir: string) {
    this.conceptsDir = conceptsDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.conceptsDir, { recursive: true });
  }

  getFilePath(conceptName: string): string {
    return path.join(this.conceptsDir, `${conceptName}.json`);
  }

  async save(concept: KnowledgeConcept): Promise<void> {
    const conceptFile = this.getFilePath(concept.name);
    await fs.writeFile(conceptFile, JSON.stringify(concept, null, 2));
  }

  async read(conceptName: string): Promise<KnowledgeConcept> {
    try {
      const conceptFile = this.getFilePath(conceptName);
      const conceptContent = await fs.readFile(conceptFile, 'utf-8');
      return JSON.parse(conceptContent) as KnowledgeConcept;
    } catch (error) {
      throw error;
    }
  }

  async delete(conceptName: string): Promise<void> {
    const conceptFile = this.getFilePath(conceptName);
    await fs.unlink(conceptFile);
  }
}
