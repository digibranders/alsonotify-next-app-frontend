import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function ProfileCompletionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useCurrentUser();

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const isPersistentDismissed = localStorage.getItem('profileCompletionBannerDismissed') === 'true';
      const isSessionSeen = sessionStorage.getItem('profileCompletionBannerSeen') === 'true';
      return !isPersistentDismissed && !isSessionSeen;
    }
    return false;
  });

  // Handle session-based persistence
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      // Mark as seen immediately so it won't show on next interaction/reload
      sessionStorage.setItem('profileCompletionBannerSeen', 'true');
    }
  }, [isVisible]);

  // Get user data from localStorage or backend
  const user = useMemo(() => {
    return currentUser;
  }, [currentUser]);

  // Calculate profile completion percentage (same logic as ProfilePage)
  const profileCompletion = useMemo(() => {
    const userProfile = user?.user_profile || {};
    const fullName = user?.name || '';
    const nameParts = fullName.split(' ');

    const profile = {
      firstName: userProfile?.first_name || nameParts[0] || '',
      lastName: userProfile?.last_name || nameParts.slice(2).join(' ') || nameParts[1] || '',
      designation: userProfile?.designation || user?.designation || '',
      email: user?.email || '',
      dob: userProfile?.date_of_birth
        ? new Date(userProfile.date_of_birth).toISOString().split('T')[0]
        : '',
      gender: userProfile?.gender || '',
      employeeId: user?.employee_id || userProfile?.employee_id || '',
      country: userProfile?.country || '',
      addressLine1: userProfile?.address?.split(',')[0] || userProfile?.address || '',
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      zipCode: userProfile?.zipcode || '',
      emergencyContactName: userProfile?.emergency_contact_name || '',
      emergencyContactNumber: userProfile?.emergency_contact_number || '',
    };

    const requiredFields = [
      profile.firstName,
      profile.lastName,
      profile.designation,
      profile.email,
      profile.dob,
      profile.gender,
      profile.employeeId,
      profile.country,
      profile.addressLine1,
      profile.city,
      profile.state,
      profile.zipCode,
      profile.emergencyContactName,
      profile.emergencyContactNumber,
    ];

    const filledFields = requiredFields.filter(
      (field) => field && field.toString().trim() !== ''
    ).length;

    const totalFields = requiredFields.length;
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, [user]);

  // Don't show if dismissed, on profile page, or 100% complete
  if (!isVisible || pathname === '/dashboard/profile' || profileCompletion >= 100) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('profileCompletionBannerDismissed', 'true');
    }
  };

  const handleCompleteNow = () => {
    router.push('/dashboard/profile');
  };

  // Calculate stroke-dasharray for the progress circle
  // The circle path is approximately 100 units in length (2 * π * 15.9155 ≈ 100)
  // For percentage P: we want to show P% of the circle
  // strokeDasharray format is "dash, gap" - draw dash units, skip gap units
  // For a circle of length ~100: to show 85%, use "85, 15" (draw 85, skip 15)
  const circumference = 2 * Math.PI * 15.9155; // ≈ 100
  const dashLength = (profileCompletion / 100) * circumference;
  const gapLength = circumference - dashLength;
  const strokeDasharray = `${dashLength}, ${gapLength}`;

  return (
    <div className="w-full bg-[#F0F7FF] border border-[#2F80ED]/20 py-3 px-6 flex items-center justify-between shrink-0 rounded-[16px]">
      <div className="flex items-center gap-4">
        <div className="relative w-9 h-9 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              className="text-[#2F80ED]/20"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <path
              className="text-[#2F80ED]"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-[#2F80ED]">
            {profileCompletion}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
            Complete your profile
          </span>
          <span className="text-[12px] text-[#666666] font-['Inter:Medium',sans-serif]">
            Add your professional documents to verify your account
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCompleteNow}
          className="bg-[#2F80ED] hover:bg-[#2F80ED]/90 text-white text-[13px] h-8 px-4 font-['Manrope:SemiBold',sans-serif] rounded-full shadow-lg shadow-[#2F80ED]/20 flex items-center gap-2 group transition-all"
        >
          Complete Now
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#666666] hover:text-[#111111] transition-colors p-1 rounded-full hover:bg-[#2F80ED]/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

