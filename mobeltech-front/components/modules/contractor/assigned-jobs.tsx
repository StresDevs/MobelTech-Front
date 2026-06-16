'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Phone,
  UserRound,
} from 'lucide-react';
import { PageLoadingState } from '@/components/ui/page-loading-state';

type ContractorRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  specialization?: string | null;
  status: string;
};

type QuotationRecord = {
  id: string;
  clientId: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
};

type ProductionOrderRecord = {
  id: string;
  quotationId?: string | null;
  assignedContractorId?: string | null;
  startDate: string | Date;
  estimatedDeliveryDate: string | Date;
  actualDeliveryDate?: string | Date | null;
  status: 'pending' | 'in-progress' | 'delayed' | 'completed';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    progress?: number;
  }>;
};

type NotificationRecord = {
  id: string;
  recipientUserId: string;
  message: string;
  relatedJobId?: string | null;
  read: boolean;
  createdAt: string | Date;
};

function normalizeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function AssignedJobs() {
  const { user } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ProductionOrderRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);

  async function loadAssignedData(options?: { silent?: boolean }) {
    if (!apiBase || !user) {
      setLoading(false);
      return;
    }

    const silent = options?.silent === true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      let activeContractor = contractor;
      if (!activeContractor) {
        const contractorsResponse = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
        if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas');
        const contractorRows = (await contractorsResponse.json()) as ContractorRecord[];
        activeContractor =
          contractorRows.find((row) => row.userId === user.id || row.id === user.id) ?? null;
        setContractor(activeContractor);
      }

      if (!activeContractor) {
        setJobs([]);
        setNotifications([]);
        setClients([]);
        setQuotations([]);
        setLoading(false);
        return;
      }

      const [jobsResponse, notificationsResponse, clientsResponse, quotationsResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/notifications?recipientUserId=${encodeURIComponent(user.id)}&unreadOnly=true`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
      ]);

      if (!jobsResponse.ok) throw new Error('No se pudieron cargar los trabajos asignados');
      if (!notificationsResponse.ok) throw new Error('No se pudieron cargar las notificaciones');
      if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones');

      const jobsJson = await jobsResponse.json();
      setJobs(jobsJson);
      setNotifications(await notificationsResponse.json());
      setClients(await clientsResponse.json());
      setQuotations(await quotationsResponse.json());
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Error cargando trabajos del contratista');
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadAssignedData();
  }, [apiBase, user?.id]);

  useEffect(() => {
    if (!apiBase || !user) return;
    const interval = window.setInterval(() => {
      void loadAssignedData({ silent: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [apiBase, user?.id, contractor?.id]);

  async function markNotificationAsRead(notificationId: string) {
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) return;
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch {
      // ignore
    }
  }

  const displayedJobs = useMemo(() => jobs, [jobs]);

  const formatDate = (value?: string | Date | null) => {
    const date = normalizeDate(value);
    if (!date) return 'N/A';
    return date.toLocaleDateString('es-BO');
  };

  const getProgress = (job: ProductionOrderRecord) => (
    Math.round(job.items.reduce((sum, item) => sum + (item.progress || 0), 0) / (job.items.length || 1))
  );

  const isDelayed = (job: ProductionOrderRecord) => {
    if (job.status === 'completed') return false;
    const deliveryDate = normalizeDate(job.estimatedDeliveryDate);
    return job.status === 'delayed' || Boolean(deliveryDate && new Date() > deliveryDate);
  };

  const summary = useMemo(() => {
    const delayed = displayedJobs.filter((job) => isDelayed(job)).length;
    const inProgress = displayedJobs.filter((job) => job.status === 'in-progress').length;
    const pending = displayedJobs.filter((job) => job.status === 'pending').length;
    const completed = displayedJobs.filter((job) => job.status === 'completed').length;
    return {
      total: displayedJobs.length,
      delayed,
      inProgress,
      pending,
      completed,
    };
  }, [displayedJobs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'delayed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return <Card className="p-4">Inicia sesión para ver tus trabajos asignados.</Card>;
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando trabajos asignados"
        description="Sincronizando notificaciones, órdenes de producción y datos del contratista."
        preview={
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-[#eab676]/20" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                  <Loader2 className="h-4 w-4 animate-spin text-[#eab676]" />
                </div>
              </div>
            ))}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-[#fff7ec] via-background to-[#eab676]/10 p-6">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(234,182,118,0.18),transparent_55%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eab676]/30 bg-[#eab676]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6b2f]">
              <ClipboardList className="h-3.5 w-3.5" />
              Panel de trabajo
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Trabajos asignados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {contractor ? `Vista operativa de ${contractor.name}. Revisa avances, fechas y datos de contacto.` : 'No encontramos tu perfil de contratista todavía.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {refreshing ? <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando</span> : null}
            <span className="rounded-full border border-border bg-background/80 px-3 py-1.5">Total activos: <span className="font-semibold text-foreground">{displayedJobs.length}</span></span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Total asignados"
          value={String(summary.total)}
          accent="#eab676"
        />
        <MetricCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="En progreso"
          value={String(summary.inProgress)}
          accent="#3b82f6"
        />
        <MetricCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Con retraso"
          value={String(summary.delayed)}
          accent="#ef4444"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completados"
          value={String(summary.completed)}
          accent="#10b981"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agenda operativa</h3>
          <p className="text-sm text-muted-foreground">Solo se muestran datos utiles para ejecucion, seguimiento y entrega.</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className="border-amber-200 bg-amber-50/90 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-900">{notification.message}</p>
                  </div>
                  <p className="mt-1 text-xs text-amber-800/80">{formatDate(notification.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void markNotificationAsRead(notification.id);
                    if (notification.relatedJobId) setSelected(notification.relatedJobId);
                  }}
                >
                  Ver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {displayedJobs.map((job) => {
          const quotation = quotations.find((row) => row.id === job.quotationId);
          const client = clients.find((row) => row.id === quotation?.clientId);
          const delayed = isDelayed(job);
          const progress = getProgress(job);
          const isExpanded = selected === job.id;
          const leadItem = quotation?.items?.[0]?.description || job.items[0]?.description || 'Trabajo sin título';

          return (
            <Card
              key={job.id}
              className={`overflow-hidden border-border/70 transition-all ${isExpanded ? 'shadow-lg shadow-black/5 ring-1 ring-[#eab676]/35' : 'hover:border-[#eab676]/35 hover:shadow-md'}`}
            >
              <div className="border-b border-border/60 bg-gradient-to-r from-[#fff8ef] via-background to-transparent px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a6b2f]">{job.id.slice(0, 8)}</p>
                      <Badge className={getStatusColor(job.status)}>{job.status === 'in-progress' ? 'En progreso' : job.status}</Badge>
                      {delayed ? <Badge className="bg-red-100 text-red-700">Atencion</Badge> : null}
                    </div>
                    <h4 className="mt-2 text-lg font-semibold leading-tight">{leadItem}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{client?.name || 'Cliente sin referencia'} · {job.items.length} tareas registradas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Progreso</p>
                    <p className="text-2xl font-bold text-foreground">{progress}%</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${delayed ? 'bg-red-500' : progress >= 100 ? 'bg-emerald-500' : 'bg-[#eab676]'}`}
                    style={{ width: `${Math.min(Math.max(progress, 6), 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <InfoChip icon={<UserRound className="h-3.5 w-3.5" />} label="Cliente" value={client?.name || 'No disponible'} />
                <InfoChip icon={<Phone className="h-3.5 w-3.5" />} label="Contacto" value={client?.phone || 'Sin telefono'} />
                <InfoChip icon={<CalendarDays className="h-3.5 w-3.5" />} label="Inicio" value={formatDate(job.startDate)} />
                <InfoChip icon={<AlertCircle className="h-3.5 w-3.5" />} label="Entrega estimada" value={formatDate(job.estimatedDeliveryDate)} />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
                <div className="text-xs text-muted-foreground">
                  {delayed ? 'Requiere atencion de entrega' : 'Seguimiento al dia'}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(isExpanded ? null : job.id)}>
                  {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                </Button>
              </div>

              {isExpanded ? (
                <div className="border-t border-border/60 bg-muted/20 px-5 py-4">
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <p className="text-sm font-semibold">Checklist de items</p>
                      <div className="mt-3 space-y-2">
                        {job.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between rounded-xl border border-border/60 bg-background px-3 py-3">
                            <div className="pr-3">
                              <p className="text-sm font-medium">{item.description}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avance</p>
                              <p className="text-sm font-semibold">{item.progress ?? 0}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border/60 bg-background p-4">
                        <p className="text-sm font-semibold">Resumen operativo</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Estado actual</span>
                            <span className="font-medium capitalize">{job.status.replace('-', ' ')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Items totales</span>
                            <span className="font-medium">{job.items.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Avance promedio</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background p-4">
                        <p className="text-sm font-semibold">Contacto del cliente</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <p className="font-medium">{client?.name || 'Cliente no disponible'}</p>
                          <p className="text-muted-foreground">{client?.phone || 'Sin telefono registrado'}</p>
                          <p className="text-muted-foreground">{client?.email || 'Sin correo registrado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {displayedJobs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No tienes trabajos asignados por el momento.
        </Card>
      ) : null}

    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="border-border/70 p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[11px] uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
