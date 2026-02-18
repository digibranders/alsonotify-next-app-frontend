import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

export function ProfileCompletionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { percentage: profileCompletion } = useProfileCompletion();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only access storage on client side
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const isPersistentDismissed = localStorage.getItem('profileCompletionBannerDismissed') === 'true';
        const isSessionSeen = sessionStorage.getItem('profileCompletionBannerSeen') === 'true';
        const show = !isPersistentDismissed && !isSessionSeen;

        if (show) {
          setIsVisible(true);
          // Mark as seen immediately so it won't show on next interaction/reload
          sessionStorage.setItem('profileCompletionBannerSeen', 'true');
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-[#2F80ED]">
            {profileCompletion}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#111111]">
            Complete your profile
          </span>
          <span className="text-xs text-[#666666] font-medium">
            Add your professional documents to verify your account
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCompleteNow}
          className="bg-[#2F80ED] hover:bg-[#2F80ED]/90 text-white text-[0.8125rem] h-8 px-4 font-semibold rounded-full shadow-lg shadow-[#2F80ED]/20 flex items-center gap-2 group transition-all"
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


