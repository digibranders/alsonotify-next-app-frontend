import { Plus, Trash2, Pencil, Building2 } from 'lucide-react';
import { Button, Input, Select, Switch, Divider, message, Upload } from "antd";
import { commonCountries } from '@/data/defaultData';
import { fileService } from '@/services/file.service';
import { getTimezones } from '@/utils/timezones';
import { Department } from '@/types/domain';
import { DocumentType } from '@/types/domain';

const { TextArea } = Input;
const { Option } = Select;
import { getTaxIdTypesForCountry } from '@/data/taxIdTypes';
import { useEffect, useState } from 'react';
import { getValidatorForType } from '@/lib/validators/taxIdValidators';

interface CompanyDetailsTabProps {
  isIndividual: boolean;
  isAdmin: boolean;
  canEditCompany: boolean;
  isEditing: boolean;

  // Company Data
  companyName: string;
  setCompanyName: (val: string) => void;
  companyLogo: string;
  setCompanyLogo: (val: string) => void;
  taxId: string;
  setTaxId: (val: string) => void;
  taxIdType: string;
  setTaxIdType: (val: string) => void;
  timeZone: string;
  setTimeZone: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  companyData: any; // Using exact type if possible would be better, but 'any' matches usage in SettingsPage for now or we can use typed logic

  // Departments
  departments: Department[];
  isAddingDept: boolean;
  setIsAddingDept: (val: boolean) => void;
  newDeptName: string;
  setNewDeptName: (val: string) => void;
  handleAddDepartment: () => void;
  handleDeleteDepartment: (id: string) => void;
  toggleDepartmentStatus: (id: string) => void;

  // Documents
  requiredDocuments: DocumentType[];
  isAddingDoc: boolean;
  setIsAddingDoc: (val: boolean) => void;
  newDocName: string;
  setNewDocName: (val: string) => void;
  handleAddDocument: () => void;
  handleDeleteDocument: (id: string) => void;
  toggleDocumentRequired: (id: string) => void;
}

