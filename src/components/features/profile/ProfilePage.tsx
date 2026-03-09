
import { useState, useMemo, useEffect, useRef } from "react";
import { Button, Input, Select, Divider, Upload, Switch, Progress, App, Space } from "antd";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/Skeleton";
import { Camera, Pencil, FileText, Bell, Shield, User, Briefcase } from "lucide-react";
import Image from "next/image";
import { PageLayout } from "../../layout/PageLayout";
import { useUserDetails, useUpdateProfile, useUpdatePassword } from "@/hooks/useUser";
import { DocumentCard } from "@/components/ui/DocumentCard";
import { DocumentPreviewModal } from "@/components/ui/DocumentPreviewModal";
import { UserDocument } from "@/types/domain";
import { useDocumentSettings } from "@/hooks/useDocumentSettings";
import { getErrorMessage } from "@/types/api-utils";
import { fileService } from "@/services/file.service";
import { UpdateUserProfileRequestDto, UserDto } from "@/types/dto/user.dto";
import { trimStr } from "@/utils/trim";
import { mapUserDtoToProfileData, calculateProfileCompletion } from "@/utils/profile.utils";
import { queryKeys } from "@/lib/queryKeys";
import UpgradeToOrgModal from "@/components/modals/UpgradeToOrgModal";


interface UserProfile {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    mobile_number?: string;
    phone?: string;
    address_line_1?: string;
    address_line_2?: string;
    working_hours?: { start_time?: string; end_time?: string };
    designation?: string;
    date_of_birth?: string;
    gender?: string;
    employee_id?: string;
    employment_type?: string;
    date_of_joining?: string;
    experience?: number;
    salary_yearly?: number;
    hourly_rates?: number;
    no_of_leaves?: number;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
    department?: string;
    emergency_contact?: { name?: string; relationship?: string; phone?: string };
}

const { Option } = Select;

const countryCodes = [
    { code: "+1", country: "US" },
    { code: "+91", country: "IN" },
    { code: "+44", country: "UK" },
    { code: "+61", country: "AU" },
    { code: "+81", country: "JP" },
    { code: "+49", country: "DE" },
];

