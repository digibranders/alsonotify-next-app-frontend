import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getUserDetails,
  getEmployees,
  createUser,
  updateUserById,
  searchPartners,
  searchEmployees,
  getUserById,
  getPartners,
  updateCurrentUserProfile,
  getRoles,
} from './user';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('user service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getUserDetails ──────────────────────────────────────────────────────────
  describe('getUserDetails', () => {
    it('calls GET /user/details and returns data', async () => {
      const mockResponse = { data: { success: true, result: { user: {}, access: {} } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getUserDetails();

      expect(axiosApi.get).toHaveBeenCalledWith('/user/details');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getEmployees ────────────────────────────────────────────────────────────
  describe('getEmployees', () => {
    it('calls GET /user? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getEmployees('role=admin');

      expect(axiosApi.get).toHaveBeenCalledWith('/user?role=admin');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults to empty options', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getEmployees();

      expect(axiosApi.get).toHaveBeenCalledWith('/user?');
    });
  });

  // ── createUser ──────────────────────────────────────────────────────────────
  describe('createUser', () => {
    it('calls POST /user/create with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'John', email: 'john@test.com' } as any;
      const result = await createUser(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/user/create', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateUserById ──────────────────────────────────────────────────────────
  describe('updateUserById', () => {
    it('calls PUT /user/update/:id with params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 5 } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'Updated' } as any;
      const result = await updateUserById(5, params);

      expect(axiosApi.put).toHaveBeenCalledWith('/user/update/5', params);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── searchPartners ──────────────────────────────────────────────────────────
  describe('searchPartners', () => {
    it('calls GET /user/partners/dropdown with search param', async () => {
      const mockResponse = { data: { success: true, result: [{ label: 'A', value: 1 }] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await searchPartners('Acme');

      expect(axiosApi.get).toHaveBeenCalledWith('/user/partners/dropdown', {
        params: { limit: 100, name: 'Acme' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('omits name param when search is undefined', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await searchPartners();

      expect(axiosApi.get).toHaveBeenCalledWith('/user/partners/dropdown', {
        params: { limit: 100 },
      });
    });
  });

  // ── searchEmployees ─────────────────────────────────────────────────────────
  describe('searchEmployees', () => {
    it('calls GET /user/user-dropdown with search param', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await searchEmployees('Jane');

      expect(axiosApi.get).toHaveBeenCalledWith('/user/user-dropdown', {
        params: { limit: 100, name: 'Jane' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getUserById ─────────────────────────────────────────────────────────────
  describe('getUserById', () => {
    it('calls GET /user/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 10 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getUserById(10);

      expect(axiosApi.get).toHaveBeenCalledWith('/user/10');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getPartners ─────────────────────────────────────────────────────────────
  describe('getPartners', () => {
    it('calls GET /user/partners with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getPartners('status=active');

      expect(axiosApi.get).toHaveBeenCalledWith('/user/partners?status=active');
      expect(result).toEqual(mockResponse.data);
    });

    it('calls GET /user/partners without query string when no options', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getPartners();

      expect(axiosApi.get).toHaveBeenCalledWith('/user/partners');
    });
  });

  // ── updateCurrentUserProfile ────────────────────────────────────────────────
  describe('updateCurrentUserProfile', () => {
    it('calls POST /user/profile with payload including mobile_number', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'Updated', phone: '123456' } as any;
      const result = await updateCurrentUserProfile(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/user/profile', expect.objectContaining({
        name: 'Updated',
        mobile_number: '123456',
      }));
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getRoles ────────────────────────────────────────────────────────────────
  describe('getRoles', () => {
    it('calls GET /role and returns data', async () => {
      const mockResponse = { data: { success: true, result: [{ id: 1, name: 'Admin' }] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getRoles();

      expect(axiosApi.get).toHaveBeenCalledWith('/role');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
