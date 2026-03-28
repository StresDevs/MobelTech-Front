'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PRODUCTION_ORDERS, PROJECTS, CLIENTS } from '@/lib/mock-data';
import { Plus, Calendar, AlertCircle } from 'lucide-react';

export function OrdersList() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      'in-progress': 'En Progreso',
      delayed: 'Retrasado',
      completed: 'Completado',
    };
    return labels[status] || status;
  };

  const isDelayed = (estimatedDate: Date) => {
    return new Date() > estimatedDate;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Órdenes de Producción</h2>
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
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Inicio</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Entrega Est.</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ítems</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTION_ORDERS.map((order) => {
              const project = PROJECTS.find(p => p.id === order.projectId);
              const client = CLIENTS.find(c => c.id === project?.clientId);
              const delayed = isDelayed(order.estimatedDeliveryDate) && order.status !== 'completed';

              return (
                <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{order.id}</td>
                  <td className="py-3 px-4">{project?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{client?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-xs">
                    {order.startDate.toLocaleDateString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div className="flex items-center gap-1">
                      {order.estimatedDeliveryDate.toLocaleDateString('es-BO')}
                      {delayed && <AlertCircle className="w-4 h-4 text-red-600" />}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(delayed ? 'delayed' : order.status)}>
                      {delayed ? 'Retrasado' : getStatusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs">{order.items.length}</td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
