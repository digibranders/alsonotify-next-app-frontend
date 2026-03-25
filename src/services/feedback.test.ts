import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axios from '@/config/axios';
import {
  createFeedback,
  getFeedbackList,
  toggleFeedbackVote,
  updateFeedbackStatus,
  softDeleteFeedback,
  FeedbackType,
  FeedbackStatus,
} from './feedback';

vi.mock('@/config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('feedback service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createFeedback ──────────────────────────────────────────────────────────
  describe('createFeedback', () => {
    it('calls POST /feedback with data and returns result', async () => {
      const feedbackItem = { id: 1, title: 'Bug report' };
      (axios.post as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: feedbackItem },
      });

      const payload = { title: 'Bug report', description: 'Desc', type: FeedbackType.BUG };
      const result = await createFeedback(payload);

      expect(axios.post).toHaveBeenCalledWith('/feedback', payload);
      expect(result).toEqual(feedbackItem);
    });
  });

  // ── getFeedbackList ─────────────────────────────────────────────────────────
  describe('getFeedbackList', () => {
    it('calls GET /feedback with filters and returns result', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      (axios.get as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: items },
      });

      const filters = { status: FeedbackStatus.OPEN, type: FeedbackType.FEATURE };
      const result = await getFeedbackList(filters);

      expect(axios.get).toHaveBeenCalledWith('/feedback', { params: filters });
      expect(result).toEqual(items);
    });

    it('calls GET /feedback without filters when none provided', async () => {
      (axios.get as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: [] },
      });

      await getFeedbackList();

      expect(axios.get).toHaveBeenCalledWith('/feedback', { params: undefined });
    });
  });

  // ── toggleFeedbackVote ──────────────────────────────────────────────────────
  describe('toggleFeedbackVote', () => {
    it('calls POST /feedback/:id/vote and returns result', async () => {
      const voteResult = { voted: true };
      (axios.post as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: voteResult },
      });

      const result = await toggleFeedbackVote(3);

      expect(axios.post).toHaveBeenCalledWith('/feedback/3/vote');
      expect(result).toEqual(voteResult);
    });
  });

  // ── updateFeedbackStatus ────────────────────────────────────────────────────
  describe('updateFeedbackStatus', () => {
    it('calls PATCH /feedback/company/:id/:status and returns result', async () => {
      const updatedItem = { id: 2, status: FeedbackStatus.PLANNED };
      (axios.patch as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: updatedItem },
      });

      const result = await updateFeedbackStatus(2, FeedbackStatus.PLANNED);

      expect(axios.patch).toHaveBeenCalledWith('/feedback/company/2/PLANNED');
      expect(result).toEqual(updatedItem);
    });
  });

  // ── softDeleteFeedback ──────────────────────────────────────────────────────
  describe('softDeleteFeedback', () => {
    it('calls DELETE /feedback/:id and returns result', async () => {
      const deletedItem = { id: 4, is_deleted: true };
      (axios.delete as unknown as MockInstance).mockResolvedValue({
        data: { success: true, result: deletedItem },
      });

      const result = await softDeleteFeedback(4);

      expect(axios.delete).toHaveBeenCalledWith('/feedback/4');
      expect(result).toEqual(deletedItem);
    });
  });
});
