import { useMemo } from 'react';
import { useUserDetails } from './useUser';

// Define a unified User type that covers what's currently being used in the app
// This effectively combines parts of the API response wrapper and the user object
// to handle the messy state of current types
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  user_profile?: {
    first_name?: string;
    last_name?: string;
    profile_pic?: string;
    designation?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  company?: {
    name?: string;
    id?: number;
    account_type?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const useCurrentUser = () => {
  const { data: userDetailsData, isLoading, error } = useUserDetails();

  const user = useMemo(() => {
    // Prefer API data if available
    if (userDetailsData?.result?.user) {
      return userDetailsData.result.user;
    }
    if (userDetailsData?.result && !userDetailsData.result.user) {
      return userDetailsData.result; // Handle flattened response
    }

    return null;
  }, [userDetailsData]);

  const result = useMemo(() => ({
    user: user as CurrentUser | null,
    isLoading: isLoading && !user,
    isAuthenticated: !!user,
    error
  }), [user, isLoading, error]);

  return result;
};
