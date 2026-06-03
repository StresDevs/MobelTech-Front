'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLocalData } from '@/lib/contexts/LocalDataContext';
import { AlertCircle, Calendar, ClipboardList } from 'lucide-react';

export default function AssignedJobs() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const { productionOrders, quotations, clients, notifications, updateNotification } = useLocalData();

  const myJobs = useMemo(() => {
    if (!user) return [];
    return productionOrders.filter((j) => j.assignedContractorId === user.id);
  }, [productionOrders, user]);

  const myNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter((n) => n.recipientId === user.id && !n.read);
  }, [notifications, user]);

  const formatDate = (d?: Date) => (d ? d.toLocaleDateString('es-BO') : 'N/A');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return <Card className="p-4">Inicia sesión para ver tus trabajos asignados.</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Trabajos asignados</h2>
        <div className="text-sm text-muted-foreground">Total: <span className="font-medium">{myJobs.length}</span></div>
      </div>

      {myNotifications.length > 0 && (
        <div className="space-y-2">
          {myNotifications.map((n) => (
            <Card key={n.id} className="p-3 bg-yellow-50 border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { updateNotification(n.id, { read: true }); if (n.relatedJobId) setSelected(n.relatedJobId); }}>
                    Ver
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Mobile list */}
      <div className="space-y-3 lg:hidden">
        {myJobs.map((job) => {
          const quotation = quotations.find((q) => q.id === job.quotationId);
          const client = clients.find((c) => c.id === quotation?.clientId);
          const delayed = job.estimatedDeliveryDate && new Date() > job.estimatedDeliveryDate && job.status !== 'completed';

          return (
            <Card key={job.id} className="p-4 border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold">{job.id}</p>
                  <p className="font-semibold text-sm truncate">{quotation?.items?.[0]?.description || 'Trabajo sin título'}</p>
                  <p className="text-xs text-muted-foreground truncate">{client?.name || 'Cliente desconocido'}</p>
                </div>
                <Badge className={getStatusColor(job.status)}>{job.status === 'in-progress' ? 'En Progreso' : job.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p className="font-medium">{formatDate(job.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entrega Est.</p>
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{formatDate(job.estimatedDeliveryDate)}</p>
                    {delayed && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Ítems</p>
                  <p className="font-medium">{job.items.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progreso</p>
                  <p className="font-medium">{Math.round((job.items.reduce((s, it) => s + (it.progress || 0), 0) / (job.items.length || 1)))}%</p>
                </div>
              </div>

                <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(selected === job.id ? null : job.id)}>
                  Ver Detalles
                </Button>
              </div>

              {selected === job.id && (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <p className="font-medium">Ítems</p>
                  <ul className="mt-2 space-y-2">
                    {job.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{it.description}</p>
                          <p className="text-xs text-muted-foreground">Cantidad: {it.quantity}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">Progreso: {it.progress ?? 0}%</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Inicio</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Entrega Est.</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ítems</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Progreso</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {myJobs.map((job) => {
              const quotation = quotations.find((q) => q.id === job.quotationId);
              const client = clients.find((c) => c.id === quotation?.clientId);
              const delayed = job.estimatedDeliveryDate && new Date() > job.estimatedDeliveryDate && job.status !== 'completed';
              const prog = Math.round((job.items.reduce((s, it) => s + (it.progress || 0), 0) / (job.items.length || 1)));

              return (
                <tr key={job.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{job.id}</td>
                  <td className="py-3 px-4">{quotation?.items?.[0]?.description || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{client?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-xs">{formatDate(job.startDate)}</td>
                  <td className="py-3 px-4 text-xs">
                    <div className="flex items-center gap-1">
                      {formatDate(job.estimatedDeliveryDate)}
                      {delayed && <AlertCircle className="w-4 h-4 text-red-600" />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">{job.items.length}</td>
                  <td className="py-3 px-4 text-xs">{prog}%</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(selected === job.id ? null : job.id)}>
                        Detalles
                      </Button>
                      <Button variant="ghost" size="sm">
                        Mensaje
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected details (desktop) */}
      {selected && (
        <Card className="p-4">
          <h3 className="font-semibold">Detalles - {selected}</h3>
          <div className="mt-3 text-sm">
              {(() => {
              const job = myJobs.find((j) => j.id === selected);
              if (!job) return <p>Trabajo no encontrado.</p>;
              const quotation = quotations.find((q) => q.id === job.quotationId);
              const client = clients.find((c) => c.id === quotation?.clientId);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Proyecto</p>
                    <p className="font-medium">{quotation?.items?.[0]?.description || job.id}</p>
                    <p className="text-xs text-muted-foreground mt-2">Cliente</p>
                    <p className="font-medium">{client?.name}</p>
                    <p className="text-xs text-muted-foreground mt-2">Contacto</p>
                    <p className="font-medium">{client?.phone} · {client?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fechas</p>
                    <p className="font-medium">Inicio: {formatDate(job.startDate)}</p>
                    <p className="font-medium">Entrega Est.: {formatDate(job.estimatedDeliveryDate)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Ítems</p>
                    <ul className="mt-2 space-y-1">
                      {job.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{it.description}</p>
                            <p className="text-xs text-muted-foreground">Cantidad: {it.quantity}</p>
                          </div>
                          <div className="text-xs text-muted-foreground">{it.progress ?? 0}%</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
