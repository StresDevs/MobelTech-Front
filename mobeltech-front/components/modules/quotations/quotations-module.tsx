'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/use-role-context';
import { Quotation, QuotationItem, QuotationAudit } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Search,
  Filter,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Calendar,
  User,
  HardHat,
  Package,
  DollarSign,
  FileText,
  TrendingUp,
  Hammer,
  X,
  Download,
  ArrowUpDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';

type QuotationStatus = Quotation['status'];

const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; color: string; icon: React.ReactNode; dot: string }
> = {
  draft: {
    label: 'Borrador',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    icon: <Clock className="w-3 h-3" />,
    dot: 'bg-zinc-400',
  },
  adjustment: {
    label: 'En ajuste',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <AlertCircle className="w-3 h-3" />,
    dot: 'bg-amber-400',
  },
  approved: {
    label: 'Aprobada',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-3 h-3" />,
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rechazada',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <XCircle className="w-3 h-3" />,
    dot: 'bg-red-400',
  },
};

const ALL_STATUSES: QuotationStatus[] = ['draft', 'adjustment', 'approved', 'rejected'];

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

type QuotationContractor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  status: string;
};

type ApiQuotation = Quotation & {
  clientName?: string | null;
  assignedContractors?: QuotationContractor[];
  prequotation?: {
    id: string;
    title: string;
  } | null;
  updatedAt?: Date;
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatCurrency(n: number) {
  return `Bs. ${n.toLocaleString('es-BO')}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function QuotationsModule() {
  const router = useRouter();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const [data, setData] = useState<ApiQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState<QuotationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [selected, setSelected] = useState<ApiQuotation | null>(null);

  function normalizeQuotation(raw: any): ApiQuotation {
    return {
      ...raw,
      createdDate: new Date(raw.createdDate),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
      totalAmount: Number(raw.totalAmount ?? 0),
      items: (raw.items ?? []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
      })),
      assignedContractors: raw.assignedContractors ?? [],
      auditLogs: (raw.auditLogs ?? []).map((log: any) => ({
        ...log,
        changedAt: new Date(log.changedAt),
      })),
    };
  }

  async function loadQuotations() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/quotations`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudieron cargar las cotizaciones');
      const json = await response.json();
      const nextData = json.map(normalizeQuotation);
      setData(nextData);
      setSelected((current) => {
        if (!current) return null;
        return nextData.find((quotation: ApiQuotation) => quotation.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cotizaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotations();
  }, []);

  async function saveQuotationChanges(id: string, payload: {
    status?: QuotationStatus;
    items?: QuotationItem[];
    totalAmount?: number;
  }) {
    if (!apiBase) return;

    setSaving(true);
    setStatusSaving(payload.status ?? null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('No se pudieron guardar los cambios de la cotización');
      const updated = normalizeQuotation(await response.json());
      setData((prev) => prev.map((quotation) => (quotation.id === id ? updated : quotation)));
      setSelected(updated);
      await loadQuotations();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cotización');
    } finally {
      setSaving(false);
      setStatusSaving(null);
    }
  }

  const enriched = useMemo(() => {
    return data.map((q) => {
      const itemsText = q.items.map((i) => i.description).join(' ');
      return {
        q,
        client: q.clientName ? { name: q.clientName } : null,
        project: null,
        contractors: q.assignedContractors ?? [],
        prequotation: q.prequotation ?? null,
        itemsText,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const result = enriched.filter(({ q, client, contractors, itemsText }) => {
      const matchSearch =
        !term ||
        q.id.toLowerCase().includes(term) ||
        (client?.name ?? '').toLowerCase().includes(term) ||
        contractors.some((c) => c.name.toLowerCase().includes(term)) ||
        itemsText.toLowerCase().includes(term);
      const matchStatus = statusFilter === 'all' || q.status === statusFilter;
      const d = q.createdDate.getTime();
      const matchFrom = !from || d >= from.getTime();
      const matchTo = !to || d <= to.getTime();
      return matchSearch && matchStatus && matchFrom && matchTo;
    });

    const sorted = [...result].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.q.createdDate.getTime() - b.q.createdDate.getTime();
        case 'amount-desc':
          return b.q.totalAmount - a.q.totalAmount;
        case 'amount-asc':
          return a.q.totalAmount - b.q.totalAmount;
        case 'date-desc':
        default:
          return b.q.createdDate.getTime() - a.q.createdDate.getTime();
      }
    });
    return sorted;
  }, [enriched, search, statusFilter, dateFrom, dateTo, sort]);

  const stats = useMemo(() => {
    const total = data.length;
    const approved = data.filter((q) => q.status === 'approved');
    const pending = data.filter((q) => q.status === 'draft' || q.status === 'adjustment');
    const totalAmount = data.reduce((s, q) => s + q.totalAmount, 0);
    const approvedAmount = approved.reduce((s, q) => s + q.totalAmount, 0);
    return {
      total,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: data.filter((q) => q.status === 'rejected').length,
      totalAmount,
      approvedAmount,
    };
  }, [data]);

  const hasFilters = !!(search || statusFilter !== 'all' || dateFrom || dateTo);

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  function updateStatus(id: string, newStatus: QuotationStatus) {
    void saveQuotationChanges(id, { status: newStatus });
  }

  if (selected) {
    return (
      <div className="p-6">
        <QuotationDetail
          quotation={selected}
          clientName={selected.clientName ?? undefined}
          projectName={undefined}
          contractors={selected.assignedContractors ?? []}
          prequotationTitle={selected.prequotation?.title}
          onBack={() => setSelected(null)}
          onChangeStatus={(s) => updateStatus(selected.id, s)}
          onSave={(payload) => saveQuotationChanges(selected.id, payload)}
          saving={saving}
          statusSaving={statusSaving}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageLoadingState
          title="Cargando cotizaciones"
          description="Consultando datos y sincronizando montos."
          preview={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-xl bg-[#eab676]/20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cotizaciones formales generadas a partir de precotizaciones aprobadas.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start" onClick={() => void loadQuotations()}>
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total cotizaciones"
          value={stats.total.toString()}
          icon={<ClipboardList className="w-4 h-4" />}
          accent="#eab676"
        />
        <StatCard
          label="Aprobadas"
          value={stats.approvedCount.toString()}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="#10b981"
        />
        <StatCard
          label="Pendientes"
          value={stats.pendingCount.toString()}
          icon={<Clock className="w-4 h-4" />}
          accent="#f59e0b"
        />
        <StatCard
          label="Monto aprobado"
          value={formatCurrency(stats.approvedAmount)}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="#6366f1"
          mono
        />
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mueble, cliente, contratista o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date from */}
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pl-9"
              placeholder="Desde"
            />
          </div>

          {/* Date to */}
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pl-9"
              placeholder="Hasta"
            />
          </div>

          {/* Sort */}
          <div className="md:col-span-1 relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full h-10 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              title="Ordenar"
            >
              <option value="date-desc">Más reciente</option>
              <option value="date-asc">Más antigua</option>
              <option value="amount-desc">Monto mayor</option>
              <option value="amount-asc">Monto menor</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {/* Results bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        </p>
        <p>Resumen sincronizado en tiempo real</p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Filter className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin resultados</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Prueba con otra búsqueda, fecha o estado.
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ q, client, project, contractors, prequotation }) => {
            const cfg = STATUS_CONFIG[q.status];
            const itemCount = q.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Card
                key={q.id}
                onClick={() => setSelected(q)}
                className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-foreground/20 group"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#eab67622' }}
                  >
                    <ClipboardList className="w-5 h-5" style={{ color: '#eab676' }} />
                  </div>

                  {/* Main */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">
                        {client?.name ?? 'Cliente'}{' '}
                        <span className="text-muted-foreground font-normal">·</span>{' '}
                        <span className="font-mono text-xs text-muted-foreground">{q.id}</span>
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {prequotation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          <FileText className="w-3 h-3" />
                          desde precotización
                        </span>
                      )}
                    </div>

                    {/* Items preview */}
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {q.items.map((i) => `${i.quantity}× ${i.description}`).join(' · ')}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(q.createdDate)}
                      </span>
                      <span className="text-muted-foreground/50 text-xs">·</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="w-3 h-3" />
                        {q.items.length} ítems / {itemCount} u.
                      </span>
                      {contractors.length > 0 && (
                        <>
                          <span className="text-muted-foreground/50 text-xs">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <HardHat className="w-3 h-3" />
                            {contractors.map((c) => c.name).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-mono font-bold">{formatCurrency(q.totalAmount)}</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0 mt-1" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  mono,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  mono?: boolean;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: accent + '22', color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-bold leading-tight truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </Card>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

interface DetailProps {
  quotation: ApiQuotation;
  clientName?: string;
  projectName?: string;
  contractors: { id: string; name: string; specialization: string; phone: string }[];
  prequotationTitle?: string;
  onBack: () => void;
  onChangeStatus: (s: QuotationStatus) => void;
  onSave: (payload: { items?: QuotationItem[]; totalAmount?: number; status?: QuotationStatus }) => void;
  saving: boolean;
  statusSaving: QuotationStatus | null;
}

function QuotationDetail({
  quotation,
  clientName,
  projectName,
  contractors,
  prequotationTitle,
  onBack,
  onChangeStatus,
  onSave,
  saving,
  statusSaving,
}: DetailProps) {
  const { currentRole } = useRole();

  const currentQuotation = quotation;
  const cfg = STATUS_CONFIG[currentQuotation.status];
  const subtotal = currentQuotation.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);

  const [editing, setEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<QuotationItem[]>(() =>
    currentQuotation.items.map((it) => ({ ...it } as QuotationItem)),
  );
  const [editableTotal, setEditableTotal] = useState<number>(currentQuotation.totalAmount || subtotal);

  useEffect(() => {
    setEditableItems(currentQuotation.items.map((it: any) => ({ ...it })));
    setEditableTotal(currentQuotation.totalAmount || subtotal);
  }, [currentQuotation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-0.5 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">Cotización #{quotation.id}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientName ?? 'Cliente'} · Creada el {formatDate(quotation.createdDate)}
            {projectName ? ` · ${projectName}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Ítems cotizados</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentQuotation.items.length}</Badge>
                {currentRole === 'admin' && (
                  <div className="inline-flex items-center gap-2">
                    {!editing ? (
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Editar
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          disabled={saving}
                          onClick={() => {
                            onSave({
                              items: editableItems,
                              totalAmount: editableTotal,
                            });
                            setEditing(false);
                          }}
                        >
                          {saving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditableItems(currentQuotation.items.map((it: any) => ({ ...it })));
                          setEditableTotal(currentQuotation.totalAmount || subtotal);
                          setEditing(false);
                        }}>
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                      Descripción
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                      Dimensiones
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                      Cant.
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                      P. Unit.
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems.map((it: QuotationItem) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="py-3 px-4 font-medium">{it.description}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {it.dimensions ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {editing ? (
                          <Input
                            type="number"
                            min={1}
                            value={String(it.quantity)}
                            onChange={(e) =>
                              setEditableItems((prev: QuotationItem[]) =>
                                prev.map((p: QuotationItem) => (p.id === it.id ? { ...p, quantity: Number(e.target.value || 0) } : p)),
                              )
                            }
                            className="w-20 text-right"
                          />
                        ) : (
                          it.quantity
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {editing ? (
                          <Input
                            type="number"
                            min={0}
                            value={String(it.unitPrice)}
                            onChange={(e) =>
                              setEditableItems((prev: QuotationItem[]) =>
                                prev.map((p: QuotationItem) => (p.id === it.id ? { ...p, unitPrice: Number(e.target.value || 0) } : p)),
                              )
                            }
                            className="w-28 text-right"
                          />
                        ) : (
                          formatCurrency(it.unitPrice)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={4} className="py-3 px-4 text-right text-sm font-semibold">
                      Total
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-base">
                      {formatCurrency(currentQuotation.totalAmount || editableTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Status actions */}
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Cambiar estado
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.filter((s) => s !== quotation.status).map((s) => {
                const sCfg = STATUS_CONFIG[s];
                const isApprove = s === 'approved';
                const isReject = s === 'rejected';
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={isApprove ? 'default' : 'outline'}
                    disabled={saving}
                    onClick={() => onChangeStatus(s)}
                    className={`gap-1.5 text-xs ${
                      isApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    } ${isReject ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
                  >
                    {statusSaving === s ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sCfg.icon}
                    {statusSaving === s ? 'Actualizando...' : sCfg.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen
            </p>
            <div className="space-y-3">
              <SummaryRow
                icon={<User className="w-3.5 h-3.5" />}
                label="Cliente"
                value={clientName ?? '—'}
              />
              <SummaryRow
                icon={<Hammer className="w-3.5 h-3.5" />}
                label="Proyecto"
                value={projectName ?? '—'}
              />
              <SummaryRow
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="Fecha"
                value={formatDate(quotation.createdDate)}
              />
              {currentRole === 'admin' && editing ? (
                <div className="flex items-start gap-2.5">
                  <span className="text-muted-foreground mt-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <Input
                      type="number"
                      value={String(editableTotal)}
                      onChange={(e) => setEditableTotal(Number(e.target.value || 0))}
                      className="text-sm font-medium mt-0.5 w-full"
                    />
                  </div>
                </div>
              ) : (
                <SummaryRow
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  label="Total"
                  value={formatCurrency(currentQuotation.totalAmount || editableTotal)}
                  mono
                />
              )}
              {prequotationTitle && (
                <SummaryRow
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Precotización"
                  value={prequotationTitle}
                />
              )}
            </div>
          </Card>

          {contractors.length > 0 && (
            <Card className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contratistas asignados
              </p>
              <div className="space-y-2">
                {contractors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.specialization}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {currentQuotation.auditLogs && currentQuotation.auditLogs.length > 0 && (
            <Card className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Historial de cambios
              </p>
                  <div className="space-y-2 text-sm">
                    {currentQuotation.auditLogs
                      .slice()
                      .reverse()
                      .map((a: QuotationAudit) => {
                        const changedAt = new Date(a.changedAt);

                        // friendly label and formatted values
                        let detail = '';
                        if (a.field === 'totalAmount') {
                          const prev = Number(a.previousValue || 0);
                          const next = Number(a.nextValue || 0);
                          detail = `Total: ${formatCurrency(prev)} → ${formatCurrency(next)}`;
                        } else if (a.field.startsWith('items.')) {
                          const parts = a.field.split('.');
                          const itemId = parts[1];
                          const prop = parts[2];
                          const item = currentQuotation.items.find((it) => it.id === itemId);
                          const itemName = item ? item.description : itemId;
                          if (prop === 'quantity') {
                            detail = `Cantidad — ${itemName}: ${a.previousValue} → ${a.nextValue}`;
                          } else if (prop === 'unitPrice') {
                            const prev = Number(a.previousValue || 0);
                            const next = Number(a.nextValue || 0);
                            detail = `Precio unitario — ${itemName}: ${formatCurrency(prev)} → ${formatCurrency(next)}`;
                          } else {
                            detail = `${prop} — ${itemName}: ${a.previousValue} → ${a.nextValue}`;
                          }
                        } else {
                          detail = `${a.field}: ${a.previousValue} → ${a.nextValue}`;
                        }

                        return (
                          <div key={a.id} className="text-xs">
                            <p className="font-medium flex items-center justify-between">
                              <span>{a.changedBy}</span>
                              <span className="text-muted-foreground text-[11px]">{formatDateTime(changedAt)}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                          </div>
                        );
                      })}
                  </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
