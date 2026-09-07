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

/**
 * The signed-in user's Azure AD object id, or `null` when we do not have one.
 *
 * `azure_oid` is nullable on the backend `User` model and is, today, never
 * written by any code path, so absence is the normal case rather than an edge
 * one. Callers must treat `null` as "unknown" instead of substituting `''`:
 * an empty-string id compares false against every real sender id, which is
 * exactly how the user's own messages ended up rendering as somebody else's.
 *
 * The `typeof` check is what makes the read safe. `CurrentUser` carries an
 * index signature, so `user.azure_oid` is already `any` and a cast asserts
 * nothing — the double cast this replaces was a type annotation, not a check.
 */
export function getAzureOid(user: CurrentUser | null | undefined): string | null {
  const oid = user?.azure_oid;
  return typeof oid === 'string' && oid !== '' ? oid : null;
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
