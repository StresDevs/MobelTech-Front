'use client';

import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { FinanceAccounts } from '@/components/modules/finance/finance-accounts';
import { Card } from '@/components/ui/card';
import {
  CLIENT_PROJECT_PAYMENT_PLANS,
  CONTRACTOR_PROJECT_PAYMENT_PLANS,
  FINANCE_PAYMENT_HISTORY,
  getFinancialBalanceSummary,
  getInstallmentAlerts,
} from '@/lib/mock-data';
import { AlertTriangle, ArrowRightLeft, HandCoins, PieChart, Wallet } from 'lucide-react';

function currency(value: number) {
  return `Bs. ${value.toLocaleString('es-BO')}`;
}

export default function FinancePage() {
  const metrics = useMemo(() => {
    const totalReceivable = CLIENT_PROJECT_PAYMENT_PLANS.reduce((sum, plan) => sum + plan.totalProjectAmount, 0);
    const totalPayable = CONTRACTOR_PROJECT_PAYMENT_PLANS.reduce((sum, plan) => sum + plan.totalAgreedAmount, 0);
    const receivablePayments = FINANCE_PAYMENT_HISTORY.filter((entry) => entry.type === 'receivable');
    const payablePayments = FINANCE_PAYMENT_HISTORY.filter((entry) => entry.type === 'payable');
    const receivableBalance = getFinancialBalanceSummary(totalReceivable, receivablePayments);
    const payableBalance = getFinancialBalanceSummary(totalPayable, payablePayments);
    const alerts = getInstallmentAlerts();
    const now = new Date();
    const thisMonthActivity = FINANCE_PAYMENT_HISTORY.filter((entry) => {
      const date = entry.date;
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;

    return {
      receivableBalance,
      payableBalance,
      alerts,
      thisMonthActivity,
    };
  }, []);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(214,168,90,0.18),rgba(255,255,255,0.96))] p-6 shadow-sm dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(24,24,24,0.96))]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Pagos</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Cuentas por cobrar y por pagar</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Mantén control de anticipos, saldos pendientes y alertas de pago en un panel pensado para decisiones rápidas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <SummaryBadge icon={<Wallet className="h-4 w-4" />} label="Cobrar" value={currency(metrics.receivableBalance.remainingBalance)} />
              <SummaryBadge icon={<HandCoins className="h-4 w-4" />} label="Pagar" value={currency(metrics.payableBalance.remainingBalance)} />
              <SummaryBadge icon={<AlertTriangle className="h-4 w-4" />} label="Alertas" value={String(metrics.alerts.length)} />
              <SummaryBadge icon={<ArrowRightLeft className="h-4 w-4" />} label="Movimientos" value={String(metrics.thisMonthActivity)} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Saldo por cobrar" value={currency(metrics.receivableBalance.remainingBalance)} helper={`${metrics.receivableBalance.totalPaid.toLocaleString('es-BO')} ya registrados`} />
          <MetricCard label="Saldo por pagar" value={currency(metrics.payableBalance.remainingBalance)} helper={`${metrics.payableBalance.totalPaid.toLocaleString('es-BO')} ya registrados`} />
          <MetricCard label="Alertas activas" value={String(metrics.alerts.length)} helper="Vencimientos o pagos próximos" />
          <MetricCard label="Trazabilidad mensual" value={String(metrics.thisMonthActivity)} helper="Movimientos en el mes actual" />
        </div>

        <FinanceAccounts />
      </div>
    </AppLayout>
  );
}

function SummaryBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/70 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </Card>
  );
}
