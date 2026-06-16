'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { MaterialRequestsReview } from '@/components/modules/contractors/material-requests-review';
import { ContractorWarehouse } from '@/components/modules/contractors/contractor-warehouse';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ContractorRequestsPage() {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [loadingContractor, setLoadingContractor] = useState(currentRole === 'contractor');

  useEffect(() => {
    if (currentRole !== 'contractor' || !user || !apiBase) {
      setLoadingContractor(false);
      return;
    }

    const controller = new AbortController();

    async function loadContractor() {
      try {
        const response = await fetch(`${apiBase}/api/contractors`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error('No se pudo cargar el contratista.');
        const contractor = body.find((entry: { id: string; userId?: string | null }) => entry.userId === user?.id || entry.id === user?.id);
        setContractorId(contractor?.id ?? null);
      } catch {
        setContractorId(null);
      } finally {
        setLoadingContractor(false);
      }
    }

    void loadContractor();
    return () => controller.abort();
  }, [apiBase, currentRole, user]);

  if (currentRole === 'contractor' && user) {
    if (loadingContractor) {
      return (
        <AppLayout>
          <div className="p-6">
            <PageLoadingState
              title="Cargando solicitudes"
              description="Buscando tu perfil de contratista y tus materiales."
            />
          </div>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Solicitud de Material</h1>
            <p className="text-muted-foreground mt-2">Selecciona el trabajo dentro del formulario y solicita los materiales que necesites.</p>
          </div>

          {contractorId ? <ContractorWarehouse contractorId={contractorId} /> : <p>No se encontró tu registro de contratista.</p>}
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
