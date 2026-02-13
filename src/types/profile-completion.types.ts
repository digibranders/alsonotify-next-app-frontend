import { UserDocument } from "./domain";

export interface ProfileCompletionData {
    firstName: string;
    lastName: string;
    designation: string;
    email: string;
    dob: string;
    gender: string;
    employeeId: string;
    country: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
    profilePic: string | null;
    documents: UserDocument[];
}

export interface ProfileFieldRequirement {
    key: keyof ProfileCompletionData;
    label: string;
    required: boolean;
}

export interface CompletionResult {
    percentage: number;
    missingFields: string[];
    isComplete: boolean;
}
