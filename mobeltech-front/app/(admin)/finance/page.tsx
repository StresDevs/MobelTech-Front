'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { FinanceAccounts } from '@/components/modules/finance/finance-accounts';

export default function FinancePage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de cuentas por cobrar y cuentas por pagar con trazabilidad completa
          </p>
        </div>

        <FinanceAccounts />
      </div>
    </AppLayout>
  );
}
