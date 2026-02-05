import { describe, it, expect } from 'vitest';
import { getValidatorForType } from './taxIdValidators';

describe('Tax ID Validators', () => {
    it('validates GSTIN correctly', () => {
        const validator = getValidatorForType('GSTIN');
        // Valid GSTIN
        expect(validator.safeParse('22AAAAA0000A1Z5').success).toBe(true);
        // Invalid length
        expect(validator.safeParse('22AAAAA0000A1Z').success).toBe(false);
        // Invalid characters
        expect(validator.safeParse('22AAAAA0000A1Z!').success).toBe(false);
    });

    it('validates PAN correctly', () => {
        const validator = getValidatorForType('PAN');
        expect(validator.safeParse('ABCDE1234F').success).toBe(true);
        expect(validator.safeParse('ABCDE12345').success).toBe(false); // Last char must be letter
    });

    it('validates EIN correctly', () => {
        const validator = getValidatorForType('EIN');
        expect(validator.safeParse('12-3456789').success).toBe(true);
        expect(validator.safeParse('123456789').success).toBe(false); // Missing dash
    });

    it('falls back to generic validator for unknown types', () => {
        const validator = getValidatorForType('UnknownType');
        expect(validator.safeParse('123').success).toBe(true);
        expect(validator.safeParse('12').success).toBe(false); // Too short
    });
});
