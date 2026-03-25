import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  recordPayment,
  sendInvoiceEmail,
  getNextInvoiceNumber,
  getPaymentHistory,
} from './invoice';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('invoice service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getInvoices ─────────────────────────────────────────────────────────────
  describe('getInvoices', () => {
    it('calls GET /invoice? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: { invoices: [], total: 0 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getInvoices('status=paid');

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice?status=paid');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults to empty options', async () => {
      const mockResponse = { data: { success: true, result: { invoices: [], total: 0 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getInvoices();

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice?');
    });
  });

  // ── getInvoiceById ──────────────────────────────────────────────────────────
  describe('getInvoiceById', () => {
    it('calls GET /invoice/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getInvoiceById(1);

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice/1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── createInvoice ───────────────────────────────────────────────────────────
  describe('createInvoice', () => {
    it('calls POST /invoice/create with payload and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 2 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const payload = { bill_from: 'A', bill_to: 'B' };
      const result = await createInvoice(payload);

      expect(axiosApi.post).toHaveBeenCalledWith('/invoice/create', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateInvoiceStatus ─────────────────────────────────────────────────────
  describe('updateInvoiceStatus', () => {
    it('calls PATCH /invoice/:id/status with status payload and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.patch as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await updateInvoiceStatus(3, 'sent');

      expect(axiosApi.patch).toHaveBeenCalledWith('/invoice/3/status', { status: 'sent' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── recordPayment ───────────────────────────────────────────────────────────
  describe('recordPayment', () => {
    it('calls POST /invoice/:id/record-payment with payload and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const payload = { amount: 1000, date: '2025-01-15', method: 'bank_transfer' };
      const result = await recordPayment(4, payload);

      expect(axiosApi.post).toHaveBeenCalledWith('/invoice/4/record-payment', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── sendInvoiceEmail ────────────────────────────────────────────────────────
  describe('sendInvoiceEmail', () => {
    it('calls POST /invoice/:id/send-email with payload and returns data', async () => {
      const mockResponse = { data: { success: true, result: { ok: true, sentTo: ['a@b.com'] } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const payload = { to: ['a@b.com'], cc: ['c@d.com'], custom_message: 'Hello' };
      const result = await sendInvoiceEmail(5, payload);

      expect(axiosApi.post).toHaveBeenCalledWith('/invoice/5/send-email', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getNextInvoiceNumber ────────────────────────────────────────────────────
  describe('getNextInvoiceNumber', () => {
    it('calls GET /invoice/next-number with companyId and invoiceType', async () => {
      const mockResponse = { data: { success: true, result: { invoice_number: 'INV-001' } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getNextInvoiceNumber(10, 'PROFORMA');

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice/next-number?companyId=10&invoiceType=PROFORMA');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults invoiceType to TAX', async () => {
      const mockResponse = { data: { success: true, result: { invoice_number: 'INV-002' } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getNextInvoiceNumber(10);

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice/next-number?companyId=10&invoiceType=TAX');
    });
  });

  // ── getPaymentHistory ───────────────────────────────────────────────────────
  describe('getPaymentHistory', () => {
    it('calls GET /invoice/:invoiceId/payments and returns data', async () => {
      const mockResponse = { data: { success: true, result: [{ id: 1, amount: 500 }] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getPaymentHistory(6);

      expect(axiosApi.get).toHaveBeenCalledWith('/invoice/6/payments');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
