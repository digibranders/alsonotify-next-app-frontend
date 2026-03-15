import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentUserCompany } from '@/hooks/useUser';

/**
 * Hook to get the account type with fallback logic
 * Checks company account_type first, then falls back to user account_type
 * This ensures individual accounts are correctly identified even if company
 * account_type was not set correctly during registration
 */
export const useAccountType = () => {
  const { user } = useCurrentUser();
  const { data: companyData } = useCurrentUserCompany();

  // First check company account_type
  const companyAccountType = companyData?.result?.account_type;
  
  // Fallback to user account_type if company account_type is missing or default
  const userAccountType = user?.account_type;
  
  // Determine the actual account type
  // If company has ORGANIZATION but user has INDIVIDUAL, trust the user
  const accountType = companyAccountType === 'INDIVIDUAL' 
    ? 'INDIVIDUAL' 
    : userAccountType === 'INDIVIDUAL' 
    ? 'INDIVIDUAL' 
    : companyAccountType || userAccountType || 'ORGANIZATION';

  const isIndividual = accountType === 'INDIVIDUAL';
  const isOrganization = accountType === 'ORGANIZATION';

  return {
    accountType,
    isIndividual,
    isOrganization,
  };
};
