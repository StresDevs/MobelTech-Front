"use client";

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CURRENCY_FORMAT } from '@/lib/constants';
import {
  CLIENTS,
  CONTRACTORS,
  INVOICES,
  MATERIAL_REQUESTS,
  PROJECT_FINANCES,
  PROJECTS,
  PRODUCTION_ORDERS,
  QUOTATIONS,
} from '@/lib/mock-data';
import { Activity, ArrowRight, CheckCircle2, Clock3, FileText, Filter, Layers3, PackageSearch, Search, TrendingUp, Users2 } from 'lucide-react';

type ProjectStatusFilter = 'all' | 'quotation' | 'production' | 'delivered';

type EnrichedProject = {
  id: string;
  name: string;
  status: 'quotation' | 'production' | 'delivered';
  clientName: string;
  contractorName: string | null;
  budget: number;
  totalRevenue: number;
  utility: number;
  utilityPercentage: number;
  progress: number;
  deliveryLabel: string;
  overdue: boolean;
  quotationLabel: string;
  quotationAmount: number;
  invoiceLabel: string | null;
  invoiceStatus: string | null;
  orderCount: number;
  requestCount: number;
  requestItems: number;
};

const STATUS_META = {
  quotation: { label: 'Cotización', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  production: { label: 'Producción', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
} as const;

function currency(value: number) {
  return `${CURRENCY_FORMAT}${value.toLocaleString('es-BO')}`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Sin fecha';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resolveContractorName(contractorId?: string | null) {
  if (!contractorId) return null;
  return CONTRACTORS.find((contractor) => contractor.id === contractorId || contractor.userId === contractorId)?.name ?? null;
}

function getProgressFromStatus(status: EnrichedProject['status']) {
  if (status === 'delivered') return 100;
  if (status === 'production') return 68;
  return 32;
}

function getStatusTone(utilityPercentage: number) {
  if (utilityPercentage >= 15) {
    return { className: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Saludable' };
  }
  if (utilityPercentage >= 10) {
    return { className: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Estable' };
  }
  return { className: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Baja' };
}

function buildProjectRows(): EnrichedProject[] {
  return PROJECTS.map((project) => {
    const finance = PROJECT_FINANCES.find((entry) => entry.projectId === project.id);
    const quotation = QUOTATIONS.find((entry) => entry.projectId === project.id);
    const invoice = INVOICES.find((entry) => entry.projectId === project.id);
    const orderRows = PRODUCTION_ORDERS.filter((order) => order.projectId === project.id);
    const requestRows = MATERIAL_REQUESTS.filter((request) => request.projectId === project.id);
    const contractorName = resolveContractorName(orderRows.find((order) => order.assignedContractorId)?.assignedContractorId ?? null);
    const completedDate = project.actualDeliveryDate ?? project.estimatedDeliveryDate;
    const overdue = project.status !== 'delivered' && new Date(project.estimatedDeliveryDate).getTime() < Date.now();

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      clientName: CLIENTS.find((client) => client.id === project.clientId)?.name ?? 'Cliente',
      contractorName,
      budget: project.budget,
      totalRevenue: project.totalRevenue ?? finance?.ingresos.total ?? 0,
      utility: finance?.utilidad ?? 0,
      utilityPercentage: finance?.utilidadPercentage ?? 0,
      progress: getProgressFromStatus(project.status),
      deliveryLabel: `${formatDate(project.startDate)} - ${formatDate(completedDate)}`,
      overdue,
      quotationLabel: quotation ? quotation.status : 'Sin cotización',
      quotationAmount: quotation?.totalAmount ?? 0,
      invoiceLabel: invoice ? invoice.number : null,
      invoiceStatus: invoice ? invoice.status : null,
      orderCount: orderRows.length,
      requestCount: requestRows.length,
      requestItems: requestRows.reduce((sum, request) => sum + request.items.length, 0),
    };
  });
}

export function ProjectFinances() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState(PROJECTS[0]?.id ?? '');

  const projects = useMemo(() => buildProjectRows(), []);

  const filteredProjects = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [project.name, project.clientName, project.contractorName ?? '', project.id]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesSearch;
    });
  }, [projects, searchQuery, statusFilter]);

  const selectedProject = useMemo(() => {
    return filteredProjects.find((project) => project.id === selectedProjectId) ?? filteredProjects[0] ?? projects[0] ?? null;
  }, [filteredProjects, projects, selectedProjectId]);

  const summary = useMemo(() => {
    const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
    const totalRevenue = projects.reduce((sum, project) => sum + project.totalRevenue, 0);
    const totalUtility = projects.reduce((sum, project) => sum + project.utility, 0);
    const active = projects.filter((project) => project.status !== 'delivered').length;
    const delayed = projects.filter((project) => project.overdue).length;
    return {
      totalBudget,
      totalRevenue,
      totalUtility,
      active,
      delayed,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(214,168,90,0.18),rgba(255,255,255,0.94))] p-5 shadow-sm dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(24,24,24,0.96))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Estado de proyecto</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Control visual de avance, rentabilidad y entregas</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Selecciona un proyecto para revisar su progreso, su salud financiera y el estado de documentos, pedidos y solicitudes vinculadas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:grid-cols-2">
            <StatCard icon={<Layers3 className="h-4 w-4" />} label="Proyectos activos" value={String(summary.active)} tone="amber" />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Utilidad total" value={currency(summary.totalUtility)} tone="emerald" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Presupuesto total"
          value={currency(summary.totalBudget)}
          helper="Suma global de todos los proyectos"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Ingresos reconocidos"
          value={currency(summary.totalRevenue)}
          helper="Facturación y avances ya reflejados"
        />
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Proyectos retrasados"
          value={String(summary.delayed)}
          helper="Fecha estimada vencida y no entregado"
        />
        <MetricCard
          icon={<PackageSearch className="h-4 w-4" />}
          label="Solicitudes de material"
          value={String(MATERIAL_REQUESTS.length)}
          helper="Pedidos vinculados al flujo operativo"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <Card className="overflow-hidden border-border/70">
          <div className="border-b border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">Proyectos</p>
                <p className="text-xs text-muted-foreground">
                  {filteredProjects.length} resultado{filteredProjects.length === 1 ? '' : 's'} de {projects.length}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar proyecto, cliente o contratista..."
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['all', 'quotation', 'production', 'delivered'] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={statusFilter === status ? 'default' : 'outline'}
                      onClick={() => setStatusFilter(status)}
                      className="gap-2"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {status === 'all' ? 'Todos' : STATUS_META[status].label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/70">
            {filteredProjects.map((project) => {
              const tone = getStatusTone(project.utilityPercentage);
              const isSelected = project.id === selectedProject?.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left transition ${isSelected ? 'bg-[#eab676]/10' : 'hover:bg-muted/40'}`}
                >
                  <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{project.clientName}</Badge>
                        <Badge variant="outline" className={STATUS_META[project.status].className}>
                          {STATUS_META[project.status].label}
                        </Badge>
                        {project.overdue ? <Badge className="bg-rose-100 text-rose-800 border-rose-200">Atrasado</Badge> : null}
                      </div>

                      <h3 className="mt-3 truncate text-lg font-semibold">{project.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {project.contractorName ?? 'Sin contratista asignado'} · {project.deliveryLabel}
                      </p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Avance general</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#eab676]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Rentabilidad</p>
                          <p className="mt-1 text-xl font-bold" style={{ color: project.utility > 0 ? '#10b981' : '#ef4444' }}>
                            {currency(project.utility)}
                          </p>
                        </div>
                        <Badge className={tone.className}>{tone.label}</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <MiniStat label="Presupuesto" value={currency(project.budget)} />
                        <MiniStat label="Ingresos" value={currency(project.totalRevenue)} />
                        <MiniStat label="Cotización" value={currency(project.quotationAmount)} />
                        <MiniStat label="Facturas" value={project.invoiceLabel ?? 'Sin factura'} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredProjects.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No hay proyectos que coincidan con el filtro actual.
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          {selectedProject ? (
            <Card className="overflow-hidden border-border/70">
              <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(255,255,255,0.92))] p-5 dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(28,28,28,0.94))]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6b2f]">Proyecto seleccionado</p>
                    <h3 className="mt-2 text-2xl font-bold">{selectedProject.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedProject.clientName} · {selectedProject.contractorName ?? 'Sin contratista'}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_META[selectedProject.status].className}>
                    {STATUS_META[selectedProject.status].label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Avance total</span>
                    <span className="text-muted-foreground">{selectedProject.progress}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[#eab676]" style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DetailPill label="Presupuesto" value={currency(selectedProject.budget)} />
                  <DetailPill label="Ingresos" value={currency(selectedProject.totalRevenue)} />
                  <DetailPill label="Utilidad" value={currency(selectedProject.utility)} />
                  <DetailPill label="% Utilidad" value={`${selectedProject.utilityPercentage.toFixed(2)}%`} />
                </div>

                <Tabs defaultValue="financial" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="financial">Finanzas</TabsTrigger>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                    <TabsTrigger value="activity">Actividad</TabsTrigger>
                  </TabsList>

                  <TabsContent value="financial" className="mt-4 space-y-3">
                    <MetricLine label="Cotización" value={selectedProject.quotationAmount ? currency(selectedProject.quotationAmount) : 'Sin monto'} />
                    <MetricLine label="Facturación" value={selectedProject.invoiceLabel ? `${selectedProject.invoiceLabel} · ${selectedProject.invoiceStatus}` : 'Sin factura'} />
                    <MetricLine label="Solicitudes" value={`${selectedProject.requestCount} solicitudes · ${selectedProject.requestItems} líneas`} />
                    <MetricLine label="Pedidos de producción" value={`${selectedProject.orderCount} orden${selectedProject.orderCount === 1 ? '' : 'es'}`} />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4 space-y-3">
                    <TimelineRow
                      title="Cotización"
                      description={selectedProject.quotationLabel}
                      done={selectedProject.quotationLabel !== 'Sin cotización'}
                    />
                    <TimelineRow
                      title="Orden de producción"
                      description={selectedProject.orderCount > 0 ? `${selectedProject.orderCount} orden${selectedProject.orderCount === 1 ? '' : 'es'} vinculada${selectedProject.orderCount === 1 ? '' : 's'}` : 'Sin orden vinculada'}
                      done={selectedProject.orderCount > 0}
                    />
                    <TimelineRow
                      title="Factura"
                      description={selectedProject.invoiceLabel ? `${selectedProject.invoiceLabel} · ${selectedProject.invoiceStatus}` : 'Pendiente de factura'}
                      done={Boolean(selectedProject.invoiceLabel)}
                    />
                    <TimelineRow
                      title="Entrega"
                      description={selectedProject.status === 'delivered' ? 'Proyecto entregado' : selectedProject.overdue ? 'Fecha vencida' : 'En proceso'}
                      done={selectedProject.status === 'delivered'}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4 space-y-3">
                    <MetricLine label="Rango de ejecución" value={selectedProject.deliveryLabel} />
                    <MetricLine label="Última referencia" value={`${selectedProject.requestCount} solicitud${selectedProject.requestCount === 1 ? '' : 'es'} de material`} />
                    <MetricLine label="Riesgo operativo" value={selectedProject.overdue ? 'Alto por atraso' : 'Controlado'} />
                  </TabsContent>
                </Tabs>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estado económico</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Margen" value={`${selectedProject.utilityPercentage.toFixed(2)}%`} />
                    <MiniStat label="Materiales" value={currency(Math.max(selectedProject.budget * 0.4, 0))} />
                    <MiniStat label="Mano de obra" value={currency(Math.max(selectedProject.budget * 0.33, 0))} />
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="border-border/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Resumen de flujo</p>
                <p className="text-xs text-muted-foreground">Datos vinculados a pedidos, facturas y solicitudes</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="mt-4 space-y-3">
              {projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 text-left transition hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{project.clientName}</p>
                  </div>
                  <Badge variant="outline" className={STATUS_META[project.status].className}>
                    {STATUS_META[project.status].label}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'amber' | 'emerald' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <Card className={`border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card className="border-border/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="max-w-[65%] text-right text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function TimelineRow({ title, description, done }: { title: string; description: string; done: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-4">
      <div className={`mt-1 h-3 w-3 rounded-full ${done ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
