'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { MaterialRequestsReview } from '@/components/modules/contractors/material-requests-review';
import AssignedJobs from '@/components/modules/contractor/assigned-jobs';
import { ContractorWarehouse } from '@/components/modules/contractors/contractor-warehouse';
import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLocalData } from '@/lib/contexts/LocalDataContext';

export default function ContractorRequestsPage() {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const { contractors } = useLocalData();

  if (currentRole === 'contractor' && user) {
    const contractor = contractors.find((c) => c.userId === user.id || c.id === user.id) ?? contractors[0];
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Solicitud de Material</h1>
            <p className="text-muted-foreground mt-2">Selecciona tu trabajo asignado y solicita materiales</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AssignedJobs />
            </div>
            <div className="lg:col-span-2">
              {contractor ? <ContractorWarehouse contractorId={contractor.id} /> : <p>No se encontró tu registro de contratista.</p>}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
