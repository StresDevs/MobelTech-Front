'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PURCHASE_ORDERS, SUPPLIERS, MATERIALS } from '@/lib/mock-data';
import { Plus, Eye } from 'lucide-react';

export function PurchaseOrders() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'defective':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      received: 'Recibido',
      partial: 'Parcial',
      defective: 'Defectuoso',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Órdenes de Compra</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID Orden</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proveedor</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Materiales</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {PURCHASE_ORDERS.map((po) => {
              const supplier = SUPPLIERS.find(s => s.id === po.supplierId);
              const materialNames = po.materials
                .map((m) => {
                  const material = MATERIALS.find(mat => mat.id === m.materialId);
                  return material?.name;
                })
                .filter(Boolean)
                .join(', ');

              return (
                <tr key={po.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{po.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-sm">{supplier?.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier?.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-xs truncate" title={materialNames}>
                    {materialNames}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    Bs. {po.totalAmount.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(po.status)}>
                      {getStatusLabel(po.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="p-4 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Total en órdenes pendientes:</strong> Bs.{' '}
          {PURCHASE_ORDERS.filter(po => po.status === 'pending')
            .reduce((sum, po) => sum + po.totalAmount, 0)
            .toLocaleString('es-BO')}
        </p>
      </Card>
    </div>
  );
}
