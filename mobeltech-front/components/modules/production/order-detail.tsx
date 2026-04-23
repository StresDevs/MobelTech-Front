'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PRODUCTION_ORDERS, PROJECTS, CLIENTS } from '@/lib/mock-data';
import { PRODUCTION_PHASES } from '@/lib/constants';
import { useState } from 'react';

export function OrderDetail() {
  const [orders, setOrders] = useState(PRODUCTION_ORDERS);

  const updatePhase = (orderId: string, itemId: string, phaseName: string, completed: boolean) => {
    setOrders(
      orders.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          items: order.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              phases: item.phases.map((phase) =>
                phase.name === phaseName
                  ? { ...phase, completed, completedDate: completed ? new Date() : undefined }
                  : phase
              ),
              progress: Math.round(
                (item.phases.filter((p) => p.name === phaseName ? completed : p.completed).length / item.phases.length) * 100
              ),
            };
          }),
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Seguimiento de Órdenes de Producción</h2>

      {orders.map((order) => {
        const project = PROJECTS.find(p => p.id === order.projectId);
        const client = CLIENTS.find(c => c.id === project?.clientId);

        return (
          <Card key={order.id} className="p-4 md:p-6 border border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Orden: {order.id}</p>
                <h3 className="text-lg font-semibold">{project?.name}</h3>
                <p className="text-sm text-muted-foreground">{client?.name}</p>
              </div>
              <Badge
                className={
                  order.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : order.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }
              >
                {order.status === 'completed' ? 'Completado' : order.status === 'in-progress' ? 'En Progreso' : 'Pendiente'}
              </Badge>
            </div>

            <div className="space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="border-t border-border pt-6">
                  <div className="mb-4">
                    <p className="font-semibold">{item.description} (Qty: {item.quantity})</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${item.progress}%`, backgroundColor: '#d6a85a' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.progress}% completado</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                    {item.phases.map((phase) => {
                      const phaseInfo = PRODUCTION_PHASES.find(p => p.id === phase.name);
                      return (
                        <div key={phase.name} className="flex items-center gap-2">
                          <Checkbox
                            id={`${item.id}-${phase.name}`}
                            checked={phase.completed}
                            onCheckedChange={(checked) =>
                              updatePhase(order.id, item.id, phase.name, checked as boolean)
                            }
                            disabled={order.status === 'completed'}
                          />
                          <label
                            htmlFor={`${item.id}-${phase.name}`}
                            className="text-xs font-medium cursor-pointer truncate"
                            title={phaseInfo?.label}
                          >
                            {phaseInfo?.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="font-semibold text-sm">{order.startDate.toLocaleDateString('es-BO')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entrega Estimada</p>
                  <p className="font-semibold text-sm">{order.estimatedDeliveryDate.toLocaleDateString('es-BO')}</p>
                </div>
                <div>
                  {order.actualDeliveryDate && (
                    <>
                      <p className="text-xs text-muted-foreground">Entrega Real</p>
                      <p className="font-semibold text-sm">{order.actualDeliveryDate.toLocaleDateString('es-BO')}</p>
                    </>
                  )}
                </div>
                <div className="text-left sm:text-right lg:text-right">
                  <Button variant="outline" size="sm" disabled={order.status === 'completed'}>
                    Actualizar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
