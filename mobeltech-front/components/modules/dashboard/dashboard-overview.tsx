'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  FileStack,
  FolderKanban,
  Users,
} from 'lucide-react';

type Client = {
  id: string;
  name: string;
  createdAt?: string;
};

type Project = {
  id: string;
  name: string;
  clientId: string;
  status: 'quotation' | 'production' | 'delivered';
  budget?: string | number | null;
  estimatedDeliveryDate?: string | null;
  createdAt?: string;
};

type Quotation = {
  id: string;
  clientId: string;
  status: 'draft' | 'adjustment' | 'approved' | 'rejected';
  totalAmount: number;
  createdDate?: string;
  updatedAt?: string;
  clientName?: string | null;
};

type Prequotation = {
  id: string;
  clientId: string;
  title: string;
  status: 'draft' | 'in-review' | 'adjustment' | 'confirmed' | 'rejected';
  totalAmount?: string | number | null;
  updatedAt?: string;
};

type ProductionOrder = {
  id: string;
  projectId?: string | null;
  quotationId?: string | null;
  status: 'pending' | 'in-progress' | 'delayed' | 'completed';
  estimatedDeliveryDate?: string | null;
  assignedContractorId?: string | null;
  items?: Array<{ description: string; quantity: number }>;
};

const STATUS_COLORS = {
  quotation: '#f59e0b',
  production: '#3b82f6',
  delivered: '#10b981',
} as const;

