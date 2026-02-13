import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useDocumentSettings } from './useDocumentSettings';
import { mapUserDtoToProfileData, calculateProfileCompletion } from '../utils/profile.utils';
import { UserDto } from '../types/dto/user.dto';

export const useProfileCompletion = () => {
    const { user } = useCurrentUser();
    const { documentTypes } = useDocumentSettings();

    const result = useMemo(() => {
        if (!user) {
            return {
                percentage: 0,
                missingFields: [],
                isComplete: false,
                profileData: null
            };
        }

        // Map user data to standardized profile data
        // Casting to UserDto because CurrentUser is compatible but types might be loose
        const profileData = mapUserDtoToProfileData(user as unknown as UserDto);

        // Calculate completion
        const completion = calculateProfileCompletion(profileData, documentTypes);

        return {
            ...completion,
            profileData
        };
    }, [user, documentTypes]);

    return result;
};
