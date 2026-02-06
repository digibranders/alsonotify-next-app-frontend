import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UseTabSyncOptions<T extends string> {
    defaultTab: T;
    validTabs: T[];
    paramName?: string;
}

/**
 * Get initial tab from URL
 */
function getInitialTab<T extends string>(
    searchParams: URLSearchParams,
    validTabs: T[],
    defaultTab: T,
    paramName: string
): T {
    const tabFromUrl = searchParams.get(paramName);
    return (tabFromUrl && validTabs.includes(tabFromUrl as T))
        ? (tabFromUrl as T)
        : defaultTab;
}

/**
 * Custom hook to sync tab state with URL search parameters.
 * Tab is synced from URL on popstate/load; router.replace keeps Next.js in sync.
 */
export function useTabSync<T extends string>({
    defaultTab,
    validTabs,
    paramName = 'tab'
}: UseTabSyncOptions<T>) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Stabilization for validTabs
    const validTabsJson = JSON.stringify(validTabs);
    const stableValidTabs = useMemo(() => validTabs, [validTabsJson, validTabs]);

    // Initialize state from URL
    const [activeTab, setActiveTabState] = useState<T>(() =>
        getInitialTab(new URLSearchParams(searchParams.toString()), stableValidTabs, defaultTab, paramName)
    );

    useEffect(() => {
        const tabFromUrl = searchParams.get(paramName) as T | null;
        const targetTab = (tabFromUrl && stableValidTabs.includes(tabFromUrl))
            ? tabFromUrl
            : defaultTab;

        if (targetTab !== activeTab) {
            // Defer update to avoid "setState synchronously in effect" warning
            const timer = setTimeout(() => {
                setActiveTabState(targetTab);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [searchParams, paramName, stableValidTabs, defaultTab, activeTab]);

    // Handler to update state and URL
    const setActiveTab = useCallback((newTab: T) => {
        if (!stableValidTabs.includes(newTab)) return;

        // 1. Update local state
        setActiveTabState(newTab);

        // 2. Update URL using Next.js Router (proper way to keep useSearchParams in sync)
        const params = new URLSearchParams(searchParams.toString());
        if (newTab === defaultTab) {
            params.delete(paramName);
        } else {
            params.set(paramName, newTab);
        }

        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;

        router.replace(url, { scroll: false });
    }, [searchParams, pathname, router, paramName, defaultTab, stableValidTabs]);

    return [activeTab, setActiveTab] as const;
}
