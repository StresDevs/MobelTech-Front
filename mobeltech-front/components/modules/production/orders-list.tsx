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

  const ordersWithMeta = PRODUCTION_ORDERS.map((order) => {
    const project = PROJECTS.find((p) => p.id === order.projectId);
    const client = CLIENTS.find((c) => c.id === project?.clientId);
    const delayed = isDelayed(order.estimatedDeliveryDate) && order.status !== 'completed';

    return {
      order,
      project,
      client,
      delayed,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Órdenes de Producción</h2>
        <Button size="sm" className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </div>

      <div className="space-y-3 lg:hidden">
        {ordersWithMeta.map(({ order, project, client, delayed }) => (
          <Card key={`order-mobile-${order.id}`} className="p-4 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="font-mono text-xs font-semibold">{order.id}</p>
                <p className="font-semibold text-sm truncate">{project?.name || 'N/A'}</p>
                <p className="text-xs text-muted-foreground truncate">{client?.name || 'N/A'}</p>
              </div>
              <Badge className={getStatusColor(delayed ? 'delayed' : order.status)}>
                {delayed ? 'Retrasado' : getStatusLabel(order.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div>
                <p className="text-muted-foreground">Inicio</p>
                <p className="font-medium">{order.startDate.toLocaleDateString('es-BO')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entrega Est.</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium">{order.estimatedDeliveryDate.toLocaleDateString('es-BO')}</p>
                  {delayed && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Ítems</p>
                <p className="font-medium">{order.items.length}</p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="mt-3 w-full">
              Ver Detalles
            </Button>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto">
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
            {ordersWithMeta.map(({ order, project, client, delayed }) => {

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
