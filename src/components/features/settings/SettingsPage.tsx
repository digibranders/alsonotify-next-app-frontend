import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import { useUpdateCompany, useCurrentUserCompany, useRoles, useUpsertRole, useUpdateRolePermissions, useUserDetails } from '@/hooks/useUser';
import { usePublicHolidays, useCreateHoliday, useUpdateHoliday } from '@/hooks/useHoliday';
import { useAccountType } from '@/utils/format/accountTypeUtils';
import { getRoleFromUser } from '@/utils/roleUtils';
import { SettingsContent } from './SettingsContent';
import { Skeleton } from '@/components/ui/Skeleton';


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
    return (
      <div className="flex h-full gap-6 p-6 bg-white rounded-[24px]">
        {/* Tab list skeleton */}
        <div className="flex flex-col gap-2 w-48 shrink-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        {/* Content area skeleton */}
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
          <div className="grid grid-cols-2 gap-4 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-28 rounded-lg mt-2" />
        </div>
      </div>
    );
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