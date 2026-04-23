'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { MaterialRequestsReview } from '@/components/modules/contractors/material-requests-review';

export default function ContractorRequestsPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Solicitudes de Contratistas</h1>
          <p className="text-muted-foreground mt-2">Revisa y aprueba las solicitudes de materiales de los contratistas</p>
        </div>
        <MaterialRequestsReview />
      </div>
    </AppLayout>
  );
}
