'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONTRACTORS, PRODUCTION_ORDERS } from '@/lib/mock-data';
import { DollarSign, CheckCircle } from 'lucide-react';

export function ContractorPayments() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pagos a Contratistas</h2>

      <div className="overflow-x-auto">
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
            {CONTRACTORS.map((contractor) => {
              const order = PRODUCTION_ORDERS.find(o => o.assignedContractorId === contractor.id);
              const totalPaid =
                (contractor.advances.advance1 || 0) +
                (contractor.advances.advance2 || 0) +
                (contractor.advances.advance3 || 0);
              const totalAmount = totalPaid + (contractor.advances.balance || 0);
              const isPaid = contractor.advances.balance === 0 || contractor.advances.balance <= 0;

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
