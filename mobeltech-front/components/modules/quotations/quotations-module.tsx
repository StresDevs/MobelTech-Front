'use client';

import { useMemo, useState } from 'react';
import {
  QUOTATIONS,
  CLIENTS,
  CONTRACTORS,
  PRODUCTION_ORDERS,
  PROJECTS,
  PREQUOTATIONS,
} from '@/lib/mock-data';
import { Quotation } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

function getContractorsByQuotationId(quotationId: string) {
  const ids = new Set(
    PRODUCTION_ORDERS.filter((po) => po.quotationId === quotationId)
      .map((po) => po.assignedContractorId)
      .filter(Boolean) as string[],
  );
  return CONTRACTORS.filter((c) => ids.has(c.id));
}

function getPrequotationByQuotationId(quotationId: string) {
  return PREQUOTATIONS.find((p) => p.convertedToQuotationId === quotationId);
}

export function QuotationsModule() {
  const [data, setData] = useState<Quotation[]>(QUOTATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [selected, setSelected] = useState<Quotation | null>(null);

  const enriched = useMemo(() => {
    return data.map((q) => {
      const client = CLIENTS.find((c) => c.id === q.clientId);
      const project = PROJECTS.find((p) => p.id === q.projectId);
      const contractors = getContractorsByQuotationId(q.id);
      const prequotation = getPrequotationByQuotationId(q.id);
      const itemsText = q.items.map((i) => i.description).join(' ');
      return { q, client, project, contractors, prequotation, itemsText };
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
    setData((prev) => prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  }

  if (selected) {
    const client = CLIENTS.find((c) => c.id === selected.clientId);
    const project = PROJECTS.find((p) => p.id === selected.projectId);
    const contractors = getContractorsByQuotationId(selected.id);
    const prequotation = getPrequotationByQuotationId(selected.id);
    return (
      <div className="p-6">
        <QuotationDetail
          quotation={selected}
          clientName={client?.name}
          projectName={project?.name}
          contractors={contractors}
          prequotationTitle={prequotation?.title}
          onBack={() => setSelected(null)}
          onChangeStatus={(s) => updateStatus(selected.id, s)}
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
      </div>

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
        <p>
          Suma visible:{' '}
          <span className="font-mono font-semibold text-foreground">
            {formatCurrency(filtered.reduce((s, { q }) => s + q.totalAmount, 0))}
          </span>
        </p>
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
                      {project && (
                        <>
                          <span className="text-muted-foreground/50 text-xs">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[180px]">
                            <Hammer className="w-3 h-3" />
                            {project.name}
                          </span>
                        </>
                      )}
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
  quotation: Quotation;
  clientName?: string;
  projectName?: string;
  contractors: { id: string; name: string; specialization: string; phone: string }[];
  prequotationTitle?: string;
  onBack: () => void;
  onChangeStatus: (s: QuotationStatus) => void;
}

function QuotationDetail({
  quotation,
  clientName,
  projectName,
  contractors,
  prequotationTitle,
  onBack,
  onChangeStatus,
}: DetailProps) {
  const cfg = STATUS_CONFIG[quotation.status];
  const subtotal = quotation.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

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
              <Badge variant="outline">{quotation.items.length}</Badge>
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
                  {quotation.items.map((it) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="py-3 px-4 font-medium">{it.description}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {it.dimensions ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{it.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(it.unitPrice)}
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
                      {formatCurrency(quotation.totalAmount || subtotal)}
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
                    onClick={() => onChangeStatus(s)}
                    className={`gap-1.5 text-xs ${
                      isApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    } ${isReject ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
                  >
                    {sCfg.icon}
                    {sCfg.label}
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
              <SummaryRow
                icon={<DollarSign className="w-3.5 h-3.5" />}
                label="Total"
                value={formatCurrency(quotation.totalAmount)}
                mono
              />
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
