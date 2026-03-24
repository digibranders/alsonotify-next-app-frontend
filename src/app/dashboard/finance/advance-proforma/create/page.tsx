'use client';

import { Suspense } from 'react';
import { CreateAdvanceProformaPage } from '../../../../../components/features/finance/CreateAdvanceProformaPage';

export default function Page() {
    return (
        <Suspense>
            <CreateAdvanceProformaPage />
        </Suspense>
    );
}
