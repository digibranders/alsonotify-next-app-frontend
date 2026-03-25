import { describe, it, expect } from 'vitest';
import {
  getQuotationModalConfig,
  getRejectModalConfig,
  getMappingModalConfig,
  getEditModalConfig,
  filterFieldsByContext,
  validateField,
} from './requirementModal';
import type { FieldDefinition, ModalContext } from './requirementModal';

describe('requirementModal', () => {
  describe('getQuotationModalConfig', () => {
    it('should return hourly fields for hourly pricing', () => {
      const config = getQuotationModalConfig('hourly');
      expect(config.title).toBe('Submit Quotation');
      expect(config.submitLabel).toBe('Submit Quote');
      const fieldNames = config.fields.map((f) => f.name);
      expect(fieldNames).toContain('hourly_rate');
      expect(fieldNames).toContain('estimated_hours');
      expect(fieldNames).not.toContain('quoted_price');
      expect(fieldNames).toContain('currency');
      expect(fieldNames).toContain('notes');
    });

    it('should return project fields for project pricing', () => {
      const config = getQuotationModalConfig('project');
      const fieldNames = config.fields.map((f) => f.name);
      expect(fieldNames).toContain('quoted_price');
      expect(fieldNames).not.toContain('hourly_rate');
      expect(fieldNames).not.toContain('estimated_hours');
      expect(fieldNames).toContain('currency');
    });
  });

  describe('getRejectModalConfig', () => {
    it('should return Decline config', () => {
      const config = getRejectModalConfig('decline');
      expect(config.title).toBe('Decline Requirement');
      expect(config.submitLabel).toBe('Decline');
      expect(config.requiresReason).toBe(true);
      expect(config.fields).toHaveLength(1);
      expect(config.fields[0].name).toBe('rejection_reason');
    });

    it('should return Reject Quote config', () => {
      const config = getRejectModalConfig('reject_quote');
      expect(config.title).toBe('Reject Quote');
      expect(config.submitLabel).toBe('Reject');
    });

    it('should return Request Revision config', () => {
      const config = getRejectModalConfig('request_revision');
      expect(config.title).toBe('Request Revision');
      expect(config.submitLabel).toBe('Request Revision');
    });
  });

  describe('getMappingModalConfig', () => {
    it('should return workspace mapping config', () => {
      const config = getMappingModalConfig();
      expect(config.title).toBe('Map to Workspace');
      expect(config.fields).toHaveLength(1);
      expect(config.fields[0].name).toBe('receiver_workspace_id');
      expect(config.fields[0].type).toBe('select');
    });
  });

  describe('getEditModalConfig', () => {
    it('should return edit config with title and description fields', () => {
      const config = getEditModalConfig();
      expect(config.title).toBe('Edit Requirement');
      expect(config.submitLabel).toBe('Save & Resend');
      expect(config.fields).toHaveLength(2);
      const fieldNames = config.fields.map((f) => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('description');
    });
  });

  describe('filterFieldsByContext', () => {
    const fields: readonly FieldDefinition[] = [
      { name: 'always', type: 'text', label: 'Always', required: true },
      { name: 'hourly_only', type: 'number', label: 'Hourly', required: true, condition: (ctx) => ctx.pricingModel === 'hourly' },
      { name: 'project_only', type: 'number', label: 'Project', required: true, condition: (ctx) => ctx.pricingModel === 'project' },
    ];

    it('should include fields without conditions', () => {
      const result = filterFieldsByContext(fields, { pricingModel: 'hourly' });
      expect(result.some((f) => f.name === 'always')).toBe(true);
    });

    it('should include fields where condition is true', () => {
      const result = filterFieldsByContext(fields, { pricingModel: 'hourly' });
      expect(result.some((f) => f.name === 'hourly_only')).toBe(true);
      expect(result.some((f) => f.name === 'project_only')).toBe(false);
    });

    it('should filter for project context', () => {
      const result = filterFieldsByContext(fields, { pricingModel: 'project' });
      expect(result.some((f) => f.name === 'project_only')).toBe(true);
      expect(result.some((f) => f.name === 'hourly_only')).toBe(false);
    });
  });

  describe('validateField', () => {
    it('should return error for required empty field', () => {
      const field: FieldDefinition = { name: 'title', type: 'text', label: 'Title', required: true };
      expect(validateField(field, undefined)).toBe('Title is required');
      expect(validateField(field, '')).toBe('Title is required');
    });

    it('should return undefined for valid required field', () => {
      const field: FieldDefinition = { name: 'title', type: 'text', label: 'Title', required: true };
      expect(validateField(field, 'some text')).toBeUndefined();
    });

    it('should return undefined for optional empty field', () => {
      const field: FieldDefinition = { name: 'notes', type: 'textarea', label: 'Notes', required: false };
      expect(validateField(field, undefined)).toBeUndefined();
      expect(validateField(field, '')).toBeUndefined();
    });

    it('should validate min for numbers', () => {
      const field: FieldDefinition = { name: 'rate', type: 'number', label: 'Rate', required: true, validation: { min: 0 } };
      expect(validateField(field, -1)).toBe('Rate must be at least 0');
      expect(validateField(field, 0)).toBeUndefined();
      expect(validateField(field, 100)).toBeUndefined();
    });

    it('should validate max for numbers', () => {
      const field: FieldDefinition = { name: 'rate', type: 'number', label: 'Rate', required: true, validation: { max: 1000 } };
      expect(validateField(field, 1001)).toBe('Rate must be at most 1000');
      expect(validateField(field, 1000)).toBeUndefined();
    });

    it('should validate minLength for strings', () => {
      const field: FieldDefinition = { name: 'reason', type: 'textarea', label: 'Reason', required: true, validation: { minLength: 10 } };
      expect(validateField(field, 'short')).toBe('Reason must be at least 10 characters');
      expect(validateField(field, 'long enough text here')).toBeUndefined();
    });

    it('should validate maxLength for strings', () => {
      const field: FieldDefinition = { name: 'notes', type: 'textarea', label: 'Notes', required: false, validation: { maxLength: 10 } };
      expect(validateField(field, 'this is way too long')).toBe('Notes must be at most 10 characters');
    });

    it('should return undefined when no validation rules and field is not required', () => {
      const field: FieldDefinition = { name: 'notes', type: 'textarea', label: 'Notes', required: false };
      expect(validateField(field, 'anything')).toBeUndefined();
    });
  });
});
