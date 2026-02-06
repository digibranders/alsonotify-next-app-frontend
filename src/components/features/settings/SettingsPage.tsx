import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import { useUpdateCompany, useCurrentUserCompany, useRoles, useUpsertRole, useUpdateRolePermissions, useUserDetails } from '@/hooks/useUser';
import { usePublicHolidays, useCreateHoliday, useUpdateHoliday } from '@/hooks/useHoliday';
import { useAccountType } from '@/utils/accountTypeUtils';
import { getRoleFromUser } from '@/utils/roleUtils';
import { SettingsContent } from './SettingsContent';


export type SettingsTab = 'company' | 'leaves' | 'working-hours' | 'integrations' | 'notifications' | 'security' | 'access-management';

export function SettingsPage() {
  const router = useRouter();
  const { isIndividual } = useAccountType();

  // Redirect individual accounts to profile page
  useEffect(() => {
    if (isIndividual) {
      router.replace('/dashboard/profile');
    }
  }, [isIndividual, router]);

  // Use standardized tab sync hook
  const [activeTab, setActiveTab] = useTabSync<SettingsTab>({
    defaultTab: 'company',
    validTabs: ['company', 'leaves', 'working-hours', 'integrations', 'notifications', 'security', 'access-management']
  });

  const updateCompanyMutation = useUpdateCompany();
  const { data: companyData, isLoading: isLoadingCompany } = useCurrentUserCompany();
  const { data: userDetails, isLoading: isLoadingUser } = useUserDetails();
  const { data: holidaysData } = usePublicHolidays();
  const { data: rolesData } = useRoles();

  const isAdmin = useMemo(() => {
    const userData = userDetails?.result || {};
    return getRoleFromUser(userData) === 'Admin';
  }, [userDetails]);

  const upsertRoleMutation = useUpsertRole();
  const updatePermissionsMutation = useUpdateRolePermissions();
  const createHolidayMutation = useCreateHoliday();
  const updateHolidayMutation = useUpdateHoliday();

  // Permissions check for initial visibility
  const permissions = userDetails?.result?.permissions?.['Settings'] || {};

  // Wait for critical data
  if (isLoadingCompany || isLoadingUser) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <SettingsContent
      key={companyData?.result?.id || 'new'}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isIndividual={isIndividual}
      isAdmin={isAdmin}
      companyData={companyData}
      holidaysData={holidaysData}
      rolesData={rolesData}
      userDetails={userDetails}
      updateCompanyMutation={updateCompanyMutation}
      upsertRoleMutation={upsertRoleMutation}
      updatePermissionsMutation={updatePermissionsMutation}
      createHolidayMutation={createHolidayMutation}
      updateHolidayMutation={updateHolidayMutation}
      permissions={permissions}
    />
  );
}