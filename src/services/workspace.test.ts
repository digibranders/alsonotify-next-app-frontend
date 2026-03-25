import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  createWorkspace,
  getWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addRequirementToWorkspace,
  updateRequirementById,
  getAllRequirements,
  getCollaborativeRequirements,
  approveRequirement,
} from './workspace';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('workspace service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createWorkspace ─────────────────────────────────────────────────────────
  describe('createWorkspace', () => {
    it('calls POST /workspace/create with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'WS1' } as any;
      const result = await createWorkspace(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/workspace/create', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getWorkspace ────────────────────────────────────────────────────────────
  describe('getWorkspace', () => {
    it('calls GET /workspace? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: { workspaces: [] } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getWorkspace('team=1');

      expect(axiosApi.get).toHaveBeenCalledWith('/workspace?team=1');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults to empty options', async () => {
      const mockResponse = { data: { success: true, result: { workspaces: [] } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getWorkspace();

      expect(axiosApi.get).toHaveBeenCalledWith('/workspace?');
    });
  });

  // ── getWorkspaceById ────────────────────────────────────────────────────────
  describe('getWorkspaceById', () => {
    it('calls GET /workspace/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 3 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getWorkspaceById(3);

      expect(axiosApi.get).toHaveBeenCalledWith('/workspace/3');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateWorkspace ─────────────────────────────────────────────────────────
  describe('updateWorkspace', () => {
    it('calls PUT /workspace/update/:id with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 2 } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { id: 2, name: 'Updated' } as any;
      const result = await updateWorkspace(params);

      expect(axiosApi.put).toHaveBeenCalledWith('/workspace/update/2', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── deleteWorkspace ─────────────────────────────────────────────────────────
  describe('deleteWorkspace', () => {
    it('calls DELETE /workspace/delete/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 4 } } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await deleteWorkspace(4);

      expect(axiosApi.delete).toHaveBeenCalledWith('/workspace/delete/4');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── addRequirementToWorkspace ───────────────────────────────────────────────
  describe('addRequirementToWorkspace', () => {
    it('calls POST /requirement with params (priority stripped) and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'Req1', workspace_id: 1, priority: 'high' } as any;
      const result = await addRequirementToWorkspace(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/requirement', expect.not.objectContaining({ priority: 'high' }));
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateRequirementById ───────────────────────────────────────────────────
  describe('updateRequirementById', () => {
    it('calls PATCH /requirement/update/:id with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 5 } } };
      (axiosApi.patch as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { id: 5, name: 'Updated Req' } as any;
      const result = await updateRequirementById(params);

      expect(axiosApi.patch).toHaveBeenCalledWith('/requirement/update/5', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getAllRequirements ──────────────────────────────────────────────────────
  describe('getAllRequirements', () => {
    it('calls GET /requirement? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getAllRequirements('status=open');

      expect(axiosApi.get).toHaveBeenCalledWith('/requirement?status=open');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getCollaborativeRequirements ────────────────────────────────────────────
  describe('getCollaborativeRequirements', () => {
    it('calls GET /requirement/collaborative and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getCollaborativeRequirements();

      expect(axiosApi.get).toHaveBeenCalledWith('/requirement/collaborative');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── approveRequirement ──────────────────────────────────────────────────────
  describe('approveRequirement', () => {
    it('calls POST /requirement/approve with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { requirement_id: 1, rating: 5 } as any;
      const result = await approveRequirement(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/requirement/approve', params);
      expect(result).toEqual(mockResponse.data);
    });
  });
});
