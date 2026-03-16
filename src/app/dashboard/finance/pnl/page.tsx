'use client';

import { Suspense } from 'react';
import { PnLDashboard } from '../../../../components/features/finance/PnLDashboard';

export default function PnLPageRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading P&L Dashboard...</div>}>
        <PnLDashboard />
      </Suspense>
    </div>
  );
}
