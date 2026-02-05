import { z } from 'zod';

export const TaxIdSchemas = {
    // India
    GSTIN: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
    PAN: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),

    // USA
    EIN: z.string().regex(/^\d{2}-\d{7}$/, "Invalid EIN format (XX-XXXXXXX)"),
    SSN: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)"),

    // UK
    VAT_UK: z.string().regex(/^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/, "Invalid UK VAT format"),
    UTR: z.string().regex(/^\d{10}$/, "Invalid UTR format (10 digits)"),

    // Brazil
    CNPJ: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/, "Invalid CNPJ format (XX.XXX.XXX/YYYY-ZZ)"),
    CPF: z.string().regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, "Invalid CPF format (XXX.XXX.XXX-XX)"),

    // Australia
    ABN: z.string().regex(/^\d{11}$/, "Invalid ABN (11 digits)"),
    ACN: z.string().regex(/^\d{9}$/, "Invalid ACN (9 digits)"),

    // Generic / Lenient
    // Allow alphanumeric, spaces, dots, dashes, slashes. Min 5 chars generally.
    Generic: z.string().min(3, "Tax ID must be at least 3 characters").max(30, "Tax ID must be at most 30 characters"),
    LenientAlphaNum: z.string().regex(/^[A-Za-z0-9\s\.\-\/]+$/, "Contains invalid characters"),
};

export const getValidatorForType = (type: string) => {
    switch (type) {
        case 'GSTIN': return TaxIdSchemas.GSTIN;
        case 'PAN': return TaxIdSchemas.PAN;
        case 'EIN': return TaxIdSchemas.EIN;
        case 'SSN': return TaxIdSchemas.SSN;
        case 'VAT':
            // UK VAT has strict regex, others might not. 
            // If we can distinguish country context here it would be better, but currently we only pass type.
            // We'll use Generic for VAT to be safe globally unless we create specific 'VAT_UK' type usage in frontend.
            // The frontend passes the value from the dropdown. 
            // 'United Kingdom' -> 'VAT' value is 'VAT'. 
            // This means 'VAT' falls back to Generic to support all countries using 'VAT'.
            return TaxIdSchemas.Generic;

        // Specific Strict Validators
        case 'UTR': return TaxIdSchemas.UTR;
        case 'CNPJ': return TaxIdSchemas.CNPJ;
        case 'CPF': return TaxIdSchemas.CPF;
        case 'ABN': return TaxIdSchemas.ABN;
        // ACN is 9 digits
        case 'ACN': return TaxIdSchemas.ACN;

        // Default to Generic for all others (TIN, TRN, UEN, SIRET, etc.) to avoid blocking valid inputs
        default: return TaxIdSchemas.Generic;
    }
};
