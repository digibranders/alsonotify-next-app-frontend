import { describe, it, expect } from 'vitest';
import { calculateProfileCompletion } from './profile.utils';
import { ProfileCompletionData } from '../types/profile-completion.types';
import { DocumentType } from '../types/domain';

const makeFullProfile = (overrides: Partial<ProfileCompletionData> = {}): ProfileCompletionData => ({
  firstName: 'John',
  lastName: 'Doe',
  designation: 'Engineer',
  email: 'john@example.com',
  dob: '1990-01-01',
  gender: 'Male',
  employeeId: 'EMP001',
  country: 'India',
  addressLine1: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
  emergencyContactName: 'Jane Doe',
  emergencyContactNumber: '+911234567890',
  profilePic: 'https://example.com/pic.jpg',
  documents: [],
  ...overrides,
});

const makeEmptyProfile = (): ProfileCompletionData => ({
  firstName: '',
  lastName: '',
  designation: '',
  email: '',
  dob: '',
  gender: '',
  employeeId: '',
  country: '',
  addressLine1: '',
  city: '',
  state: '',
  zipCode: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
  profilePic: null,
  documents: [],
});

describe('calculateProfileCompletion', () => {
  it('should return 100% for a fully completed profile', () => {
    const result = calculateProfileCompletion(makeFullProfile());
    expect(result.percentage).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should return 0% for an empty profile', () => {
    const result = calculateProfileCompletion(makeEmptyProfile());
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('should detect missing fields', () => {
    const profile = makeFullProfile({ firstName: '', email: '' });
    const result = calculateProfileCompletion(profile);
    expect(result.missingFields).toContain('First Name');
    expect(result.missingFields).toContain('Email');
    expect(result.isComplete).toBe(false);
  });

  it('should treat null profilePic as missing', () => {
    const profile = makeFullProfile({ profilePic: null });
    const result = calculateProfileCompletion(profile);
    expect(result.missingFields).toContain('Profile Picture');
  });

  it('should treat whitespace-only strings as missing', () => {
    const profile = makeFullProfile({ firstName: '   ' });
    const result = calculateProfileCompletion(profile);
    expect(result.missingFields).toContain('First Name');
  });

  it('should calculate correct percentage for partial completion', () => {
    // 15 required fields total. Fill 10, leave 5 empty.
    const profile = makeFullProfile({
      dob: '',
      gender: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      profilePic: null,
    });
    const result = calculateProfileCompletion(profile);
    // 10 of 15 filled = 67%
    expect(result.percentage).toBe(67);
    expect(result.missingFields).toHaveLength(5);
  });

  describe('with required documents', () => {
    const requiredDocTypes: DocumentType[] = [
      { id: 'doc-1', name: 'ID Proof', required: true },
      { id: 'doc-2', name: 'Address Proof', required: true },
      { id: 'doc-3', name: 'Optional Doc', required: false },
    ];

    it('should include required documents in total calculation', () => {
      const profile = makeFullProfile({ documents: [] });
      const result = calculateProfileCompletion(profile, requiredDocTypes);
      // 15 standard fields + 2 required docs = 17 total, 15 filled
      expect(result.percentage).toBe(Math.round((15 / 17) * 100));
      expect(result.missingFields).toContain('Document: ID Proof');
      expect(result.missingFields).toContain('Document: Address Proof');
    });

    it('should count uploaded documents', () => {
      const profile = makeFullProfile({
        documents: [
          {
            id: 'u1', documentTypeId: 'doc-1', documentTypeName: 'ID Proof',
            fileName: 'id.pdf', fileSize: 1024, fileUrl: '/id.pdf',
            uploadedDate: '2025-01-01', fileType: 'pdf', isRequired: true,
          },
        ],
      });
      const result = calculateProfileCompletion(profile, requiredDocTypes);
      // 15 + 1 filled out of 17
      expect(result.percentage).toBe(Math.round((16 / 17) * 100));
      expect(result.missingFields).not.toContain('Document: ID Proof');
      expect(result.missingFields).toContain('Document: Address Proof');
    });

    it('should return 100% when all fields and docs are filled', () => {
      const profile = makeFullProfile({
        documents: [
          {
            id: 'u1', documentTypeId: 'doc-1', documentTypeName: 'ID Proof',
            fileName: 'id.pdf', fileSize: 1024, fileUrl: '/id.pdf',
            uploadedDate: '2025-01-01', fileType: 'pdf', isRequired: true,
          },
          {
            id: 'u2', documentTypeId: 'doc-2', documentTypeName: 'Address Proof',
            fileName: 'addr.pdf', fileSize: 2048, fileUrl: '/addr.pdf',
            uploadedDate: '2025-01-01', fileType: 'pdf', isRequired: true,
          },
        ],
      });
      const result = calculateProfileCompletion(profile, requiredDocTypes);
      expect(result.percentage).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should not require non-required document types', () => {
      const profile = makeFullProfile({ documents: [] });
      const result = calculateProfileCompletion(profile, [
        { id: 'doc-3', name: 'Optional Doc', required: false },
      ]);
      // Only 15 standard fields, 0 required docs
      expect(result.percentage).toBe(100);
      expect(result.missingFields).not.toContain('Document: Optional Doc');
    });
  });
});
