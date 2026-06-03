 'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useLocalData } from '@/lib/contexts/LocalDataContext';
import { Plus, Edit, Check, X } from 'lucide-react';
import { QUOTATION_STATUS_FLOW } from '@/lib/constants';

export function QuotationList() {
  const { quotations, clients, updateQuotation } = useLocalData();
  const [localQuotations, setLocalQuotations] = useState(quotations);

  const updateQuotationStatus = (quotationId: string, newStatus: string) => {
    updateQuotation(quotationId, { status: newStatus as any });
    setLocalQuotations((prev) => prev.map((q) => (q.id === quotationId ? { ...q, status: newStatus as any } : q)));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      adjustment: 'Ajuste',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cotizaciones</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ítems</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
                  {localQuotations.map((quote) => {
                    const client = clients.find((c) => c.id === quote.clientId);
                    const nextStatuses = QUOTATION_STATUS_FLOW[quote.status as keyof typeof QUOTATION_STATUS_FLOW] || [];

              return (
                <tr key={quote.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-xs">{quote.id}</td>
                  <td className="py-3 px-4">{client?.name}</td>
                  <td className="py-3 px-4 text-xs">{quote.items.length} artículos</td>
                  <td className="py-3 px-4 text-right font-mono">
                    Bs. {quote.totalAmount.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(quote.status)}>
                      {getStatusLabel(quote.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {nextStatuses.length > 0 && (
                        <div className="flex gap-1">
                          {nextStatuses.map((status) => (
                            <Button
                              key={status}
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuotationStatus(quote.id, status)}
                              title={`Cambiar a ${getStatusLabel(status)}`}
                            >
                              {status === 'approved' && <Check className="w-4 h-4 text-green-600" />}
                              {status === 'rejected' && <X className="w-4 h-4 text-red-600" />}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
        <p>💡 Haz clic en los botones de estado para cambiar el estado de la cotización</p>
      </div>
    </div>
  );
}