export function DashboardOverview() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [prequotations, setPrequotations] = useState<Prequotation[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);

  async function loadDashboard() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [clientsResponse, projectsResponse, quotationsResponse, prequotationsResponse, ordersResponse] = await Promise.all([
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/projects`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/prequotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/production-orders`, { cache: 'no-store' }),
      ]);

      if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes.');
      if (!projectsResponse.ok) throw new Error('No se pudieron cargar los proyectos.');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones.');
      if (!prequotationsResponse.ok) throw new Error('No se pudieron cargar las precotizaciones.');
      if (!ordersResponse.ok) throw new Error('No se pudieron cargar las ordenes de produccion.');

      const [clientsRows, projectsRows, quotationRows, prequotationRows, orderRows] = await Promise.all([
        clientsResponse.json(),
        projectsResponse.json(),
        quotationsResponse.json(),
        prequotationsResponse.json(),
        ordersResponse.json(),
      ]);

      setClients(clientsRows);
      setProjects(projectsRows);
      setQuotations(quotationRows);
      setPrequotations(prequotationRows);
      setProductionOrders(orderRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    if (!apiBase) return;
    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [apiBase]);

  const approvedQuotationsTotal = useMemo(
    () => quotations
      .filter((quotation) => quotation.status === 'approved')
      .reduce((sum, quotation) => sum + Number(quotation.totalAmount ?? 0), 0),
    [quotations],
  );

  const activeProjects = projects.filter((project) => project.status !== 'delivered');
  const openPrequotations = prequotations.filter((prequotation) => prequotation.status !== 'confirmed' && prequotation.status !== 'rejected');
  const activeOrders = productionOrders.filter((order) => order.status !== 'completed');

  const monthlyQuotations = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-BO', { month: 'short' });
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: formatter.format(date),
        total: 0,
        approved: 0,
      };
    });

    quotations.forEach((quotation) => {
      const source = quotation.updatedAt ?? quotation.createdDate;
      if (!source) return;
      const date = new Date(source);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) return;
      bucket.total += Number(quotation.totalAmount ?? 0);
      if (quotation.status === 'approved') {
        bucket.approved += Number(quotation.totalAmount ?? 0);
      }
    });

    return buckets.map(({ key, ...rest }) => rest);
  }, [quotations]);

  const projectStatusData = useMemo(() => {
    return [
      { name: 'Cotizacion', value: projects.filter((project) => project.status === 'quotation').length, color: STATUS_COLORS.quotation },
      { name: 'Produccion', value: projects.filter((project) => project.status === 'production').length, color: STATUS_COLORS.production },
      { name: 'Entregado', value: projects.filter((project) => project.status === 'delivered').length, color: STATUS_COLORS.delivered },
    ].filter((item) => item.value > 0);
  }, [projects]);

  const operationalRows = useMemo(() => {
    return activeOrders
      .map((order) => {
        const project = projects.find((entry) => entry.id === order.projectId);
        const quotation = quotations.find((entry) => entry.id === order.quotationId);
        const client = clients.find((entry) => entry.id === (project?.clientId ?? quotation?.clientId));

        return {
          id: order.id,
          title: order.items?.[0]?.description || project?.name || `Orden ${order.id.slice(0, 8)}`,
          clientName: client?.name ?? quotation?.clientName ?? 'Sin cliente',
          status: order.status,
          projectStatus: project?.status ?? null,
          estimatedDeliveryDate: order.estimatedDeliveryDate ?? project?.estimatedDeliveryDate ?? null,
          referenceAmount: Number(quotation?.totalAmount ?? 0),
        };
      })
      .sort((a, b) => {
        const dateA = a.estimatedDeliveryDate ? new Date(a.estimatedDeliveryDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.estimatedDeliveryDate ? new Date(b.estimatedDeliveryDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      })
      .slice(0, 8);
  }, [activeOrders, clients, projects, quotations]);

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando dashboard"
        description="Sincronizando clientes, proyectos, cotizaciones y produccion."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel Ejecutivo</h1>
        <p className="mt-2 text-muted-foreground">
          Vista en tiempo real construida solo con datos disponibles en la API.
        </p>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes activos"
          value={String(clients.length)}
          icon={<Users className="h-5 w-5" />}
          accent="bg-[#eab676]/15 text-[#9a6b2f]"
          helper="Clientes registrados en la base real"
        />
        <MetricCard
          label="Proyectos activos"
          value={String(activeProjects.length)}
          icon={<FolderKanban className="h-5 w-5" />}
          accent="bg-blue-500/10 text-blue-600"
          helper="Todos los proyectos no entregados"
        />
        <MetricCard
          label="Precotizaciones abiertas"
          value={String(openPrequotations.length)}
          icon={<FileStack className="h-5 w-5" />}
          accent="bg-amber-500/10 text-amber-600"
          helper="Borradores, revision y ajustes"
        />
        <MetricCard
          label="Monto aprobado"
          value={`Bs. ${approvedQuotationsTotal.toLocaleString('es-BO')}`}
          icon={<CircleDollarSign className="h-5 w-5" />}
          accent="bg-emerald-500/10 text-emerald-600"
          helper="Suma real de cotizaciones aprobadas"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Cotizaciones reales por mes</h3>
              <p className="text-sm text-muted-foreground">
                Total registrado y monto efectivamente aprobado en los ultimos 6 meses.
              </p>
            </div>
            <Badge variant="outline">{quotations.length} registros</Badge>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyQuotations}>
              <defs>
                <linearGradient id="approvedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d6a85a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d6a85a" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO')}`}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid rgba(148,163,184,0.18)',
                }}
              />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#totalFill)" strokeWidth={2} name="Total cotizado" />
              <Area type="monotone" dataKey="approved" stroke="#d6a85a" fill="url(#approvedFill)" strokeWidth={2} name="Aprobado" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {projectStatusData.length > 0 ? (
          <Card className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Proyectos por estado</h3>
                <p className="text-sm text-muted-foreground">
                  Distribucion real de proyectos registrados en el sistema.
                </p>
              </div>
              <Badge variant="outline">{projects.length} proyectos</Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {projectStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} proyecto${value === 1 ? '' : 's'}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {projectStatusData.map((item) => (
                <span key={item.name} className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {operationalRows.length > 0 ? (
        <Card className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Seguimiento operativo</h3>
              <p className="text-sm text-muted-foreground">
                Trabajos reales en curso o pendientes, ordenados por entrega estimada.
              </p>
            </div>
            <Badge variant="outline">
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              {activeOrders.length} activos
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Trabajo</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Produccion</th>
                  <th className="px-4 py-3 font-medium">Proyecto</th>
                  <th className="px-4 py-3 font-medium">Entrega estimada</th>
                  <th className="px-4 py-3 text-right font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {operationalRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.status} type="production" />
                    </td>
                    <td className="px-4 py-3">
                      {row.projectStatus ? <StatusBadge value={row.projectStatus} type="project" /> : <span className="text-muted-foreground">Sin proyecto</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.estimatedDeliveryDate ? new Date(row.estimatedDeliveryDate).toLocaleDateString('es-BO') : 'Sin fecha'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.referenceAmount > 0 ? `Bs. ${row.referenceAmount.toLocaleString('es-BO')}` : 'Sin monto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {!error && clients.length === 0 && projects.length === 0 && quotations.length === 0 && prequotations.length === 0 && productionOrders.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-muted-foreground">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 opacity-60" />
          <p className="text-base font-medium">Todavia no hay datos operativos suficientes para el dashboard.</p>
          <p className="mt-1 text-sm">En cuanto se registren clientes, cotizaciones, proyectos o produccion, apareceran aqui en tiempo real.</p>
        </Card>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
  helper,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  helper: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({
  value,
  type,
}: {
  value: string;
  type: 'production' | 'project';
}) {
  const meta = type === 'production'
    ? {
        pending: 'bg-slate-100 text-slate-700',
        'in-progress': 'bg-blue-100 text-blue-700',
        delayed: 'bg-rose-100 text-rose-700',
        completed: 'bg-emerald-100 text-emerald-700',
      }
    : {
        quotation: 'bg-amber-100 text-amber-700',
        production: 'bg-blue-100 text-blue-700',
        delivered: 'bg-emerald-100 text-emerald-700',
      };

  const labels: Record<string, string> = {
    pending: 'Pendiente',
    'in-progress': 'En progreso',
    delayed: 'Con retraso',
    completed: 'Completado',
    quotation: 'Cotizacion',
    production: 'Produccion',
    delivered: 'Entregado',
  };

  return <Badge className={meta[value as keyof typeof meta] ?? 'bg-muted text-foreground'}>{labels[value] ?? value}</Badge>;
}
