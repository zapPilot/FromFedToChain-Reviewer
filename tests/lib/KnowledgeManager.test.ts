import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';

// 1. Use vi.hoisted so these are available in the mock factory
const {
  mockIndexRead,
  mockIndexUpdate,
  mockIndexInit,
  mockIndexAdd,
  mockIndexRemove,
  mockIndexUpdateName,
  mockStorageInit,
  mockStorageSave,
  mockStorageRead,
  mockStorageDelete,
} = vi.hoisted(() => {
  return {
    mockIndexRead: vi.fn(),
    mockIndexUpdate: vi.fn(),
    mockIndexInit: vi.fn(),
    mockIndexAdd: vi.fn(),
    mockIndexRemove: vi.fn(),
    mockIndexUpdateName: vi.fn(),
    mockStorageInit: vi.fn(),
    mockStorageSave: vi.fn(),
    mockStorageRead: vi.fn(),
    mockStorageDelete: vi.fn(),
  };
});

// 2. Mock the modules using these specific functions
vi.mock('@/lib/knowledge/KnowledgeIndex', () => {
  return {
    KnowledgeIndex: vi.fn().mockImplementation(() => ({
      read: mockIndexRead,
      update: mockIndexUpdate,
      initialize: mockIndexInit,
      addConcept: mockIndexAdd,
      removeConcept: mockIndexRemove,
      updateConceptName: mockIndexUpdateName,
    })),
  };
});

vi.mock('@/lib/knowledge/ConceptStorage', () => {
  return {
    ConceptStorage: vi.fn().mockImplementation(() => ({
      initialize: mockStorageInit,
      save: mockStorageSave,
      read: mockStorageRead,
      delete: mockStorageDelete,
    })),
  };
});

vi.mock('fs/promises');

// Import AFTER mocks are defined
import { KnowledgeManager } from '@/lib/KnowledgeManager';

describe('KnowledgeManager', () => {
  const mockIndexData = {
    concepts: [
      {
        id: 'c1',
        name: 'Concept 1',
        category: 'General',
        first_introduced: '',
      },
    ],
    categories: ['General'],
    total_concepts: 1,
    last_updated: '2024-01-01T00:00:00.000Z',
  };

  const mockConcept = {
    id: 'c1',
    name: 'Concept 1',
    definition: 'Definition',
    category: 'General',
    referenced_in: [],
    tags: ['tag1'],
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default behaviors
    mockIndexRead.mockResolvedValue(mockIndexData);
    mockIndexUpdate.mockResolvedValue(undefined);
    mockIndexInit.mockResolvedValue(undefined);
    mockIndexAdd.mockResolvedValue(undefined);
    mockIndexRemove.mockResolvedValue(undefined);
    mockIndexUpdateName.mockResolvedValue(undefined);

    mockStorageInit.mockResolvedValue(undefined);
    mockStorageSave.mockResolvedValue(undefined);
    mockStorageRead.mockResolvedValue(mockConcept);
    mockStorageDelete.mockResolvedValue(undefined);

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('initializes storage, index, and relationships', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // relationships missing

      await KnowledgeManager.initialize();

      expect(fs.mkdir).toHaveBeenCalled(); // KNOWLEDGE_DIR
      expect(mockStorageInit).toHaveBeenCalled();
      expect(mockIndexInit).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled(); // relationships
    });
  });

  describe('createConcept', () => {
    it('creates a new concept', async () => {
      // Mock index read to NOT return c2 initially (so duplicate check passes)
      mockIndexRead.mockResolvedValueOnce({
        concepts: [{ id: 'c1', name: 'Concept 1' }],
      });

      const newConceptData = {
        id: 'c2',
        name: 'Concept 2',
        definition: 'Def 2',
        category: 'General',
      };

      await KnowledgeManager.createConcept(newConceptData);

      expect(mockStorageSave).toHaveBeenCalled();
      expect(mockIndexAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'c2',
        })
      );
    });
  });

  describe('searchConcepts', () => {
    it('searches using index and storage', async () => {
      // 1. First read for index iteration
      mockIndexRead.mockResolvedValueOnce({
        concepts: [{ id: 'c1', name: 'Concept 1' }],
      });

      // 2. Second read inside getConcept check
      mockIndexRead.mockResolvedValueOnce({
        concepts: [{ id: 'c1', name: 'Concept 1' }],
      });

      // 3. Storage read calls default mock (mockConcept)

      const results = await KnowledgeManager.searchConcepts('conc');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('c1');
    });
  });
});
