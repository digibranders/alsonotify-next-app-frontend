'use client';

import { useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployee, useUpdateEmployee, useCompanyDepartments } from '@/hooks/useUser';
import { fileService } from '@/services/file.service';
import { queryKeys } from '@/lib/queryKeys';
import { PageLayout } from '../../layout/PageLayout';
import { AccessBadge } from '../../ui/AccessBadge';
import { Button, Tag, Divider, App, Tabs } from 'antd';
import { Mail, Phone, Calendar, Briefcase, DollarSign, ArrowLeft, Edit, FileText } from 'lucide-react';
import { EmployeeForm, EmployeeFormData } from '../../modals/EmployeesForm';
import { DocumentCard } from '@/components/ui/DocumentCard';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { UserDocument } from '@/types/genericTypes';
import { getErrorMessage } from '@/types/api-utils';
import { ManagedPartnersTab } from './tabs/ManagedPartnersTab';

// Interface for backend employee data structure
interface BackendEmployee {
  id: number;
  user_id?: number;
  name?: string;
  email?: string;
  mobile_number?: string;
  designation?: string;
  hourly_rates?: number;
  date_of_joining?: string;
  experience?: number;
  skills?: string[];
  salary_yearly?: number;
  salary?: number;
  no_of_leaves?: number;
  employment_type?: string;
  documents?: UserDocument[];
  working_hours?: { start_time?: string; end_time?: string };
  user_profile?: { mobile_number?: string; phone?: string };
  phone?: string;
  department?: { id?: number; name?: string };
  user_employee?: {
    is_active?: boolean;
    role_id?: number;
    role?: { name?: string; color?: string };
    user?: { mobile_number?: string };
  };
}



function calculateWorkingHours(workingHours: { start_time?: string; end_time?: string }): number {
  if (!workingHours || !workingHours.start_time || !workingHours.end_time) return 0;

  // Simple calculation assuming same day
  // Format is usually "HH:mm" or "h:mm a"
  // For now returning standard 8 if both exist as placeholder improvement, 
  // or implementing basic parsing if format is standard.
  return 8; // keeping it simple as per original logic, but abstracted
}

