'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONTRACTORS, PRODUCTION_ORDERS } from '@/lib/mock-data';
import { DollarSign, CheckCircle } from 'lucide-react';

export function ContractorPayments() {
  const paymentsSummary = CONTRACTORS.map((contractor) => {
    const order = PRODUCTION_ORDERS.find((o) => o.assignedContractorId === contractor.id);
    const totalPaid =
      (contractor.advances.advance1 || 0) +
      (contractor.advances.advance2 || 0) +
      (contractor.advances.advance3 || 0);
    const totalAmount = totalPaid + (contractor.advances.balance || 0);
    const isPaid = contractor.advances.balance === 0 || contractor.advances.balance <= 0;

    return {
      contractor,
      order,
      totalPaid,
      totalAmount,
      isPaid,
    };
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pagos a Contratistas</h2>

      <div className="space-y-3 lg:hidden">
        {paymentsSummary.map(({ contractor, totalPaid, totalAmount, isPaid }) => (
          <Card key={`payment-mobile-${contractor.id}`} className="p-4 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{contractor.name}</p>
                <p className="text-xs text-muted-foreground">{contractor.specialization}</p>
                <p className="text-xs text-muted-foreground">{contractor.phone}</p>
              </div>
              <Badge
                className={
                  isPaid
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }
              >
                {isPaid ? 'Pagado' : 'Pendiente'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div>
                <p className="text-muted-foreground">Anticipo 1</p>
                <p className="font-mono">Bs. {(contractor.advances.advance1 || 0).toLocaleString('es-BO')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Anticipo 2</p>
                <p className="font-mono">Bs. {(contractor.advances.advance2 || 0).toLocaleString('es-BO')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Anticipo 3</p>
                <p className="font-mono">Bs. {(contractor.advances.advance3 || 0).toLocaleString('es-BO')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p
                  className="font-mono"
                  style={{ color: contractor.advances.balance > 0 ? '#ef4444' : '#10b981' }}
                >
                  Bs. {(contractor.advances.balance || 0).toLocaleString('es-BO')}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total pagado</span>
              <span className="font-mono">Bs. {totalPaid.toLocaleString('es-BO')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-semibold">Bs. {totalAmount.toLocaleString('es-BO')}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Contratista</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Especialidad</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Anticipo 1</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Anticipo 2</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Anticipo 3</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Balance</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {paymentsSummary.map(({ contractor, totalAmount, isPaid }) => {

              return (
                <tr key={contractor.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <p className="font-semibold">{contractor.name}</p>
                    <p className="text-xs text-muted-foreground">{contractor.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-xs">{contractor.specialization}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    Bs. {(contractor.advances.advance1 || 0).toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    Bs. {(contractor.advances.advance2 || 0).toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    Bs. {(contractor.advances.advance3 || 0).toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    <span style={{ color: contractor.advances.balance > 0 ? '#ef4444' : '#10b981' }}>
                      Bs. {(contractor.advances.balance || 0).toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-semibold">
                    Bs. {totalAmount.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        isPaid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }
                    >
                      {isPaid ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="p-4 border border-border bg-muted">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4" />
          <p>
            <strong>Total en pagos pendientes:</strong> Bs.{' '}
            {CONTRACTORS.reduce((sum, c) => sum + (c.advances.balance || 0), 0).toLocaleString(
              'es-BO'
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
