/**
 * Knowledge Management Types
 * TypeScript definitions for knowledge concepts and relationships
 */

export interface KnowledgeConcept {
  id: string;
  name: string;
  definition: string;
  context?: string;
  examples: string[];
  category: string;
  first_introduced: string;
  referenced_in: string[];
  related_concepts: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ConceptSummary {
  id: string;
  name: string;
  category: string;
  first_introduced: string;
}

export interface KnowledgeIndex {
  concepts: ConceptSummary[];
  categories: string[];
  total_concepts: number;
  last_updated: string;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
}

export interface KnowledgeRelationships {
  relationships: Relationship[];
  relationship_types: string[];
  last_updated: string;
}

export interface SearchOptions {
  category?: string | null;
  fuzzy?: boolean;
  includeContext?: boolean;
}

export interface KnowledgeStats {
  total_concepts: number;
  categories: Record<string, number>;
  last_updated: string;
}

export interface CreateConceptData {
  id: string;
  name: string;
  definition: string;
  context?: string;
  examples?: string[];
  category: string;
  first_introduced?: string;
  referenced_in?: string[];
  related_concepts?: string[];
  tags?: string[];
}