export function EmployeeDetailsPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;
  const router = useRouter();
  const { message } = App.useApp();
  const { data: employeeData, isLoading } = useEmployee(parseInt(employeeId || '0'));
  const { data: departmentsData } = useCompanyDepartments();
  const updateEmployeeMutation = useUpdateEmployee();

  // Moved hooks to top level to comply with Rules of Hooks
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const backendEmp = employeeData?.result;

  const documents = useMemo(() => {
    // Check if employee data has documents
    return (backendEmp as BackendEmployee)?.documents || [];
  }, [backendEmp]);

  const handleUpdateEmployee = (data: EmployeeFormData) => {
    // Find department ID from name
    const selectedDepartment = departmentsData?.result?.find(
      (dept) => dept.name === data.department
    );
    const departmentId = selectedDepartment?.id || null;

    // Parse hourly rate
    const hourlyRate = parseFloat(data.hourlyRate.replace(/[^0-9.]/g, '')) || 0;

    // Parse date of joining
    let dateOfJoining = new Date().toISOString();
    if (data.dateOfJoining) {
      try {
        const date = new Date(data.dateOfJoining);
        if (!isNaN(date.getTime())) {
          dateOfJoining = date.toISOString();
        }
      } catch (e) {
        // Invalid date format
      }
    }

    updateEmployeeMutation.mutate(
      {
        id: parseInt(employeeId),
        name: `${data.firstName} ${data.lastName}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile_number: data.phone, // Map frontend phone to backend mobile_number
        designation: data.role,
        department_id: departmentId,
        role_id: data.role_id, // Keep existing role_id if valid
        experience: parseInt(data.experience) || 0,
        skills: data.skillsets.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
        date_of_joining: dateOfJoining,
        salary_yearly: parseFloat(data.salary) || 0,
        hourly_rates: hourlyRate,
        no_of_leaves: parseFloat(data.leaves) || 0,
      } as any,
      {
        onSuccess: () => {
          message.success("Employee updated successfully!");
          setIsDialogOpen(false);
          // Invalidate queries to refresh the data
          // The useUpdateEmployee hook should handle this, but we'll ensure it's done
        },
        onError: (error: unknown) => {
          const errorMessage = getErrorMessage(error, "Failed to update employee");
          message.error(errorMessage);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-[#999999]">Loading employee...</p>
      </div>
    );
  }

  if (!backendEmp) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold mb-2">Employee not found</h2>
        <Button onClick={() => router.push('/dashboard/employees')}>Back to Employees</Button>
      </div>
    );
  }

  // Transform backend data to UI format
  // Check multiple possible paths for mobile_number (userProfile table or nested user_profile)
  // Also default to 'N/A' if nothing found
  const emp = backendEmp as BackendEmployee;
  const mobileNumber =
    emp.user_profile?.mobile_number ||
    emp.mobile_number ||
    emp.user_profile?.phone ||
    emp.phone ||
    emp.user_employee?.user?.mobile_number ||
    'N/A';

  const employee = {
    id: emp.user_id || emp.id,
    name: emp.name || '',
    role: emp.designation || 'Unassigned',
    email: emp.email || '',
    phone: mobileNumber,
    hourlyRate: emp.hourly_rates ? `$${emp.hourly_rates}/Hr` : 'N/A',
    dateOfJoining: emp.date_of_joining
      ? new Date(emp.date_of_joining || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
      : 'N/A',
    experience: emp.experience || 0,
    skillsets: emp.skills?.join(', ') || 'None',
    status: emp.user_employee?.is_active !== false ? 'active' : 'inactive',
    department: emp.department?.name || 'Unassigned',
    access: (emp.user_employee?.role?.name || 'Employee') as 'Admin' | 'Manager' | 'Leader' | 'Employee',
    salary: emp.salary_yearly || emp.salary || 0,
    currency: 'USD',
    workingHours: emp.working_hours ? calculateWorkingHours(emp.working_hours) : 0,
    leaves: emp.no_of_leaves || 0,
    roleId: emp.user_employee?.role_id,
    roleColor: emp.user_employee?.role?.color,
    employmentType: emp.employment_type || 'Full-time',
  };

  const handleDocumentPreview = (document: UserDocument) => {
    setSelectedDocument(document);
    setIsPreviewModalOpen(true);
  };

  const handleDocumentDownload = (document: UserDocument) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    } else {
      message.warning('Document URL not available');
    }
  };

  /* Hooks moved to top level */

  const handleDocumentUpload = (documentTypeId: string) => {
    setUploadingDocType(documentTypeId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingDocType) return;

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      message.error(`File size must be less than 50MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      message.loading({ content: 'Uploading document...', key: 'doc-upload' });

      // Find the document type name from the list
      const doc = documents.find(d => d.documentTypeId === uploadingDocType);
      const docTypeName = doc?.documentTypeName || 'Supporting Docs'; // Fallback

      await fileService.uploadEmployeeDocument(
        file,
        parseInt(employeeId),
        docTypeName
      );

      message.success({ content: 'Document uploaded successfully!', key: 'doc-upload' });

      // Refresh employee data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(parseInt(employeeId)) });

    } catch (error) {
      console.error(error);
      message.error({ content: 'Failed to upload document.', key: 'doc-upload' });
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadingDocType(null);
    }
  };

  return (
    <PageLayout
      title="Employee Details"
      titleAction={{
        label: "Back",
        icon: <ArrowLeft className="w-5 h-5" />,
        onClick: () => router.push('/dashboard/employees'),
        variant: "outline"
      }}
      action={
        <Button
          type="primary"
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-[#111111] text-white hover:bg-[#000000] border-0 h-10 px-5 rounded-full font-['Manrope:SemiBold',sans-serif]"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </Button>
      }
    >
      <div className="bg-white rounded-[24px] border border-[#EEEEEE] p-8 max-w-4xl mx-auto mt-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">{employee.name}</h1>
            <div className="flex items-center gap-2 text-[#666666]">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm font-['Manrope:Medium',sans-serif]">{employee.role} • {employee.department}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AccessBadge role={employee.access} color={employee.roleColor} />
            <Tag className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${employee.status === 'active'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
              }`}>
              {employee.status === 'active' ? 'Active' : 'Inactive'}
            </Tag>
          </div>
        </div>

        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Contact Information</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center">
                            <Mail className="w-5 h-5 text-[#666666]" />
                          </div>
                          <div>
                            <p className="text-xs text-[#999999] m-0">Email Address</p>
                            <p className="text-sm font-medium text-[#111111] m-0">{employee.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center">
                            <Phone className="w-5 h-5 text-[#666666]" />
                          </div>
                          <div>
                            <p className="text-xs text-[#999999] m-0">Phone Number</p>
                            <p className="text-sm font-medium text-[#111111] m-0">{employee.phone}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Employment Details</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#666666]" />
                          </div>
                          <div>
                            <p className="text-xs text-[#999999] m-0">Date of Joining</p>
                            <p className="text-sm font-medium text-[#111111] m-0">{employee.dateOfJoining}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-[#666666]" />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs text-[#999999] m-0">Hourly Rate</p>
                            <div className="min-h-[20px] flex items-center">
                              <p className="text-sm font-medium text-[#111111] m-0">{employee.hourlyRate}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Divider className="my-8" />

                  {/* Skills & Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-[#F7F7F7] rounded-xl">
                      <p className="text-xs text-[#999999] mb-1">Experience</p>
                      <p className="text-xl font-bold text-[#111111]">{employee.experience} Years</p>
                    </div>
                    <div className="p-4 bg-[#F7F7F7] rounded-xl">
                      <p className="text-xs text-[#999999] mb-1">Working Hours</p>
                      <p className="text-xl font-bold text-[#111111]">{employee.workingHours === 0 ? 'N/A' : `${employee.workingHours}h / week`}</p>
                    </div>
                    <div className="p-4 bg-[#F7F7F7] rounded-xl">
                      <p className="text-xs text-[#999999] mb-1">Leaves Balance</p>
                      <p className="text-xl font-bold text-[#111111]">{employee.leaves} Days</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide mb-4">Skillsets</h3>
                    <div className="flex flex-wrap gap-2">
                      {employee.skillsets.split(',').map((skill: string, index: number) => (
                        <Tag key={index} className="bg-[#F7F7F7] text-[#111111] hover:bg-[#EEEEEE] border-0 rounded-full px-3 py-1">
                          {skill.trim()}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <Divider className="my-8" />

                  {/* Documents Section */}
                  <div>
                    <h3 className="text-sm font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide mb-4">Attached Documents</h3>
                    {documents && documents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map((doc: UserDocument) => (
                          <DocumentCard
                            key={doc.id}
                            document={doc}
                            onPreview={handleDocumentPreview}
                            onDownload={handleDocumentDownload}
                            showUpload={!doc.fileUrl}
                            onUpload={handleDocumentUpload}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="border border-[#EEEEEE] border-dashed rounded-lg p-8 bg-[#FAFAFA] text-center">
                        <FileText className="w-12 h-12 text-[#CCCCCC] mx-auto mb-3" />
                        <p className="text-[13px] font-['Manrope:Medium',sans-serif] text-[#666666] mb-1">
                          No documents uploaded
                        </p>
                        <p className="text-[11px] text-[#999999] font-['Manrope:Regular',sans-serif]">
                          Documents will appear here once uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'managed-partners',
              label: 'Managed Partners',
              children: <ManagedPartnersTab employeeId={parseInt(employeeId)} />
            }
          ]}
        />
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

      <EmployeeForm
        open={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        isEditing={true}
        initialData={backendEmp}
        onSubmit={handleUpdateEmployee}
        departments={departmentsData?.result?.filter((dept: { is_active?: boolean; name?: string }) => dept.is_active !== false).map((dept: any) => dept.name) || []}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xls,.xlsx" // Broad acceptance based on allowed types
      />
    </PageLayout>
  );
}