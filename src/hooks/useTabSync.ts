import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

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
 * Uses history.replaceState to update URL without triggering a Next.js
 * navigation re-render, eliminating tab switch flickering.
 */
export function useTabSync<T extends string>({
    defaultTab,
    validTabs,
    paramName = 'tab'
}: UseTabSyncOptions<T>) {
    const searchParams = useSearchParams();

    // Stabilization for validTabs
    const validTabsJson = JSON.stringify(validTabs);
    const stableValidTabs = useMemo(() => validTabs, [validTabsJson, validTabs]);

    // Initialize state from URL (runs once on mount)
    const [activeTab, setActiveTabState] = useState<T>(() =>
        getInitialTab(new URLSearchParams(searchParams.toString()), stableValidTabs, defaultTab, paramName)
    );

    // Handler to update state and URL without triggering Next.js re-render
    const setActiveTab = useCallback((newTab: T) => {
        if (!stableValidTabs.includes(newTab)) return;

        // 1. Update local state immediately (single synchronous render)
        setActiveTabState(newTab);

        // 2. Update URL without triggering Next.js navigation/re-render
        const params = new URLSearchParams(window.location.search);
        if (newTab === defaultTab) {
            params.delete(paramName);
        } else {
            params.set(paramName, newTab);
        }
        const query = params.toString();
        const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState(null, '', url);
    }, [paramName, defaultTab, stableValidTabs]);

    return [activeTab, setActiveTab] as const;
}
