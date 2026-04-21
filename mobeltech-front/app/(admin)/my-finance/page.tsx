'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { ContractorFinancePanel } from '@/components/modules/contractors/contractor-finance-panel';
import { useRole } from '@/hooks/use-role-context';

export default function MyFinancePage() {
  const { userName } = useRole();

  // En una aplicación real, el contractorId vendría del usuario autenticado.
  const contractorId = 'contr-1';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Finanzas</h1>
          <p className="text-muted-foreground mt-2">
            Registro interno de pagos para {userName} con comprobantes PDF y trazabilidad histórica
          </p>
        </div>

        <ContractorFinancePanel contractorId={contractorId} />
      </div>
    </AppLayout>
  );
}