export function ProfilePage() {
    const { documentTypes } = useDocumentSettings();
    const { message } = App.useApp();
    const { data: currentUserData, isLoading } = useUserDetails();
    // Note: useUserDetails hook transforms result via mapUserDtoToEmployee,
    // so result IS the user/employee object, not { user, access, token }
    const user = currentUserData?.result;
    const updateProfileMutation = useUpdateProfile();
    const updatePasswordMutation = useUpdatePassword();
    const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);


    // Initialize profile state with real data or fallback to mock data
    const initialProfile = useMemo(() => {
        // Use shared mapper for base fields
        const baseProfile = mapUserDtoToProfileData(user as unknown as UserDto);

        // user_profile is an array in the User model definition
        const rawUserProfile = user?.user_profile;
        const userProfile = (Array.isArray(rawUserProfile) ? rawUserProfile[0] : rawUserProfile || {}) as UserProfile;

        const fullName = user?.name || "";
        const nameParts = fullName.split(" ");

        // Parse working hours
        const workingHours = userProfile?.working_hours || {};

        // Helper to get mobile/phone since not in baseProfile? 
        // actually baseProfile doesn't have phone separate from country code/splitting logic
        // helper for phone parsing
        const fullMobileNumber =
            userProfile?.mobile_number ||
            user?.mobile_number ||
            userProfile?.phone ||
            user?.phone ||
            "";

        let phone = fullMobileNumber;
        let countryCode = "+91";

        // Parse country code
        if (phone && phone.startsWith("+")) {
            const matched = countryCodes.find(c => phone.startsWith(c.code));
            if (matched) {
                countryCode = matched.code;
                phone = phone.replace(matched.code, "").trim();
            }
        } else if (!phone) {
            phone = "";
        }

        return {
            ...baseProfile,
            // Add fields that are not in ProfileCompletionData or need specific handling
            middleName: userProfile?.middle_name || (nameParts.length > 2 ? nameParts[1] : "") || "",
            phone: phone,
            countryCode: countryCode,

            // Employment Details (Read only mostly)
            employmentType: userProfile?.employment_type || "Full-time",
            dateOfJoining: userProfile?.date_of_joining
                ? new Date(userProfile.date_of_joining)
                    .toISOString()
                    .split("T")[0]
                : "",
            experience: userProfile?.experience || 0,
            startTime: workingHours?.start_time || "09:30",
            endTime: workingHours?.end_time || "18:30",
            salary: userProfile?.salary_yearly || 0,
            hourlyRate: userProfile?.hourly_rates || 0,
            leaves: userProfile?.no_of_leaves || 0,

            addressLine2: userProfile?.address_line_2 || "",

            department: (function () {
                const u = user as unknown as UserDto;
                if (!u?.department) return "-";
                if (typeof u.department === 'object') return u.department.name;
                return u.department;
            })(),
            emergencyRelationship: userProfile?.emergency_contact?.relationship || "",
        };
    }, [user]);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState(initialProfile);

    // Notification preferences state
    const [notificationPreferences, setNotificationPreferences] = useState({
        emailNotifications: true,
        securityAlerts: true,
    });
    const [selectedDocument, setSelectedDocument] =
        useState<UserDocument | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: uploadedFiles } = useQuery({
        queryKey: ['files', 'employee-documents', user?.id],
        queryFn: () => fileService.listFiles('EMPLOYEE_DOCUMENT', Number(user?.id)),
        enabled: !!user?.id
    });

    const documents = useMemo(() => {
        const files = uploadedFiles || [];
        const result: UserDocument[] = [];

        // Map files by type name for easy lookup
        const filesByType = new Map<string, any[]>();
        files.forEach(file => {
            const typeName = file.document_type_name || 'Uncategorized';
            if (!filesByType.has(typeName)) {
                filesByType.set(typeName, []);
            }
            filesByType.get(typeName)!.push(file);
        });

        const mapMimeTypeToDocType = (mimeType: string): UserDocument['fileType'] => {
            if (!mimeType) return 'pdf';
            if (mimeType.includes('pdf')) return 'pdf';
            if (mimeType.includes('word') || mimeType.includes('doc')) return 'docx';
            if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'excel';
            if (mimeType.includes('image')) return 'image';
            if (mimeType.includes('text')) return 'text';
            return 'pdf';
        };

        // Add configured types
        if (documentTypes) {
            documentTypes.forEach(type => {
                const matchingFiles = filesByType.get(type.name);
                if (matchingFiles && matchingFiles.length > 0) {
                    matchingFiles.forEach(file => {
                        result.push({
                            id: String(file.id),
                            documentTypeId: type.id,
                            documentTypeName: type.name,
                            fileName: file.file_name,
                            fileSize: file.file_size,
                            fileUrl: file.download_url || '',
                            uploadedDate: file.created_at,
                            fileType: mapMimeTypeToDocType(file.file_type),
                            isRequired: type.required
                        });
                    });
                    filesByType.delete(type.name);
                } else {
                    result.push({
                        id: type.id,
                        documentTypeId: type.id,
                        documentTypeName: type.name,
                        fileName: '',
                        fileSize: 0,
                        fileUrl: '',
                        uploadedDate: '',
                        fileType: 'pdf',
                        isRequired: type.required
                    });
                }
            });
        }

        // Add remaining files
        filesByType.forEach((remainingFiles, typeName) => {
            remainingFiles.forEach(file => {
                result.push({
                    id: String(file.id),
                    documentTypeId: 'other-' + file.id,
                    documentTypeName: typeName,
                    fileName: file.file_name,
                    fileSize: file.file_size,
                    fileUrl: file.download_url || '',
                    uploadedDate: file.created_at,
                    fileType: mapMimeTypeToDocType(file.file_type),
                    isRequired: false
                });
            });
        });

        return result;
    }, [documentTypes, uploadedFiles]);

    // Update profile when user data changes
    useEffect(() => {
        setProfile(initialProfile);
    }, [initialProfile]);

    const handleDocumentPreview = (document: UserDocument) => {
        setSelectedDocument(document);
        setIsPreviewModalOpen(true);
    };

    const handleDocumentDownload = (document: UserDocument) => {
        if (document.fileUrl) {
            window.open(document.fileUrl, "_blank");
        } else {
            message.warning("Document URL not available");
        }
    };

    const handleDocumentUpload = (documentTypeId: string) => {
        setUploadingDocType(documentTypeId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !uploadingDocType || !user?.id) return;

        // Validate file size (20MB limit)
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            message.error(`File size must be less than 20MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        try {
            message.loading({ content: 'Uploading document...', key: 'doc-upload' });

            // Find the document type name
            const docType = documentTypes?.find(dt => dt.id === uploadingDocType);
            const docTypeName = docType?.name || 'Supporting Document';

            await fileService.uploadEmployeeDocument(
                file,
                Number(user.id),
                docTypeName
            );

            message.success({ content: 'Document uploaded successfully!', key: 'doc-upload' });

            // Refresh user data to show the new document
            queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });

        } catch (error) {
            console.error('Upload failed:', error);
            message.error({ content: 'Failed to upload document', key: 'doc-upload' });
        } finally {
            setUploadingDocType(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const renderField = (
        label: string,
        value: string,
        field: keyof typeof profile,
        type: string = "text",
        placeholder: string = "-",
        onChange?: (val: string) => void
    ) => {
        return (
            <div className="space-y-2">
                <div className="text-[0.8125rem] font-bold text-[#111111]">
                    {label}
                </div>
                <Input
                    value={value}
                    onChange={(e) => {
                        const newVal = e.target.value;
                        setProfile((prev) => ({ ...prev, [field]: newVal }));
                        if (onChange) onChange(newVal);
                    }}
                    placeholder={placeholder}
                    type={type}
                    disabled={!isEditing}
                    className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] focus:ring-[#ff3b3b]/10 font-medium text-[0.8125rem] ${!isEditing ? "bg-[#FAFAFA] text-[#666666]" : "bg-white"
                        }`}
                />
            </div>
        );
    };

    const handleZipCodeChange = async (zip: string) => {
        if (zip.length >= 5) {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?postalcode=${zip}&format=json&addressdetails=1`
                );
                const data = await response.json();
                if (data && data.length > 0) {
                    const addr = data[0].address;
                    setProfile(prev => ({
                        ...prev,
                        city: addr.city || addr.town || addr.village || addr.suburb || prev.city,
                        state: addr.state || prev.state,
                        country: addr.country || prev.country
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch address details:", error);
            }
        }
    };

    const renderSelect = (
        label: string,
        value: string,
        field: keyof typeof profile,
        options: string[]
    ) => {
        return (
            <div className="space-y-2">
                <div className="text-[0.8125rem] font-bold text-[#111111]">
                    {label}
                </div>
                <Select
                    value={profile[field]}
                    onChange={(v) =>
                        setProfile({ ...profile, [field]: String(v) })
                    }
                    disabled={!isEditing}
                    className={`w-full h-11 ${!isEditing ? "bg-[#FAFAFA]" : ""
                        }`}
                >
                    {options.map((opt) => (
                        <Option key={opt} value={opt}>
                            {opt}
                        </Option>
                    ))}
                </Select>
            </div>
        );
    };

    const handleSaveChanges = async () => {
        try {
            const fullMobileNumber = `${trimStr(profile.countryCode) || "+91"} ${trimStr(profile.phone)}`.trim();
            const userProfilePayload: UpdateUserProfileRequestDto = {
                name: `${trimStr(profile.firstName)} ${trimStr(profile.lastName)}`.trim(),
                email: trimStr(profile.email),
                first_name: trimStr(profile.firstName),
                middle_name: trimStr(profile.middleName) || undefined,
                last_name: trimStr(profile.lastName),
                mobile_number: fullMobileNumber,
                designation: trimStr(profile.designation) || undefined,
                date_of_birth: profile.dob
                    ? new Date(profile.dob).toISOString()
                    : null,
                gender: trimStr(profile.gender) || undefined,
                employee_id: trimStr(profile.employeeId) || undefined,
                address_line_1: trimStr(profile.addressLine1) || undefined,
                address_line_2: trimStr(profile.addressLine2) || undefined,
                city: trimStr(profile.city) || undefined,
                state: trimStr(profile.state) || undefined,
                zipcode: trimStr(profile.zipCode) || undefined,
                country: trimStr(profile.country) || undefined,
                emergency_contact: {
                    name: trimStr(profile.emergencyContactName),
                    relationship: trimStr(profile.emergencyRelationship),
                    phone: trimStr(profile.emergencyContactNumber),
                },
            };

            await updateProfileMutation.mutateAsync(userProfilePayload);

            message.success("Profile updated successfully!");
            setIsEditing(false);
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, "Failed to update profile");
            message.error(errorMessage);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Reset changes if needed
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    // Calculate profile completion percentage
    const profileCompletion = useMemo(() => {
        // Construct standard ProfileCompletionData from local state
        const completionData = {
            firstName: profile.firstName,
            lastName: profile.lastName,
            designation: profile.designation,
            email: profile.email,
            dob: profile.dob,
            gender: profile.gender,
            employeeId: profile.employeeId,
            country: profile.country,
            addressLine1: profile.addressLine1,
            city: profile.city,
            state: profile.state,
            zipCode: profile.zipCode,
            emergencyContactName: profile.emergencyContactName,
            emergencyContactNumber: profile.emergencyContactNumber,
            profilePic: profile.profilePic,
            documents: profile.documents
        };

        const { percentage } = calculateProfileCompletion(completionData, documentTypes);
        return percentage;
    }, [profile, documentTypes]);

    return (
        <PageLayout
            title="My Profile"
            titleExtra={
                <div className="flex items-center gap-8">
                    {/* Profile Completion - Back in header, no background */}
                    <div className="min-w-[180px]">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-[#666666]">
                                Profile Completion
                            </span>
                            <span className={`text-xs font-semibold ${profileCompletion === 100
                                ? 'text-[#2ecc71]'
                                : profileCompletion >= 50
                                    ? 'text-[#3b8eff]'
                                    : 'text-[#ff3b3b]'
                                }`}>
                                {profileCompletion}%
                            </span>
                        </div>
                        <Progress
                            percent={profileCompletion}
                            showInfo={false}
                            strokeColor={
                                profileCompletion === 100
                                    ? "#2ecc71"
                                    : profileCompletion >= 50
                                        ? "#3b8eff"
                                        : "#ff3b3b"
                            }
                            size={{ height: 6 }}
                            railColor="#EEEEEE"
                            className="m-0"
                        />
                    </div>

                    {/* Actions */}
                    {!isEditing ? (
                        <div className="flex items-center gap-3">
                            {user?.account_type === "INDIVIDUAL" && (
                                <Button
                                    onClick={() => setUpgradeModalVisible(true)}
                                    className="bg-black hover:bg-black/90 text-white font-semibold px-6 h-10 rounded-full text-[0.8125rem] flex items-center gap-2 border-none"
                                >
                                    <Briefcase className="w-4 h-4" />
                                    Upgrade to Organization
                                </Button>
                            )}
                            <Button
                                onClick={handleEdit}
                                className="bg-[#111111] hover:bg-[#000000]/90 text-white font-semibold px-6 h-10 rounded-full text-[0.8125rem] flex items-center gap-2 border-none"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleCancelEdit}
                                type="text"
                                className="text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] font-semibold px-6 h-10 rounded-full text-[0.8125rem]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveChanges}
                                loading={updateProfileMutation.isPending}
                                className="bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white font-semibold px-8 h-10 rounded-full shadow-lg shadow-[#ff3b3b]/20 text-[0.8125rem] border-none"
                            >
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="flex flex-col h-full">
                {isLoading ? (
                    <div className="flex-1 overflow-y-auto pr-2 pb-10 animate-pulse">
                        <div className="mb-8">
                            <Skeleton className="h-4 w-64 mb-2" />
                        </div>

                        <section className="mb-10">
                            <div className="flex flex-col md:flex-row gap-10 items-stretch mb-8">
                                <div className="shrink-0 w-32 flex flex-col justify-between">
                                    <Skeleton className="h-6 w-32 mb-8" />
                                    <Skeleton className="w-32 h-32 rounded-full mx-auto" />
                                </div>
                                <div className="flex-1 w-full space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                            </div>
                        </section>

                        <Divider className="my-8 bg-[#EEEEEE]" />

                        <section className="mb-10">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <>
                        {/* Header Info - Static area */}
                        <div className="mb-4">
                            <p className="text-[0.8125rem] text-[#666666] font-normal">
                                Manage your account settings and preferences
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 pb-10">
                            {/* Personal Details */}
                            <section className="mb-6">
                                <div className="flex flex-col md:flex-row gap-10 items-stretch mb-8">
                                    {/* Left Sidebar: Heading & Avatar */}
                                    <div className="shrink-0 w-32 flex flex-col justify-between">
                                        <h2 className="text-base font-semibold text-[#111111] whitespace-nowrap self-start">
                                            Personal Details
                                        </h2>

                                        <div className="relative group self-center">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border border-[#EEEEEE] shadow-sm flex items-center justify-center bg-gray-50">
                                                {(user?.profile_pic) ? (
                                                    <Image
                                                        src={user?.profile_pic || ""}
                                                        alt="Profile"
                                                        width={128}
                                                        height={128}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-16 h-16 text-gray-300" />
                                                )}
                                            </div>

                                            {isEditing && (
                                                <div className="absolute -bottom-1 -right-1">
                                                    <Upload
                                                        name="avatar"
                                                        showUploadList={false}
                                                        customRequest={async ({ file, onSuccess, onError }) => {
                                                            try {
                                                                message.loading({ content: 'Uploading avatar...', key: 'avatar-upload' });
                                                                const fileObj = file as File;

                                                                if (!user?.id) {
                                                                    throw new Error('User ID not found');
                                                                }

                                                                const result = await fileService.uploadFile(
                                                                    fileObj,
                                                                    'USER_PROFILE_PICTURE',
                                                                    Number(user.id)
                                                                );

                                                                if (result.download_url) {
                                                                    // We need to update the local user state to reflect the change immediately
                                                                    // Since we use useUserDetails hook, we might need to invalidate query
                                                                    // For now, let's trust the re-fetch or optimistically update if we had a set function
                                                                    // But updateProfileMutation is for text fields.
                                                                    // We might need to manually trigger a profile update to save the URL if the backend doesn't auto-save it on upload confirm?
                                                                    // Actually fileService.uploadFile confirms with backend, and backend 'confirm' logic usually saves the attachment.
                                                                    // But does it link it to the user's profile_pic field?
                                                                    // In 'confirmUploadService' in backend, we need to check if it updates the entity.
                                                                    // The current backend implementation just creates a FileAttachment record.
                                                                    // It does NOT automatically update User.profile_pic.
                                                                    // So we should call updateProfileMutation with the new URL?
                                                                    // Wait, updateProfileMutation takes UserProfile payload.
                                                                    // Let's check updateProfileMutation in useUser.ts.

                                                                    // Actually, let's just upload it, and rely on the fact that we might need to send the URL in handleSaveChanges?
                                                                    // No, upload is separate. We should probably update the profile immediately with the new URL.

                                                                    await updateProfileMutation.mutateAsync({
                                                                        name: user?.name || `${profile.firstName} ${profile.lastName}`.trim(),
                                                                        profile_pic: result.download_url
                                                                    });

                                                                    onSuccess?.(result);
                                                                    message.success({ content: 'Avatar uploaded!', key: 'avatar-upload' });
                                                                } else {
                                                                    throw new Error('No download URL returned');
                                                                }
                                                            } catch (error) {
                                                                console.error('Avatar upload error:', error);
                                                                onError?.(error as Error);
                                                                message.error({ content: 'Failed to upload avatar', key: 'avatar-upload' });
                                                            }
                                                        }}
                                                        beforeUpload={(file) => {
                                                            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
                                                            if (!isJpgOrPng) {
                                                                message.error('You can only upload JPG/PNG file!');
                                                                return Upload.LIST_IGNORE;
                                                            }
                                                            const isLt5M = file.size / 1024 / 1024 < 5;
                                                            if (!isLt5M) {
                                                                message.error('Image must smaller than 5MB!');
                                                                return Upload.LIST_IGNORE;
                                                            }
                                                            return true;
                                                        }}
                                                    >
                                                        <Button
                                                            icon={<Camera className="w-4 h-4" />}
                                                            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#111111] text-white border-white border-2 hover:bg-black hover:text-white p-0 shadow-sm"
                                                        />
                                                    </Upload>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fields Grid */}
                                    <div className="flex-1 w-full space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderField(
                                                "First Name",
                                                profile.firstName,
                                                "firstName"
                                            )}
                                            {renderField(
                                                "Middle Name",
                                                profile.middleName,
                                                "middleName"
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderField(
                                                "Last Name",
                                                profile.lastName,
                                                "lastName"
                                            )}
                                            {renderSelect("Gender", profile.gender, "gender", [
                                                "Male",
                                                "Female",
                                                "Other",
                                            ])}
                                        </div>
                                    </div>
                                </div>


                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {renderField("Email Address", profile.email, "email")}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Phone Number
                                        </div>
                                        <div className="flex">
                                            <Space.Compact className={`w-full employee-form-phone ${!isEditing ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                                                <Select
                                                    value={profile.countryCode}
                                                    onChange={(v) =>
                                                        setProfile({ ...profile, countryCode: String(v) })
                                                    }
                                                    disabled={!isEditing}
                                                    className="w-[85px] h-11"
                                                    suffixIcon={<div className="text-gray-400">⌄</div>}
                                                >
                                                    {countryCodes.map((c) => (
                                                        <Option key={c.code} value={c.code}>{c.code} {c.country}</Option>
                                                    ))}
                                                </Select>
                                                <Input
                                                    value={profile.phone}
                                                    onChange={(e) =>
                                                        setProfile({ ...profile, phone: e.target.value.replace(/\D/g, "") })
                                                    }
                                                    placeholder="123 456 7890"
                                                    maxLength={15}
                                                    disabled={!isEditing}
                                                    className="flex-1 h-11 font-medium text-[0.8125rem]"
                                                />
                                            </Space.Compact>
                                        </div>
                                    </div>
                                    {renderField("DOB", profile.dob, "dob", "date")}
                                </div>
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Employment Details */}
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Employment Details(Contact Your Admin or HR to Update Employment Details)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Row 1 */}
                                    {/* Employee ID */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Employee ID
                                        </div>
                                        <Input
                                            value={profile.employeeId}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                    {/* Designation */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Designation
                                        </div>
                                        <Input
                                            value={profile.designation}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                    {/* Department */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Department
                                        </div>
                                        <Input
                                            value={profile.department}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>

                                    {/* Row 2 */}
                                    {/* Employment Type */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Employment Type
                                        </div>
                                        <Input
                                            value={profile.employmentType}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                    {/* Date of Joining */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Date of Joining
                                        </div>
                                        <Input
                                            value={profile.dateOfJoining}
                                            type="date"
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                    {/* Experience */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Experience (Years)
                                        </div>
                                        <Input
                                            value={profile.experience}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>

                                    {/* Row 3 */}
                                    {/* Working Hours */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Working Hours
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={profile.startTime}
                                                disabled={true}
                                                className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666] min-w-0"
                                            />
                                            <span className="text-[#666666] text-sm shrink-0">to</span>
                                            <Input
                                                value={profile.endTime}
                                                disabled={true}
                                                className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666] min-w-0"
                                            />
                                        </div>
                                    </div>
                                    {/* Leaves Balance */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Leaves Balance
                                        </div>
                                        <Input
                                            value={profile.leaves}
                                            disabled={true}
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                    {/* Salary */}
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Salary (Yearly)
                                        </div>
                                        <Input
                                            value={profile.salary}
                                            disabled={true}
                                            prefix="$"
                                            className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem] bg-[#FAFAFA] text-[#666666]"
                                        />
                                    </div>
                                </div>
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Address Information */}
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Address Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderField(
                                        "Address Line 1",
                                        profile.addressLine1,
                                        "addressLine1"
                                    )}
                                    {renderField(
                                        "Address Line 2",
                                        profile.addressLine2,
                                        "addressLine2"
                                    )}
                                    {renderField("ZIP Code", profile.zipCode, "zipCode", "text", "Enter ZIP Code", handleZipCodeChange)}
                                    {renderField("City", profile.city, "city")}
                                    {renderField("Country", profile.country, "country")}
                                    {renderField("State", profile.state, "state")}
                                </div>
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Emergency Contact Information */}
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Emergency Contact Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {renderField(
                                        "Emergency Contact Name",
                                        profile.emergencyContactName,
                                        "emergencyContactName"
                                    )}
                                    {renderField(
                                        "Relationship",
                                        profile.emergencyRelationship,
                                        "emergencyRelationship"
                                    )}
                                    {renderField(
                                        "Emergency Contact Number",
                                        profile.emergencyContactNumber,
                                        "emergencyContactNumber"
                                    )}
                                </div>
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Professional Documents */}
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Professional Documents
                                </h2>
                                {documentTypes && documentTypes.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {documentTypes.map((docType) => {
                                            const matchingDoc = documents?.find(
                                                (doc: UserDocument) =>
                                                    doc.documentTypeId === docType.id
                                            );

                                            const documentForCard: UserDocument =
                                                matchingDoc ||
                                                ({
                                                    id: docType.id,
                                                    documentTypeId: docType.id,
                                                    documentTypeName: docType.name,
                                                    fileName: "",
                                                    fileSize: 0,
                                                    fileUrl: "",
                                                    uploadedDate: "",
                                                    fileType: "pdf",
                                                    isRequired: docType.required,
                                                } as UserDocument);

                                            return (
                                                <div key={docType.id} className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                                            {docType.name}
                                                        </div>
                                                        {!docType.required && (
                                                            <span className="text-[0.6875rem] text-[#999999] font-normal">
                                                                Optional
                                                            </span>
                                                        )}
                                                    </div>
                                                    <DocumentCard
                                                        document={documentForCard}
                                                        onPreview={handleDocumentPreview}
                                                        onDownload={handleDocumentDownload}
                                                        showUpload={!documentForCard.fileUrl}
                                                        onUpload={handleDocumentUpload}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="border border-[#EEEEEE] border-dashed rounded-lg p-8 bg-[#FAFAFA] text-center">
                                        <FileText className="w-12 h-12 text-[#CCCCCC] mx-auto mb-3" />
                                        <p className="text-[0.8125rem] font-medium text-[#666666] mb-1">
                                            No documents configured
                                        </p>
                                        <p className="text-[0.6875rem] text-[#999999] font-normal">
                                            Add required documents in Settings to manage employee files.
                                        </p>
                                    </div>
                                )}
                                {/* Hidden file input for document uploads */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xls,.xlsx"
                                />
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Password */}
                            {/* Password */}
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Change Password
                                </h2>
                                <div className="grid grid-cols-1 gap-6 max-w-md">
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Current Password
                                        </div>
                                        <Input.Password
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            placeholder="Enter current password"
                                            className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            New Password
                                        </div>
                                        <Input.Password
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                            placeholder="Enter new password"
                                            className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[0.8125rem] font-bold text-[#111111]">
                                            Confirm New Password
                                        </div>
                                        <Input.Password
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            placeholder="Confirm new password"
                                            className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] bg-white"
                                        />
                                    </div>
                                    <div>
                                        <Button
                                            type="primary"
                                            onClick={async () => {
                                                if (!passwordForm.currentPassword) {
                                                    message.error("Please enter your current password");
                                                    return;
                                                }
                                                if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
                                                    message.error("Please enter a new password");
                                                    return;
                                                }
                                                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                                    message.error("Passwords do not match");
                                                    return;
                                                }
                                                if (passwordForm.newPassword.length < 8) {
                                                    message.error("Password must be at least 8 characters");
                                                    return;
                                                }

                                                try {
                                                    await updatePasswordMutation.mutateAsync({
                                                        password: passwordForm.newPassword,
                                                        currentPassword: passwordForm.currentPassword
                                                    });
                                                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                                    message.success("Password updated successfully!");
                                                } catch (error: unknown) {
                                                    message.error(getErrorMessage(error, "Failed to update password"));
                                                }
                                            }}
                                            loading={updatePasswordMutation.isPending}
                                            className="bg-[#111111] h-10 px-6 rounded-lg font-semibold w-full sm:w-auto"
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            <Divider className="my-8 bg-[#EEEEEE]" />

                            {/* Notification Preferences */}
                            <section className="mb-6">
                                <h2 className="text-base font-semibold text-[#111111] mb-6">
                                    Notification Preferences
                                </h2>
                                <div className="space-y-6">
                                    {/* Email Notifications */}
                                    <div className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-lg border border-[#EEEEEE]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#FFF4F4] rounded-lg flex items-center justify-center">
                                                <Bell className="w-5 h-5 text-[#ff3b3b]" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-[#111111] mb-1">
                                                    Email Notifications
                                                </div>
                                                <div className="text-[0.8125rem] font-normal text-[#666666]">
                                                    Receive updates via email for important activities.
                                                </div>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={notificationPreferences.emailNotifications}
                                            onChange={(checked) =>
                                                setNotificationPreferences({
                                                    ...notificationPreferences,
                                                    emailNotifications: checked,
                                                })
                                            }
                                            className="bg-[#CCCCCC]"
                                            checkedChildren="ON"
                                            unCheckedChildren="OFF"
                                            style={{
                                                backgroundColor: notificationPreferences.emailNotifications
                                                    ? "#ff3b3b"
                                                    : undefined,
                                            }}
                                        />
                                    </div>

                                    {/* Security Alerts */}
                                    <div className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-lg border border-[#EEEEEE]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#FFF4F4] rounded-lg flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-[#ff3b3b]" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-[#111111] mb-1">
                                                    Security Alerts
                                                </div>
                                                <div className="text-[0.8125rem] font-normal text-[#666666]">
                                                    Get notified about new sign-ins and suspicious activity.
                                                </div>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={notificationPreferences.securityAlerts}
                                            onChange={(checked) =>
                                                setNotificationPreferences({
                                                    ...notificationPreferences,
                                                    securityAlerts: checked,
                                                })
                                            }
                                            className="bg-[#CCCCCC]"
                                            checkedChildren="ON"
                                            unCheckedChildren="OFF"
                                            style={{
                                                backgroundColor: notificationPreferences.securityAlerts
                                                    ? "#ff3b3b"
                                                    : undefined,
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
            {/* Document Preview Modal */}
            <DocumentPreviewModal
                open={isPreviewModalOpen}
                onClose={() => {
                    setIsPreviewModalOpen(false);
                    setSelectedDocument(null);
                }}
                document={selectedDocument}
            />
            <UpgradeToOrgModal
                visible={upgradeModalVisible}
                onCancel={() => setUpgradeModalVisible(false)}
                currentUser={user || null}
            />
            <style jsx global>{`
                :global(.employee-form-phone .ant-select-selector) {
                    background-color: transparent !important;
                    border: 1px solid #EEEEEE !important;
                    border-right: 0 !important;
                    border-radius: 8px 0 0 8px !important;
                    height: 44px !important;
                    display: flex !important;
                    align-items: center !important;
                    box-shadow: none !important;
                    font-weight: 500 !important;
                }

                :global(.employee-form-phone .ant-input) {
                    border: 1px solid #EEEEEE !important;
                    border-left: 0 !important;
                    border-radius: 0 8px 8px 0 !important;
                }

                :global(.employee-form-phone:focus-within .ant-select-selector),
                :global(.employee-form-phone:focus-within .ant-input) {
                    border-color: #ff3b3b !important;
                }

                :global(.employee-form-phone) {
                    display: flex !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                }

                :global(.employee-form-phone.bg-white .ant-select-selector),
                :global(.employee-form-phone.bg-white .ant-input) {
                    background-color: white !important;
                }

                :global(.employee-form-phone.bg-gray-50) :global(.ant-select-selector),
                :global(.employee-form-phone.bg-gray-50) :global(.ant-input) {
                    background-color: #FAFAFA !important;
                }
            `}</style>
        </PageLayout>
    );
}