export function CompanyDetailsTab({
  isIndividual,
  isAdmin,
  canEditCompany,
  isEditing,
  companyName,
  setCompanyName,
  companyLogo,
  setCompanyLogo,
  taxId,
  setTaxId,
  taxIdType,
  setTaxIdType,
  timeZone,
  setTimeZone,
  currency,
  setCurrency,
  country,
  setCountry,
  address,
  setAddress,
  companyData,
  departments,
  isAddingDept,
  setIsAddingDept,
  newDeptName,
  setNewDeptName,
  handleAddDepartment,
  handleDeleteDepartment,
  toggleDepartmentStatus,
  requiredDocuments,
  isAddingDoc,
  setIsAddingDoc,
  newDocName,
  setNewDocName,
  handleAddDocument,
  handleDeleteDocument,
  toggleDocumentRequired,
}: CompanyDetailsTabProps) {
  const timezones = getTimezones();
  // We need access to message API. SettingsPage uses App.useApp().
  // If we don't have App wrapped, we can use message directly but App.useApp is better for context.
  // We can also just use static message for now if not wrapped in component, but likely is.
  // The parent passes props, so side effects like upload use generic handlers or we keep logic here.
  // The logic for upload was inline in SettingsPage.

  // Auto-select first tax ID type when country changes if current type is invalid for that country
  const [taxIdError, setTaxIdError] = useState<string | null>(null);

  // Auto-select first tax ID type when country changes if current type is invalid for that country
  useEffect(() => {
    if (isEditing && country) {
      const options = getTaxIdTypesForCountry(country);
      const currentIsValid = options.some(opt => opt.value === taxIdType);

      if (!currentIsValid && options.length > 0) {
        setTaxIdType(options[0].value);
        setTaxIdError(null); // Clear error on auto-switch
      }
    }
  }, [country, isEditing]); // We depend on country change

  // Validate Tax ID
  const validateTaxId = (id: string, type: string) => {
    if (!id) {
      setTaxIdError(null);
      return true;
    }
    const validator = getValidatorForType(type);
    const result = validator.safeParse(id);
    if (!result.success) {
      setTaxIdError(result.error.issues[0].message);
      return false;
    }
    setTaxIdError(null);
    return true;
  };

  useEffect(() => {
    // Clear error when editing restarts or stops
    if (!isEditing) setTaxIdError(null);
  }, [isEditing]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="mb-10">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Left Column: Header & Logo */}
          <div className="flex-none w-48 flex flex-col justify-between">
            <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">Company Information</h2>

            <div className="relative group self-start">
              <div className="w-32 h-32 rounded-full border border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-center overflow-hidden">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-[#999999]" />
                )}
              </div>
              {isEditing && (
                <div className="absolute -bottom-1 -right-1">
                  <Upload
                    name="logo"
                    showUploadList={false}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        message.loading({ content: 'Uploading logo...', key: 'logo-upload' });
                        const fileObj = file as File;

                        // Safety check on company ID
                        const companyId = companyData?.result?.id;
                        if (!companyId) {
                          throw new Error('Company ID not found');
                        }

                        const result = await fileService.uploadFile(
                          fileObj,
                          'COMPANY_LOGO',
                          companyId
                        );

                        if (result.download_url) {
                          setCompanyLogo(result.download_url);
                          onSuccess?.(result);
                          message.success({ content: 'Logo uploaded successfully!', key: 'logo-upload' });
                        } else {
                          throw new Error('No download URL returned');
                        }
                      } catch (error) {
                        console.error('Logo upload error:', error);
                        onError?.(error as Error);
                        message.error({ content: 'Failed to upload logo', key: 'logo-upload' });
                      }
                    }}
                    beforeUpload={(file) => {
                      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                      if (!isJpgOrPng) {
                        message.error('You can only upload JPG/PNG file!');
                        return Upload.LIST_IGNORE;
                      }
                      const isLt2M = file.size / 1024 / 1024 < 2;
                      if (!isLt2M) {
                        message.error('Image must smaller than 2MB!');
                        return Upload.LIST_IGNORE;
                      }
                      return true;
                    }}
                  >
                    <Button
                      icon={<Pencil className="w-3.5 h-3.5" />}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[#111111] text-white border-white border-2 hover:bg-black hover:text-white p-0 shadow-sm"
                    />
                  </Upload>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Inputs */}
          <div className="flex-1 w-full space-y-6">
            {/* Row 1: Name & Tax ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Company Name</span>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!isEditing}
                  className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px] ${!isEditing ? 'bg-[#FAFAFA] text-[#666666]' : 'bg-white'}`}
                />
              </div>
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Country</span>
                <Select
                  value={country || undefined}
                  onChange={(v) => setCountry(String(v))}
                  disabled={!isEditing}
                  virtual={false}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                  className="w-full h-11"
                  placeholder="Select country"
                >
                  {commonCountries.map((c) => (
                    <Option key={c.code} value={c.name} label={c.name}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Row 2: TimeZone & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Time Zone</span>
                <Select
                  value={timeZone}
                  onChange={(v) => setTimeZone(String(v))}
                  disabled={!isEditing}
                  className="w-full h-11"
                  showSearch={{
                    filterOption: (input, option) => {
                      const searchText = input.toLowerCase().trim();
                      if (!searchText) return true;
                      const label = String(option?.label ?? option?.children ?? '').toLowerCase();
                      const value = String(option?.value ?? '').toLowerCase();
                      if (label.includes(searchText) || value.includes(searchText)) return true;
                      if (label.includes('kolkata')) {
                        if (['kol', 'cal', 'calcutta', 'india', 'ist'].some(term => searchText.includes(term))) {
                          return true;
                        }
                      }
                      return false;
                    }
                  }}
                  placeholder="Select timezone"
                  optionFilterProp="label"
                  notFoundContent="No timezone found"
                  popupMatchSelectWidth={true}
                  virtual={false}
                  listHeight={400}
                >
                  {timezones.map((tz) => (
                    <Option key={tz.value} value={tz.value} label={tz.label}>
                      {tz.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Currency</span>
                <Select
                  value={currency}
                  onChange={(v) => setCurrency(String(v))}
                  disabled={!isEditing}
                  className="w-full h-11"
                >
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                  <Option value="INR">INR</Option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width: Address */}
        <div className="mb-6 relative mt-6">
          <div className="space-y-2">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Address</span>
            <TextArea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter company address"
              disabled={!isEditing}
              rows={3}
              className={`rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Regular',sans-serif] text-[13px] resize-none p-3 ${!isEditing ? 'bg-[#FAFAFA] text-[#666666]' : 'bg-white'}`}
            />
          </div>
          {isEditing && (
            <div className="absolute bottom-3 right-3 p-1.5 bg-[#F7F7F7] rounded-md border border-[#EEEEEE] pointer-events-none">
              <span className="text-[14px]">📍</span>
            </div>
          )}
        </div>

        {/* Full Width: Tax ID with Type */}
        <div className="mb-6">
          <div className="space-y-2">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Tax ID</span>
            <div className="flex gap-4">
              <div className="w-[180px] flex-none">
                <Select
                  value={taxIdType || undefined}
                  onChange={(v) => setTaxIdType(String(v))}
                  placeholder="Type"
                  disabled={!isEditing}
                  className="w-full h-11"
                  showSearch
                >
                  {getTaxIdTypesForCountry(country).map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  value={taxId}
                  onChange={(e) => {
                    setTaxId(e.target.value);
                    if (taxIdError) validateTaxId(e.target.value, taxIdType); // Clear error as they type if valid
                  }}
                  onBlur={() => validateTaxId(taxId, taxIdType)}
                  placeholder={
                    getTaxIdTypesForCountry(country).find(t => t.value === taxIdType)?.placeholder ||
                    "Enter Tax ID"
                  }
                  disabled={!isEditing}
                  status={taxIdError ? 'error' : ''}
                  className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px] ${!isEditing ? 'bg-[#FAFAFA] text-[#666666]' : 'bg-white'}`}
                />
                {taxIdError && <div className="text-red-500 text-xs mt-1">{taxIdError}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments & Required Documents - Only for Organizations */}
      {!isIndividual && (
        <>
          <Divider className="my-8 bg-[#EEEEEE]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Departments Column */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                  Departments
                </h2>
                {!isAddingDept && isEditing && canEditCompany && (
                  <button
                    onClick={() => setIsAddingDept(true)}
                    className="hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5 text-[#ff3b3b]" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-end gap-6 group">
                    <div className="space-y-2 flex-1">
                      <span className={`text-[13px] font-['Manrope:Bold',sans-serif] ${!isEditing ? 'text-[#666666]' : 'text-[#111111]'}`}>
                        Department Name
                      </span>
                      <Input
                        value={dept.name}
                        readOnly
                        disabled={!isEditing}
                        className={`h-11 rounded-lg border-[#EEEEEE] font-['Manrope:Medium',sans-serif] text-[13px] ${!isEditing ? '!bg-[#F7F7F7] !text-[#666666] cursor-not-allowed opacity-100' : 'bg-white'}`}
                        style={!isEditing ? { backgroundColor: '#F7F7F7', color: '#666666' } : undefined}
                      />
                    </div>
                    <div className="flex items-center gap-4 pb-3 h-11">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[11px] font-['Manrope:Bold',sans-serif] ${!isEditing ? 'text-[#999999]' : 'text-[#666666]'}`}>
                          Active
                        </span>
                        <Switch
                          checked={dept.active !== false}
                          onChange={() => toggleDepartmentStatus(String(dept.id))}
                          disabled={!isEditing || !canEditCompany}
                          className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: (dept.active !== false) ? "#ff3b3b" : undefined,
                          }}
                        />
                      </div>
                      {isEditing && canEditCompany && (
                        <button
                          onClick={() => handleDeleteDepartment(String(dept.id))}
                          className="p-2 hover:bg-[#F7F7F7] rounded-full transition-colors text-[#ff3b3b]"
                          aria-label="Delete department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isAddingDept && (
                  <div className="flex items-end gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 flex-1">
                      <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                        New Department Name
                      </span>
                      <Input
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="e.g. Marketing"
                        autoFocus
                        className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px]"
                        onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-1 h-11">
                      <Button
                        onClick={handleAddDepartment}
                        className="h-9 px-4 bg-[#111111] hover:bg-[#000000]/90 text-white text-[12px] font-['Manrope:SemiBold',sans-serif] rounded-full border-none"
                      >
                        Add
                      </Button>
                      <Button
                        type="text"
                        onClick={() => setIsAddingDept(false)}
                        className="h-9 px-4 text-[#666666] hover:text-[#111111] text-[12px] font-['Manrope:SemiBold',sans-serif] hover:bg-[#F7F7F7] rounded-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Required Documents Column */}
            <section className="lg:border-l lg:border-[#EEEEEE] lg:pl-12">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                  Required Documents
                </h2>
                {!isAddingDoc && isEditing && canEditCompany && (
                  <button
                    onClick={() => setIsAddingDoc(true)}
                    className="hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5 text-[#ff3b3b]" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {requiredDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-end gap-6 group">
                    <div className="space-y-2 flex-1">
                      <span className={`text-[13px] font-['Manrope:Bold',sans-serif] ${!isEditing ? 'text-[#666666]' : 'text-[#111111]'}`}>
                        Document Name
                      </span>
                      <Input
                        value={doc.name}
                        readOnly
                        disabled={!isEditing}
                        className={`h-11 rounded-lg border-[#EEEEEE] font-['Manrope:Medium',sans-serif] text-[13px] ${!isEditing ? '!bg-[#F7F7F7] !text-[#666666] cursor-not-allowed opacity-100' : 'bg-white'}`}
                        style={!isEditing ? { backgroundColor: '#F7F7F7', color: '#666666' } : undefined}
                      />
                    </div>
                    <div className="flex items-center gap-4 pb-3 h-11">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[11px] font-['Manrope:Bold',sans-serif] ${!isEditing ? 'text-[#999999]' : 'text-[#666666]'}`}>
                          Required
                        </span>
                        <Switch
                          checked={doc.required}
                          onChange={() => toggleDocumentRequired(doc.id)}
                          disabled={!isEditing || !canEditCompany}
                          className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: doc.required ? "#ff3b3b" : undefined,
                          }}
                        />
                      </div>
                      {isEditing && canEditCompany && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-[#F7F7F7] rounded-full transition-colors text-[#ff3b3b]"
                          aria-label="Delete document type"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isAddingDoc && (
                  <div className="flex items-end gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 flex-1">
                      <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                        New Document Name
                      </span>
                      <Input
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="e.g. Passport"
                        autoFocus
                        className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px]"
                        onKeyDown={(e) => e.key === "Enter" && handleAddDocument()}
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-1 h-11">
                      <Button
                        onClick={handleAddDocument}
                        className="h-9 px-4 bg-[#111111] hover:bg-[#000000]/90 text-white text-[12px] font-['Manrope:SemiBold',sans-serif] rounded-full border-none"
                      >
                        Add
                      </Button>
                      <Button
                        type="text"
                        onClick={() => setIsAddingDoc(false)}
                        className="h-9 px-4 text-[#666666] hover:text-[#111111] text-[12px] font-['Manrope:SemiBold',sans-serif] hover:bg-[#F7F7F7] rounded-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
