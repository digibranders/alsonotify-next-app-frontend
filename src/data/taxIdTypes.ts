export interface TaxIdType {
    label: string;
    value: string;
    placeholder?: string;
    notes?: string;
}

export const TAX_ID_TYPES: Record<string, TaxIdType[]> = {
    // Asia
    'India': [
        { label: 'PAN', value: 'PAN', placeholder: 'Enter PAN (10 chars)', notes: 'Income tax identifier' },
        { label: 'GSTIN', value: 'GSTIN', placeholder: 'Enter GSTIN (15 digits)', notes: 'Goods and Services Tax ID' },
        { label: 'TAN', value: 'TAN', placeholder: 'Enter TAN', notes: 'Tax Deduction and Collection Account Number' },
        { label: 'CIN', value: 'CIN', placeholder: 'Corporate Identity Number', notes: 'Company Registration' }
    ],
    'China': [
        { label: 'USCC', value: 'USCC', placeholder: 'Unified Social Credit Code', notes: 'Unified Social Credit Code' },
        { label: 'Tax ID', value: 'Tax ID', placeholder: 'Taxpayer Identification Number' }
    ],
    'Japan': [
        { label: 'Corporate Number', value: 'Corporate Number', placeholder: '13-digit Corporate Number' },
        { label: 'Invoice No.', value: 'Invoice No.', placeholder: 'T + 13 digits', notes: 'Qualified Invoice Registration No.' }
    ],
    'South Korea': [
        { label: 'Business Registration No.', value: 'Business Registration No.', placeholder: 'XXX-XX-XXXXX', notes: 'Business Registration Number' },
        { label: 'Resident Registration No.', value: 'Resident Registration No.', placeholder: 'YYMMDD-XXXXXXX', notes: 'Individual Tax ID (Sensitive)' }
    ],
    'Singapore': [
        { label: 'UEN', value: 'UEN', placeholder: 'Unique Entity Number', notes: 'Standard Entity Identifier' },
        { label: 'GST', value: 'GST', placeholder: 'GST Registration No.' }
    ],
    'Hong Kong': [
        { label: 'BRN', value: 'BRN', placeholder: 'Business Registration Number' }
    ],
    'Malaysia': [
        { label: 'SST', value: 'SST', placeholder: 'Sales and Service Tax No.' },
        { label: 'SSM', value: 'SSM', placeholder: 'Company Registration' }
    ],
    'Thailand': [
        { label: 'Tax ID', value: 'Tax ID', placeholder: 'Tax Identification Number' },
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration No.' }
    ],
    'Indonesia': [
        { label: 'NPWP', value: 'NPWP', placeholder: 'XX.XXX.XXX.X-XXX.XXX' },
        { label: 'NIB', value: 'NIB', placeholder: 'Business Identification Number' }
    ],
    'Vietnam': [
        { label: 'Tax Code', value: 'Tax Code', placeholder: 'Tax Identification Number' }
    ],
    'Philippines': [
        { label: 'TIN', value: 'TIN', placeholder: 'XXX-XXX-XXX-000' }
    ],
    'Pakistan': [
        { label: 'NTN', value: 'NTN', placeholder: 'National Tax Number' },
        { label: 'STRN', value: 'STRN', placeholder: 'Sales Tax Registration Number' }
    ],
    'Bangladesh': [
        { label: 'TIN', value: 'TIN', placeholder: 'Tax Identification Number' },
        { label: 'BIN', value: 'BIN', placeholder: 'Business Identification Number (VAT)' }
    ],

    // Middle East
    'United Arab Emirates': [
        { label: 'TRN', value: 'TRN', placeholder: 'Tax Registration Number (VAT)' },
        { label: 'Trade License', value: 'Trade License', placeholder: 'Trade License Number' }
    ],
    'Saudi Arabia': [
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' },
        { label: 'CR', value: 'CR', placeholder: 'Commercial Registration' }
    ],
    'Qatar': [
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' },
        { label: 'CR', value: 'CR', placeholder: 'Commercial Registration' },
        { label: 'Tax Card', value: 'Tax Card', placeholder: 'Tax Card Number' }
    ],
    'Kuwait': [
        { label: 'Commercial License', value: 'Commercial License', placeholder: 'Commercial License Number' },
        { label: 'Tax Card', value: 'Tax Card', placeholder: 'Tax Card' }
    ],
    'Oman': [
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' },
        { label: 'CR', value: 'CR', placeholder: 'Commercial Registration' }
    ],
    'Bahrain': [
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' },
        { label: 'CR', value: 'CR', placeholder: 'Commercial Registration' }
    ],
    'Israel': [
        { label: 'VAT', value: 'VAT', placeholder: 'Authorized Dealer / Company No.' },
        { label: 'Company No.', value: 'Company No.', placeholder: 'Registrar of Companies Number' }
    ],
    'Turkey': [
        { label: 'Tax ID', value: 'Tax ID', placeholder: 'Vergi Kimlik Numarası (VKN)' },
        { label: 'MERSIS', value: 'MERSIS', placeholder: 'Central Registry Record System' }
    ],

    // Europe
    'United Kingdom': [
        { label: 'VAT', value: 'VAT', placeholder: 'GB 123 4567 89' },
        { label: 'UTR', value: 'UTR', placeholder: 'Unique Taxpayer Reference (10 digits)' },
        { label: 'CRN', value: 'CRN', placeholder: 'Company Registration Number' }
    ],
    'Germany': [
        { label: 'USt-IdNr', value: 'USt-IdNr', placeholder: 'DE123456789 (VAT)' },
        { label: 'Steuernummer', value: 'Steuernummer', placeholder: 'Tax Number' },
        { label: 'Handelsregister', value: 'Handelsregister', placeholder: 'Commercial Register Number' }
    ],
    'France': [
        { label: 'TVA', value: 'TVA', placeholder: 'FR XX 123456789' },
        { label: 'SIREN', value: 'SIREN', placeholder: '9 digits' },
        { label: 'SIRET', value: 'SIRET', placeholder: '14 digits' }
    ],
    'Italy': [
        { label: 'Partita IVA', value: 'Partita IVA', placeholder: 'IT 12345678901' },
        { label: 'Codice Fiscale', value: 'Codice Fiscale', placeholder: 'Fiscal Code' }
    ],
    'Spain': [
        { label: 'NIF', value: 'NIF', placeholder: 'Tax Identification Number' },
        { label: 'VAT', value: 'VAT', placeholder: 'ES + NIF' }
    ],
    'Netherlands': [
        { label: 'BTW', value: 'BTW', placeholder: 'NL 123456789 B01' },
        { label: 'KvK', value: 'KvK', placeholder: 'Chamber of Commerce Number' }
    ],
    'Belgium': [
        { label: 'VAT', value: 'VAT', placeholder: 'BE 0123.456.789' },
        { label: 'Enterprise No.', value: 'Enterprise No.', placeholder: 'Enterprise Number' }
    ],
    'Sweden': [
        { label: 'VAT', value: 'VAT', placeholder: 'SE 123456789001' },
        { label: 'Org. Number', value: 'Org. Number', placeholder: 'Organisation Number' }
    ],
    'Denmark': [
        { label: 'CVR', value: 'CVR', placeholder: 'DK 12345678' }
    ],
    'Norway': [
        { label: 'MVA', value: 'MVA', placeholder: 'VAT Number' },
        { label: 'Org. Number', value: 'Org. Number', placeholder: 'Organisation Number' }
    ],
    'Switzerland': [
        { label: 'VAT', value: 'VAT', placeholder: 'CHE-123.456.789 MWST' },
        { label: 'UID', value: 'UID', placeholder: 'CHE-123.456.789' }
    ],
    'Ireland': [
        { label: 'VAT', value: 'VAT', placeholder: 'IE 1234567T' },
        { label: 'CRO', value: 'CRO', placeholder: 'Company Registration Number' }
    ],
    'Poland': [
        { label: 'NIP', value: 'NIP', placeholder: 'Tax Identification Number' },
        { label: 'REGON', value: 'REGON', placeholder: 'Statistical Number' }
    ],
    'European Union': [
        { label: 'VAT', value: 'VAT', placeholder: 'EU VAT Number' }
    ],

    // North America
    'United States': [
        { label: 'EIN', value: 'EIN', placeholder: 'XX-XXXXXXX' },
        { label: 'SSN', value: 'SSN', placeholder: 'XXX-XX-XXXX (Individual)' }
    ],
    'Canada': [
        { label: 'BN', value: 'BN', placeholder: 'Business Number (9 digits)' },
        { label: 'GST/HST', value: 'GST/HST', placeholder: 'GST/HST Account Number' }
    ],
    'Mexico': [
        { label: 'RFC', value: 'RFC', placeholder: 'Federal Taxpayer Registry' }
    ],

    // Latin America
    'Brazil': [
        { label: 'CNPJ', value: 'CNPJ', placeholder: 'XX.XXX.XXX/YYYY-ZZ (Entity)' },
        { label: 'CPF', value: 'CPF', placeholder: 'XXX.XXX.XXX-XX (Individual)' }
    ],
    'Argentina': [
        { label: 'CUIT', value: 'CUIT', placeholder: 'Tax Identification Key' }
    ],
    'Chile': [
        { label: 'RUT', value: 'RUT', placeholder: 'Rol Único Tributario' }
    ],
    'Colombia': [
        { label: 'NIT', value: 'NIT', placeholder: 'Tax Identification Number' }
    ],
    'Peru': [
        { label: 'RUC', value: 'RUC', placeholder: 'Single Taxpayer Registry' }
    ],

    // Africa
    'South Africa': [
        { label: 'Income Tax Ref', value: 'Income Tax Ref', placeholder: '10 digits' },
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' }
    ],
    'Nigeria': [
        { label: 'TIN', value: 'TIN', placeholder: 'Tax Identification Number' },
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration Number' }
    ],
    'Kenya': [
        { label: 'KRA PIN', value: 'KRA PIN', placeholder: 'KRA Personal Identification Number' }
    ],
    'Egypt': [
        { label: 'Tax Registration No.', value: 'Tax Registration No.', placeholder: 'Tax Registration Number' },
        { label: 'VAT', value: 'VAT', placeholder: 'VAT Registration' }
    ],

    // Oceania
    'Australia': [
        { label: 'ABN', value: 'ABN', placeholder: 'Australian Business Number' },
        { label: 'ACN', value: 'ACN', placeholder: 'Australian Company Number' }
    ],
    'New Zealand': [
        { label: 'GST', value: 'GST', placeholder: 'GST Number' },
        { label: 'NZBN', value: 'NZBN', placeholder: 'New Zealand Business Number' },
        { label: 'IRD', value: 'IRD', placeholder: 'IRD Number' }
    ]
};

export const DEFAULT_TAX_TYPES: TaxIdType[] = [
    { label: 'Tax ID', value: 'Tax ID', notes: 'Generic Tax Identifier' },
    { label: 'VAT', value: 'VAT', notes: 'Value Added Tax Registration' },
    { label: 'GST', value: 'GST', notes: 'Goods and Services Tax ID' },
    { label: 'Business Reg. No.', value: 'Business Reg. No.', notes: 'Business Registration Number' },
    { label: 'Other', value: 'Other', notes: 'Other Identifier' }
];

export const getTaxIdTypesForCountry = (country: string): TaxIdType[] => {
    if (!country) return DEFAULT_TAX_TYPES;

    if (TAX_ID_TYPES[country]) {
        // Return country specific types plus "Other" for flexibility
        return [...TAX_ID_TYPES[country], { label: 'Other', value: 'Other' }];
    }

    return DEFAULT_TAX_TYPES;
};
