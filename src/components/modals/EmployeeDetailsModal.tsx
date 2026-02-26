import { useState, useMemo, useRef } from 'react';
import { Modal, Button, App } from 'antd';
import { Briefcase, Mail, Phone, Calendar, DollarSign, Clock, CalendarDays, X, FileText, Users, Globe, ShieldAlert, Linkedin, Github } from 'lucide-react';
import { AccessBadge } from '../ui/AccessBadge';
import { UserDocument } from '@/types/domain';
import { Employee } from '@/types/domain';
import { DocumentCard } from '@/components/ui/DocumentCard';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployee } from '@/hooks/useUser';
import { fileService } from '@/services/file.service';
import { queryKeys } from '@/lib/queryKeys';

interface EmployeeDetailsModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: () => void;
}

export function EmployeeDetailsModal({
  open,
  onClose,
  employee,
  onEdit,
}: EmployeeDetailsModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Fetch fresh data if employee exists
  const { data: employeeData } = useEmployee(employee?.id || 0);
  const currentEmployee = employeeData?.result || employee;

  // Documents state
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const documents = useMemo(() => {
    return currentEmployee?.documents || [];
  }, [currentEmployee]);

  if (!currentEmployee) return null;

  // Parse skillsets
  const skills = currentEmployee.skillsets && currentEmployee.skillsets !== 'None'
    ? currentEmployee.skillsets.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  // Format hourly rate
  const hourlyRate = currentEmployee.hourly_rate && currentEmployee.hourly_rate !== 'N/A'
    ? currentEmployee.hourly_rate
    : 'N/A';

  // Format experience
  const experience = currentEmployee.experience ? `${currentEmployee.experience} Years` : 'N/A';

  // Format working hours
  const workingHours = (() => {
    const wh = currentEmployee.working_hours;
    if (wh && typeof wh === 'object' && 'start_time' in wh && 'end_time' in wh) {
      return `${wh.start_time} - ${wh.end_time}`;
    }
    return (typeof currentEmployee.working_hours === 'number' || typeof currentEmployee.working_hours === 'string') ? `${currentEmployee.working_hours}h / week` : 'N/A';
  })();

  // Format leaves
  const leavesTaken = currentEmployee.leaves_count ? `${currentEmployee.leaves_count} Days` : '0 Days';

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

  const handleDocumentUpload = (documentTypeId: string) => {
    setUploadingDocType(documentTypeId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingDocType || !currentEmployee) return;

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

      // Find the document type name from the list
      const doc = documents.find(d => d.documentTypeId === uploadingDocType);
      const docTypeName = doc?.documentTypeName || 'Supporting Docs'; // Fallback

      await fileService.uploadEmployeeDocument(
        file,
        Number(currentEmployee.id),
        docTypeName
      );

      message.success({ content: 'Document uploaded successfully!', key: 'doc-upload' });

      // Refresh employee data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(Number(currentEmployee.id)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });

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
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(700px, 95vw)"
      centered
      className="rounded-[16px] overflow-hidden"
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: {
          padding: 0,
        }
      }}
    >
      <div className="flex flex-col max-h-[90vh] bg-white">
        {/* Fixed Header - Reduced padding */}
        <div className="flex-shrink-0 border-b border-[#EEEEEE] px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-[#EEEEEE] bg-[#F7F7F7] flex-shrink-0">
                <img
                  src={currentEmployee.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentEmployee.name)}&background=f7f7f7&color=666`}
                  alt={currentEmployee.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111111] leading-tight">
                  {currentEmployee.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <AccessBadge role={currentEmployee.access} color={currentEmployee.roleColor} />
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5625rem] font-semibold ${currentEmployee.status === 'active'
                      ? 'bg-[#ECFDF3] text-[#12B76A]'
                      : 'bg-[#FEF3F2] text-[#F04438]'
                      }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    {currentEmployee.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pr-6">
              <Button
                type="text"
                icon={<Mail className="w-4 h-4 text-[#666666]" />}
                onClick={() => window.location.href = `mailto:${currentEmployee.email}`}
                className="hover:bg-[#F7F7F7] rounded-full w-8 h-8 flex items-center justify-center p-0"
                aria-label={`Send email to ${currentEmployee.name}`}
              />
              <Button
                type="text"
                icon={<Phone className="w-4 h-4 text-[#666666]" />}
                onClick={() => window.location.href = `tel:${currentEmployee.phone}`}
                className="hover:bg-[#F7F7F7] rounded-full w-8 h-8 flex items-center justify-center p-0"
                aria-label={`Call ${currentEmployee.name}`}
              />

              {(currentEmployee.linkedin || currentEmployee.github || currentEmployee.portfolio) && (
                <>
                  <div className="mx-1.5 w-[1px] h-4 bg-[#EEEEEE]"></div>
                  {currentEmployee.linkedin && (
                    <Button
                      type="text"
                      icon={<Linkedin className="w-4 h-4 text-[#0077B5]" />}
                      onClick={() => window.open((currentEmployee.linkedin || '').startsWith('http') ? (currentEmployee.linkedin || '') : `https://linkedin.com/in/${currentEmployee.linkedin}`, '_blank')}
                      className="hover:bg-[#F7F7F7] rounded-full w-8 h-8 flex items-center justify-center p-0"
                      aria-label={`Visit ${currentEmployee.name}'s LinkedIn profile`}
                    />
                  )}
                  {currentEmployee.github && (
                    <Button
                      type="text"
                      icon={<Github className="w-4 h-4 text-[#111111]" />}
                      onClick={() => window.open((currentEmployee.github || '').startsWith('http') ? (currentEmployee.github || '') : `https://github.com/${currentEmployee.github}`, '_blank')}
                      className="hover:bg-[#F7F7F7] rounded-full w-8 h-8 flex items-center justify-center p-0"
                      aria-label={`Visit ${currentEmployee.name}'s GitHub profile`}
                    />
                  )}
                  {currentEmployee.portfolio && (
                    <Button
                      type="text"
                      icon={<Globe className="w-4 h-4 text-[#666666]" />}
                      onClick={() => window.open((currentEmployee.portfolio || '').startsWith('http') ? (currentEmployee.portfolio || '') : `https://${currentEmployee.portfolio}`, '_blank')}
                      className="hover:bg-[#F7F7F7] rounded-full w-8 h-8 flex items-center justify-center p-0"
                      aria-label={`Visit ${currentEmployee.name}'s portfolio`}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Body - Ensuring flex-1 and overflow-y-auto */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent space-y-8">
          {/* Section 1: Basic Information */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-[#111111] rounded-full"></div>
              <h3 className="text-sm font-bold text-[#111111]">Basic Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-5 gap-x-12 pl-3">
              <DetailItem label="Email Address" value={currentEmployee.email} icon={<Mail className="w-3.5 h-3.5" />} />
              <DetailItem label="Phone Number" value={currentEmployee.phone} icon={<Phone className="w-3.5 h-3.5" />} />
              <DetailItem label="Department" value={currentEmployee.department} icon={<Users className="w-3.5 h-3.5" />} />
              <DetailItem label="Designation" value={currentEmployee.role} icon={<Briefcase className="w-3.5 h-3.5" />} />
            </div>
            {currentEmployee.bio && (
              <div className="mt-5 pl-3">
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider mb-2">
                  Professional Bio
                </p>
                <p className="text-[0.8125rem] text-[#444444] leading-relaxed font-normal bg-[#F9FAFB] p-4 rounded-xl border border-[#EEEEEE]">
                  {currentEmployee.bio}
                </p>
              </div>
            )}
          </section>

          {/* Section 2: Employment & HR Details */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-[#111111] rounded-full"></div>
              <h3 className="text-sm font-bold text-[#111111]">Employment & HR Details</h3>
              <div className="text-[0.8125rem] text-[#666666]">Leaves: <span className="text-[#111111] font-medium">{currentEmployee.leaves_count}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 pl-3">
              <StatCard label="Experience" value={experience} icon={<Briefcase className="w-4 h-4 text-gray-400" />} />
              <StatCard label="Total Leaves" value={leavesTaken} icon={<CalendarDays className="w-4 h-4 text-gray-400" />} />
              <StatCard label="Working Hours" value={workingHours} icon={<Clock className="w-4 h-4 text-gray-400" />} />
            </div>
            <div className="grid grid-cols-2 gap-y-5 gap-x-12 pl-3">
              <DetailItem label="Date of Joining" value={currentEmployee.formattedDateOfJoining || currentEmployee.date_of_joining || 'N/A'} icon={<Calendar className="w-3.5 h-3.5" />} />
              <DetailItem label="Annual Salary" value={currentEmployee.salary ? `${currentEmployee.currency || '$'} ${Number(currentEmployee.salary).toLocaleString()}` : 'N/A'} icon={<DollarSign className="w-3.5 h-3.5" />} />
              <DetailItem label="Hourly Cost" value={currentEmployee.hourly_rates ? `$${currentEmployee.hourly_rates}/Hr` : (hourlyRate || 'N/A')} icon={<DollarSign className="w-3.5 h-3.5" />} />
              <DetailItem label="Employment Type" value={currentEmployee.employment_type || 'Full Time'} icon={<Briefcase className="w-3.5 h-3.5" />} />
              {currentEmployee.timezone && (
                <DetailItem label="Local Timezone" value={currentEmployee.timezone} icon={<Globe className="w-3.5 h-3.5" />} />
              )}
            </div>

            {/* Emergency Contact Sub-section */}
            {(currentEmployee.emergencyContactName || currentEmployee.emergencyContactPhone) && (
              <div className="mt-6 ml-3 p-4 bg-[#FEF3F2] rounded-xl border border-[#FEE4E2] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#F04438] shadow-sm">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[0.6875rem] font-bold text-[#B42318] uppercase tracking-wider">Emergency Contact</p>
                    <p className="text-sm font-semibold text-[#912018]">{currentEmployee.emergencyContactName || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.8125rem] text-[#666666] mb-1">Working Hours: <span className="text-[#111111] font-medium">{workingHours}</span></div>
                  <p className="text-[0.8125rem] font-medium text-[#B42318]">{currentEmployee.emergencyContactPhone || '-'}</p>
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Skills & Assets */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-[#111111] rounded-full"></div>
              <h3 className="text-sm font-bold text-[#111111]">Skills & Documents</h3>
            </div>
            <div className="space-y-6 pl-3">
              {/* Skillsets */}
              <div>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider mb-3">
                  Professional Skillsets
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#F9FAFB] text-[#111111] text-xs font-medium rounded-full border border-[#EEEEEE]"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#999999] italic">No skills specified</span>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider mb-3">
                  Uploaded Documents
                </p>
                {documents && documents.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pb-4">
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
                  <div className="border border-[#EEEEEE] border-dashed rounded-xl p-6 bg-[#FAFAFA] text-center">
                    <FileText className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
                    <p className="text-xs font-medium text-[#666666]">
                      No documents available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-[#EEEEEE] px-6 py-4 flex items-center justify-end bg-white gap-3 rounded-b-[16px]">
          <Button
            onClick={onClose}
            className="h-10 px-6 text-sm font-semibold text-[#666666] border border-[#EEEEEE] hover:bg-[#F9FAFB] rounded-lg"
          >
            Close
          </Button>
          <Button
            type="primary"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="h-10 px-8 rounded-lg bg-[#111111] hover:bg-[#000000] text-white text-sm font-semibold border-none active:scale-95 transition-transform"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <DocumentPreviewModal
        open={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xls,.xlsx"
      />
    </Modal>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: string | null | undefined; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-[#666666] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-[#111111]">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#EEEEEE] flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#EEEEEE] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[0.6875rem] font-medium text-[#666666] mb-0.5">{label}</p>
        <p className="text-base font-bold text-[#111111]">{value}</p>
      </div>
    </div>
  );
}
