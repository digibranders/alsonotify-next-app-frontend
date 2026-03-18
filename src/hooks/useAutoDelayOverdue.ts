/**
 * useAutoDelayOverdue
 *
 * Detects overdue requirements (active status + past due date) and
 * automatically transitions them to "Delayed" status via the API.
 *
 * Runs silently — no user-facing toast or notification.
 * Uses a ref to prevent duplicate processing within the same session.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getOverdueRequirementIds } from '@/lib/workflow';
import { updateRequirementById } from '@/services/workspace';
import { queryKeys } from '@/lib/queryKeys';

interface RequirementLike {
  id: number;
  status: string;
  end_date?: string | null;
}

export function useAutoDelayOverdue(requirements: ReadonlyArray<RequirementLike> | undefined) {
  const queryClient = useQueryClient();
  const processedIdsRef = useRef<Set<number>>(new Set());
  const processingRef = useRef(false);

  const processOverdue = useCallback(async (overdueIds: number[]) => {
    if (processingRef.current || overdueIds.length === 0) return;
    processingRef.current = true;

    try {
      // Update each overdue requirement to Delayed status
      await Promise.allSettled(
        overdueIds.map((id) =>
          updateRequirementById({ id, status: 'Delayed' })
        )
      );

      // Mark as processed so we don't re-process on the next render
      overdueIds.forEach((id) => processedIdsRef.current.add(id));

      // Invalidate queries once after all updates
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.allRoot() });
      queryClient.invalidateQueries({ queryKey: ['requirements', 'workspace'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.collaborative() });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.dropdownRoot() });
    } finally {
      processingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (!requirements || requirements.length === 0) return;

    const overdueIds = getOverdueRequirementIds(requirements).filter(
      (id) => !processedIdsRef.current.has(id)
    );

    if (overdueIds.length > 0) {
      processOverdue(overdueIds);
    }
  }, [requirements, processOverdue]);
}
