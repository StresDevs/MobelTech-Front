'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { MaterialRequestsReview } from '@/components/modules/contractors/material-requests-review';
import { ContractorWarehouse } from '@/components/modules/contractors/contractor-warehouse';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function ContractorRequestsPage() {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const embedded = searchParams.get('embedded') === '1';
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [loadingContractor, setLoadingContractor] = useState(currentRole === 'contractor');

  const wrapPage = (content: ReactNode) => {
    if (embedded) {
      return <div className="min-h-screen bg-background p-4 md:p-5">{content}</div>;
    }

    return <AppLayout>{content}</AppLayout>;
  };

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
      return wrapPage(
        <div className="p-6">
          <PageLoadingState
            title="Cargando solicitudes"
            description="Buscando tu perfil de contratista y tus materiales."
          />
        </div>,
      );
    }

    return wrapPage(
      <div className={`${embedded ? 'space-y-5' : 'p-6 space-y-6'}`}>
        <div>
          <h1 className={embedded ? 'text-2xl font-bold' : 'text-3xl font-bold'}>Solicitud de Material</h1>
          <p className="text-muted-foreground mt-2">Selecciona el trabajo dentro del formulario y solicita los materiales que necesites.</p>
        </div>

        {contractorId ? <ContractorWarehouse contractorId={contractorId} /> : <p>No se encontró tu registro de contratista.</p>}
      </div>,
    );
  }

  return wrapPage(
    <div className={`${embedded ? 'space-y-5' : 'p-6 space-y-6'}`}>
      <div>
        <h1 className={embedded ? 'text-2xl font-bold' : 'text-3xl font-bold'}>Solicitudes de Contratistas</h1>
        <p className="text-muted-foreground mt-2">Revisa y aprueba las solicitudes de materiales de los contratistas</p>
      </div>
      <MaterialRequestsReview />
    </div>,
  );
}
