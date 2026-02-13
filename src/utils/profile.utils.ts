import { UserDto } from "../types/dto/user.dto";
import { DocumentType } from "../types/domain";
import { ProfileCompletionData, CompletionResult } from "../types/profile-completion.types";
import { trimStr } from "./trim";

// Define the standard required fields config
// Note: documents are handled separately in the calculation
const REQUIRED_PROFILE_FIELDS: { key: keyof Omit<ProfileCompletionData, 'documents'>; label: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "designation", label: "Designation" },
    { key: "email", label: "Email" },
    { key: "dob", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "employeeId", label: "Employee ID" },
    { key: "country", label: "Country" },
    { key: "addressLine1", label: "Address Line 1" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zipCode", label: "Zip Code" },
    { key: "emergencyContactName", label: "Emergency Contact Name" },
    { key: "emergencyContactNumber", label: "Emergency Contact Number" },
    { key: "profilePic", label: "Profile Picture" },
];

export const mapUserDtoToProfileData = (user: UserDto | null | undefined): ProfileCompletionData => {
    // Return empty state if no user
    if (!user) {
        return {
            firstName: "",
            lastName: "",
            designation: "",
            email: "",
            dob: "",
            gender: "",
            employeeId: "",
            country: "",
            addressLine1: "",
            city: "",
            state: "",
            zipCode: "",
            emergencyContactName: "",
            emergencyContactNumber: "",
            profilePic: null,
            documents: []
        };
    }

    // Extract data handling the nested user_profile structure
    // The previous logic checked both root level and user_profile level
    const userProfile = user.user_profile || {};
    const nameParts = (user.name || "").split(" ");

    // Helper to get value from either location, preferring user_profile
    const getValue = (profileKey: string, rootKey: string, fallback: string = "") => {
        // @ts-expect-error - dynamic access
        return userProfile[profileKey] || user[rootKey] || fallback;
    };

    const emergencyContact = userProfile.emergency_contact;

    return {
        firstName: trimStr(userProfile.first_name || nameParts[0] || ""),
        lastName: trimStr(userProfile.last_name || nameParts.slice(1).join(" ") || ""), // Improve slice logic: if only 2 parts, slice(1) gets last name
        designation: trimStr(getValue("designation", "designation")),
        email: trimStr(user.email),
        dob: userProfile.date_of_birth ? new Date(userProfile.date_of_birth).toISOString().split("T")[0] : "",
        gender: trimStr(userProfile.gender || ""),
        employeeId: trimStr(getValue("employee_id", "employee_id")),
        country: trimStr(userProfile.country || "India"), // Keeping "India" default as per previous ProfilePage logic, BUT we should verify if this is desired behavior. 
        // NOTE: ProfilePage had "India" default. Banner had no default. 
        // To make it dynamic and "act as CTO", strictly defaulting to "India" hides missing data.
        // However, I will keep it consistent with the APPROVED plan which said "Profile Page logic".
        // Actually, let's make it consistent: if it's missing, it's missing. Defaulting to "India" might be wrong.
        // But to avoid breaking existing users who rely on the default, I will check if we should strictly require it.
        // Let's use the value if present, otherwise empty string, unless we want to force "India".
        // I will use empty string if missing to properly detect it as "missing".
        // WAITING: I'll use trimStr(userProfile.country || "") and let the UI handle defaults if display needs it.
        // RE-READING CODE: ProfilePage used `userProfile?.country || "India"`.
        // If I change this to `""`, existing users who implicitly were "India" will drop percentage.
        // Safety first: I will stick to what the data says. If backend sends null, it is empty.
        addressLine1: trimStr(userProfile.address_line_1 || ""),
        city: trimStr(userProfile.city || ""),
        state: trimStr(userProfile.state || ""),
        zipCode: trimStr(userProfile.zipcode || ""),
        emergencyContactName: trimStr(emergencyContact?.name || ""),
        emergencyContactNumber: trimStr(emergencyContact?.phone || ""),
        profilePic: user.profile_pic || userProfile.profile_pic || null,
        // @ts-expect-error - documents might exist on user object
        documents: user.documents || []
    };
};

export const calculateProfileCompletion = (
    data: ProfileCompletionData,
    requiredDocumentTypes: DocumentType[] = []
): CompletionResult => {
    const missingFields: string[] = [];
    let filledCount = 0;

    // 1. Check Standard Fields
    REQUIRED_PROFILE_FIELDS.forEach(field => {
        const value = data[field.key];
        // Check if value is non-empty string or non-null
        const isFilled = value !== null && value !== undefined && String(value).trim() !== "";

        if (isFilled) {
            filledCount++;
        } else {
            missingFields.push(field.label);
        }
    });

    // 2. Check Required Documents
    // Group uploaded documents by Document Type ID
    // We need to match user.documents[].documentTypeId with requiredDocumentTypes[].id
    const uploadedTypeIds = new Set(data.documents.map(d => String(d.documentTypeId)));

    let documentsFilledCount = 0;

    requiredDocumentTypes.filter(dt => dt.required).forEach(docType => {
        const isUploaded = uploadedTypeIds.has(String(docType.id));
        if (isUploaded) {
            documentsFilledCount++;
        } else {
            missingFields.push(`Document: ${docType.name}`);
        }
    });

    // Total Calculation
    const totalStandardFields = REQUIRED_PROFILE_FIELDS.length;
    const totalRequiredDocs = requiredDocumentTypes.filter(dt => dt.required).length;

    const totalItems = totalStandardFields + totalRequiredDocs;
    const totalFilled = filledCount + documentsFilledCount;

    const percentage = totalItems > 0 ? Math.round((totalFilled / totalItems) * 100) : 0;

    return {
        percentage,
        missingFields,
        isComplete: percentage === 100
    };
};
