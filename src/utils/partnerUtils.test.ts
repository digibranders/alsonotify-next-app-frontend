import { describe, it, expect } from 'vitest';
import { getPartnerId, getPartnerName, isValidPartner, getPartnerOptions, getPartnerCompanyId } from './partnerUtils';

describe('partnerUtils', () => {
  describe('getPartnerId', () => {
    it('should prioritize partner_user_id', () => {
      expect(getPartnerId({ partner_user_id: 1, user_id: 2, id: 3 })).toBe(1);
    });

    it('should fall back to user_id', () => {
      expect(getPartnerId({ user_id: 2, id: 3 })).toBe(2);
    });

    it('should fall back to client_id', () => {
      expect(getPartnerId({ client_id: 4 })).toBe(4);
    });

    it('should fall back to outsource_id', () => {
      expect(getPartnerId({ outsource_id: 5 })).toBe(5);
    });

    it('should fall back to association_id', () => {
      expect(getPartnerId({ association_id: 6 })).toBe(6);
    });

    it('should fall back to invite_id', () => {
      expect(getPartnerId({ invite_id: 7 })).toBe(7);
    });

    it('should fall back to id', () => {
      expect(getPartnerId({ id: 8 })).toBe(8);
    });

    it('should return undefined for empty object', () => {
      expect(getPartnerId({})).toBeUndefined();
    });
  });

  describe('getPartnerName', () => {
    it('should use partner_user.name', () => {
      expect(getPartnerName({ partner_user: { name: 'John' } })).toBe('John');
    });

    it('should use name fallback', () => {
      expect(getPartnerName({ name: 'Alice' })).toBe('Alice');
    });

    it('should use email as last resort', () => {
      expect(getPartnerName({ email: 'test@example.com' })).toBe('test@example.com');
    });

    it('should return Unknown Partner for empty object', () => {
      expect(getPartnerName({})).toBe('Unknown Partner');
    });
  });

  describe('isValidPartner', () => {
    it('should return true for ACCEPTED status', () => {
      expect(isValidPartner({ status: 'ACCEPTED' })).toBe(true);
    });

    it('should return true for is_active', () => {
      expect(isValidPartner({ is_active: true })).toBe(true);
    });

    it('should return false for PENDING status without is_active', () => {
      expect(isValidPartner({ status: 'PENDING' })).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isValidPartner({})).toBe(false);
    });
  });

  describe('getPartnerOptions', () => {
    it('should map partners to label/value options', () => {
      const partners = [
        { partner_user_id: 1, partner_user: { name: 'John' }, status: 'ACCEPTED' },
        { partner_user_id: 2, name: 'Alice', is_active: true },
      ];
      const options = getPartnerOptions(partners);
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: 'John', value: '1' });
    });

    it('should return empty array for empty input', () => {
      expect(getPartnerOptions([])).toEqual([]);
    });
  });

  describe('getPartnerCompanyId', () => {
    it('should return company_id if present', () => {
      expect(getPartnerCompanyId({ company_id: 10 })).toBe(10);
    });

    it('should return company.id if company is object', () => {
      expect(getPartnerCompanyId({ company: { id: 20 } })).toBe(20);
    });

    it('should fall back to getPartnerId', () => {
      expect(getPartnerCompanyId({ partner_user_id: 1 })).toBe(1);
    });

    it('should return undefined for null', () => {
      expect(getPartnerCompanyId(null)).toBeUndefined();
    });
  });
});
