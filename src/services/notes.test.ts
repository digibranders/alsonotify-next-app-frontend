import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  archiveNote,
  unarchiveNote,
} from './notes';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notes service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getNotes ────────────────────────────────────────────────────────────────
  describe('getNotes', () => {
    it('calls GET /notes/ with pagination and archived params and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getNotes(10, 50, true);

      expect(axiosApi.get).toHaveBeenCalledWith('/notes/?skip=10&limit=50&archived=true');
      expect(result).toEqual(mockResponse.data);
    });

    it('uses default params when none provided', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getNotes();

      expect(axiosApi.get).toHaveBeenCalledWith('/notes/?skip=0&limit=100&archived=false');
    });
  });

  // ── createNote ──────────────────────────────────────────────────────────────
  describe('createNote', () => {
    it('calls POST /notes/ with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1, title: 'My Note' } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { title: 'My Note', type: 'TEXT_NOTE' as const, content: 'Hello' } as any;
      const result = await createNote(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/notes/', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateNote ──────────────────────────────────────────────────────────────
  describe('updateNote', () => {
    it('calls PUT /notes/:id with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 2 } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { title: 'Updated' } as any;
      const result = await updateNote(2, params);

      expect(axiosApi.put).toHaveBeenCalledWith('/notes/2', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── deleteNote ──────────────────────────────────────────────────────────────
  describe('deleteNote', () => {
    it('calls DELETE /notes/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 3 } } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await deleteNote(3);

      expect(axiosApi.delete).toHaveBeenCalledWith('/notes/3');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── archiveNote ─────────────────────────────────────────────────────────────
  describe('archiveNote', () => {
    it('calls PUT /notes/:id with is_archived true and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 4 } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await archiveNote(4);

      expect(axiosApi.put).toHaveBeenCalledWith('/notes/4', { is_archived: true });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── unarchiveNote ───────────────────────────────────────────────────────────
  describe('unarchiveNote', () => {
    it('calls PUT /notes/:id with is_archived false and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 5 } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await unarchiveNote(5);

      expect(axiosApi.put).toHaveBeenCalledWith('/notes/5', { is_archived: false });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
