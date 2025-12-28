import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConcepts } from '@/app/api/knowledge/concepts/route';
import { GET as getConceptById } from '@/app/api/knowledge/concepts/[id]/route';
import { GET as getStats } from '@/app/api/knowledge/stats/route';
import { KnowledgeManager } from '@/lib/KnowledgeManager';

// Mock KnowledgeManager
vi.mock('@/lib/KnowledgeManager', () => ({
  KnowledgeManager: {
    initialize: vi.fn(),
    listConcepts: vi.fn(),
    searchConcepts: vi.fn(),
    getConcept: vi.fn(),
    getStats: vi.fn(),
  },
}));

describe('Knowledge API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/knowledge/concepts', () => {
    it('lists all concepts', async () => {
      const mockConcepts = [
        { id: 'concept-1', name: 'Bitcoin' },
        { id: 'concept-2', name: 'Ethereum' },
      ];
      vi.mocked(KnowledgeManager.listConcepts).mockResolvedValue(
        mockConcepts as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts'
      );
      const response = await getConcepts(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.data).toHaveLength(2);
    });

    it('filters by category', async () => {
      vi.mocked(KnowledgeManager.listConcepts).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts?category=crypto'
      );
      await getConcepts(request);

      expect(KnowledgeManager.listConcepts).toHaveBeenCalledWith('crypto');
    });

    it('searches concepts with query', async () => {
      const mockResults = [{ id: 'btc', name: 'Bitcoin' }];
      vi.mocked(KnowledgeManager.searchConcepts).mockResolvedValue(
        mockResults as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts?query=bitcoin'
      );
      const response = await getConcepts(request);
      const body = await response.json();

      expect(KnowledgeManager.searchConcepts).toHaveBeenCalledWith('bitcoin', {
        category: null,
        fuzzy: true,
        includeContext: false,
      });
      expect(body.data.data).toHaveLength(1);
    });

    it('handles search options', async () => {
      vi.mocked(KnowledgeManager.searchConcepts).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts?query=test&fuzzy=false&includeContext=true&category=defi'
      );
      await getConcepts(request);

      expect(KnowledgeManager.searchConcepts).toHaveBeenCalledWith('test', {
        category: 'defi',
        fuzzy: false,
        includeContext: true,
      });
    });
  });

  describe('GET /api/knowledge/concepts/[id]', () => {
    it('returns concept by id', async () => {
      const mockConcept = {
        id: 'btc',
        name: 'Bitcoin',
        definition: 'A crypto',
      };
      vi.mocked(KnowledgeManager.getConcept).mockResolvedValue(
        mockConcept as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts/btc'
      );
      const response = await getConceptById(request, {
        params: Promise.resolve({ id: 'btc' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.data.id).toBe('btc');
    });

    it('returns 404 for non-existent concept', async () => {
      vi.mocked(KnowledgeManager.getConcept).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/concepts/unknown'
      );
      const response = await getConceptById(request, {
        params: Promise.resolve({ id: 'unknown' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/knowledge/stats', () => {
    it('returns knowledge base statistics', async () => {
      const mockStats = {
        totalConcepts: 50,
        byCategory: { crypto: 30, defi: 20 },
      };
      vi.mocked(KnowledgeManager.getStats).mockResolvedValue(mockStats as any);

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/stats'
      );
      const response = await getStats(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.data.totalConcepts).toBe(50);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(KnowledgeManager.getStats).mockRejectedValue(
        new Error('Stats error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/knowledge/stats'
      );
      const response = await getStats(request);

      expect(response.status).toBe(500);
    });
  });
});
