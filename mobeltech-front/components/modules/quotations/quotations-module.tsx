'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { es } from 'date-fns/locale';
import { useRole } from '@/hooks/use-role-context';
import { Quotation, QuotationItem, QuotationAudit, QuotationEnvironmentProject } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Calendar as DateRangeCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
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
  Upload,
  ArrowUpDown,
  RefreshCw,
  FolderPlus,
  Layers3,
  CalendarRange,
  Pencil,
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
  environmentProjects?: QuotationEnvironmentProject[];
  prequotation?: {
    id: string;
    title: string;
    uid?: string | null;
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
  return `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function parseLocalDate(value?: string | null) {
  if (!value) return undefined;
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number.parseInt(yearRaw ?? '', 10);
  const month = Number.parseInt(monthRaw ?? '', 10);
  const day = Number.parseInt(dayRaw ?? '', 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return undefined;
  return new Date(year, month - 1, day);
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isUuid(value: string | null | undefined) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? '');
}

function formatDisplayDate(value?: string | null) {
  const date = parseLocalDate(value);
  if (!date) return 'dd/mm/yyyy';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getEnvironmentPrice(environment: QuotationEnvironmentProject) {
  return Number(environment.clientPrice ?? environment.price ?? 0);
}

function normalizeQuotationRecord(raw: any): ApiQuotation {
  return {
    ...raw,
    createdDate: new Date(raw.createdDate),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
    totalAmount: Number(raw.totalAmount ?? 0),
    advanceAmount: Number(raw.advanceAmount ?? 0),
    items: (raw.items ?? []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    })),
    assignedContractors: raw.assignedContractors ?? [],
    environmentProjects: (raw.environmentProjects ?? []).map((environment: any) => ({
      ...environment,
      price: Number(environment.price ?? 0),
      clientPrice: Number(environment.clientPrice ?? environment.price ?? 0),
    })),
    auditLogs: (raw.auditLogs ?? []).map((log: any) => ({
      ...log,
      changedAt: new Date(log.changedAt),
    })),
  };
}

export function QuotationsModule() {
  const router = useRouter();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const [data, setData] = useState<ApiQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [selected, setSelected] = useState<ApiQuotation | null>(null);

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
      const nextData = json.map(normalizeQuotationRecord);
      const quotationId =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quotationId') : null;
      setData(nextData);
      setSelected((current) => {
        if (quotationId) return nextData.find((quotation: ApiQuotation) => quotation.id === quotationId) ?? current;
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
    advanceAmount?: number;
  }) {
    if (!apiBase) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('No se pudieron guardar los cambios de la cotización');
      const updated = normalizeQuotationRecord(await response.json());
      setData((prev) => prev.map((quotation) => (quotation.id === id ? updated : quotation)));
      setSelected(updated);
      await loadQuotations();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cotización');
    } finally {
      setSaving(false);
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
        (q.uid ?? '').toLowerCase().includes(term) ||
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

  if (selected) {
    return (
      <div className="p-6">
        <QuotationDetail
          quotation={selected}
          apiBase={apiBase}
          clientName={selected.clientName ?? undefined}
          projectName={undefined}
          contractors={selected.assignedContractors ?? []}
          prequotationTitle={selected.prequotation?.title}
          onBack={() => setSelected(null)}
          onReplaceQuotation={(updated) => {
            setData((current) => current.map((quotation) => quotation.id === updated.id ? updated : quotation));
            setSelected(updated);
          }}
          onSave={(payload) => saveQuotationChanges(selected.id, payload)}
          saving={saving}
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
          <div className="md:col-span-4 relative">
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
          <div className="md:col-span-2 relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full h-10 rounded-md border border-input bg-background pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
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
            const quotationCode = q.uid ?? prequotation?.uid ?? q.id;
            const quotationHeadline = prequotation?.title ?? q.items[0]?.description ?? `Cotización ${quotationCode}`;
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
                        {quotationHeadline}{' '}
                        <span className="text-muted-foreground font-normal">·</span>{' '}
                        <span className="font-mono text-xs text-muted-foreground">#{quotationCode}</span>
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
                      Cliente: {client?.name ?? '—'} · {q.items.map((i) => `${i.quantity}× ${i.description}`).join(' · ')}
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
  apiBase: string;
  clientName?: string;
  projectName?: string;
  contractors: { id: string; name: string; specialization: string; phone: string }[];
  prequotationTitle?: string;
  onBack: () => void;
  onReplaceQuotation: (quotation: ApiQuotation) => void;
  onSave: (payload: { items?: QuotationItem[]; totalAmount?: number; advanceAmount?: number; status?: QuotationStatus }) => void;
  saving: boolean;
}

function QuotationDetail({
  quotation,
  apiBase,
  clientName,
  projectName,
  contractors,
  prequotationTitle,
  onBack,
  onReplaceQuotation,
  onSave,
  saving,
}: DetailProps) {
  const { toast } = useToast();
  const { currentRole, userName } = useRole();
  const normalizedRole = String(currentRole).toLowerCase();
  const canManageEnvironmentProjects = ['admin', 'architect', 'gerente', 'gerencia', 'manager'].includes(normalizedRole);

  const currentQuotation = quotation;
  const canCreateEnvironmentProjects = canManageEnvironmentProjects;
  const cfg = STATUS_CONFIG[currentQuotation.status];
  const subtotal = currentQuotation.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
  const quotationCode = currentQuotation.uid ?? currentQuotation.prequotation?.uid ?? currentQuotation.id;
  const quotationHeadline = prequotationTitle ?? currentQuotation.items[0]?.description ?? `Cotización #${quotationCode}`;

  const [editing, setEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<QuotationItem[]>(() =>
    currentQuotation.items.map((it) => ({ ...it } as QuotationItem)),
  );
  const [editableTotal, setEditableTotal] = useState<number>(currentQuotation.totalAmount || subtotal);
  const [editableAdvance, setEditableAdvance] = useState<number>(currentQuotation.advanceAmount || 0);
  const editableItemsSubtotal = useMemo(
    () => editableItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [editableItems],
  );
  const displayTotal = currentQuotation.totalAmount || editableTotal || subtotal;
  const displayAdvance = currentQuotation.advanceAmount || editableAdvance || 0;
  const pendingBalance = Math.max(displayTotal - displayAdvance, 0);
  const environmentTotal = (currentQuotation.environmentProjects ?? []).reduce((sum, environment) => sum + getEnvironmentPrice(environment), 0);
  const environmentRemaining = Math.max(displayTotal - environmentTotal, 0);
  const [showEnvironmentBuilder, setShowEnvironmentBuilder] = useState(false);
  const [environmentSaving, setEnvironmentSaving] = useState(false);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [editingEnvironment, setEditingEnvironment] = useState<QuotationEnvironmentProject | null>(null);
  const [environmentEditForm, setEnvironmentEditForm] = useState({
    ambience: '',
    description: '',
    price: '',
    estimatedStartDate: '',
    estimatedEndDate: '',
    assignedContractorId: '',
    modificationNote: '',
  });
  const [contractorOptions, setContractorOptions] = useState<QuotationContractor[]>([]);
  const [environmentRows, setEnvironmentRows] = useState<Array<{
    key: string;
    ambience: string;
    description: string;
    price: string;
    estimatedStartDate: string;
    estimatedEndDate: string;
    assignedContractorId: string;
    sketchupFileName: string;
    sketchupFileUrl: string;
    sketchupFileSize: string;
    sketchupFileData: string;
  }>>([
    {
      key: 'env-1',
      ambience: '',
      description: '',
      price: '',
      estimatedStartDate: '',
      estimatedEndDate: '',
      assignedContractorId: '',
      sketchupFileName: '',
      sketchupFileUrl: '',
      sketchupFileSize: '',
      sketchupFileData: '',
    },
  ]);
  const environmentDraftTotal = environmentRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
  const environmentProjectedTotal = environmentTotal + environmentDraftTotal;
  const environmentDraftExceeds = environmentProjectedTotal > displayTotal;

  useEffect(() => {
    setEditableItems(currentQuotation.items.map((it: any) => ({ ...it })));
    setEditableTotal(currentQuotation.totalAmount || subtotal);
    setEditableAdvance(currentQuotation.advanceAmount || 0);
  }, [currentQuotation]);

  useEffect(() => {
    if (editing) setEditableTotal(editableItemsSubtotal);
  }, [editableItemsSubtotal, editing]);

  useEffect(() => {
    if (!apiBase || !canManageEnvironmentProjects) return;
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
        if (!response.ok) return;
        setContractorOptions(await response.json());
      } catch {}
    })();
  }, [apiBase, canManageEnvironmentProjects]);

  function addEnvironmentRow() {
    setEnvironmentRows((current) => [
      ...current,
      {
        key: `env-${Date.now()}-${current.length}`,
        ambience: '',
        description: '',
        price: '',
        estimatedStartDate: '',
        estimatedEndDate: '',
        assignedContractorId: '',
        sketchupFileName: '',
        sketchupFileUrl: '',
        sketchupFileSize: '',
        sketchupFileData: '',
      },
    ]);
  }

  function showEnvironmentBudgetToast(projectedTotal: number) {
    const exceededBy = projectedTotal - displayTotal;
    toast({
      title: 'Monto excedido',
      description: `Los ambientes suman ${formatCurrency(projectedTotal)} y exceden la cotización por ${formatCurrency(exceededBy)}.`,
      variant: 'destructive',
    });
  }

  function openEnvironmentEditor(environment: QuotationEnvironmentProject) {
    setEditingEnvironment(environment);
    setEnvironmentError(null);
    setEnvironmentEditForm({
      ambience: environment.ambience,
      description: environment.description ?? '',
      price: String(getEnvironmentPrice(environment)),
      estimatedStartDate: environment.estimatedStartDate,
      estimatedEndDate: environment.estimatedEndDate,
      assignedContractorId: environment.assignedContractorId ?? '',
      modificationNote: '',
    });
  }

  async function saveEnvironmentEdit() {
    if (!editingEnvironment) return;

    const nextPrice = Number(environmentEditForm.price);
    const projectedTotal = environmentTotal - getEnvironmentPrice(editingEnvironment) + nextPrice;

    if (
      !environmentEditForm.ambience.trim() ||
      !Number.isFinite(nextPrice) ||
      nextPrice < 0 ||
      !environmentEditForm.estimatedStartDate ||
      !environmentEditForm.estimatedEndDate ||
      new Date(environmentEditForm.estimatedEndDate).getTime() < new Date(environmentEditForm.estimatedStartDate).getTime()
    ) {
      setEnvironmentError('Completa ambiente, precio al cliente y rango de fechas válido.');
      return;
    }

    if (!environmentEditForm.modificationNote.trim()) {
      setEnvironmentError('Agrega una nota breve explicando qué se modificó.');
      return;
    }

    if (projectedTotal > displayTotal) {
      showEnvironmentBudgetToast(projectedTotal);
      setEnvironmentError(`La suma de ambientes excede la cotización por ${formatCurrency(projectedTotal - displayTotal)}.`);
      return;
    }

    setEnvironmentSaving(true);
    setEnvironmentError(null);

    try {
      const response = await fetch(`${apiBase}/api/quotations/${quotation.id}/environment-projects/${editingEnvironment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambience: environmentEditForm.ambience.trim(),
          description: environmentEditForm.description.trim() || null,
          price: nextPrice,
          clientPrice: nextPrice,
          estimatedStartDate: environmentEditForm.estimatedStartDate,
          estimatedEndDate: environmentEditForm.estimatedEndDate,
          assignedContractorId: isUuid(environmentEditForm.assignedContractorId) ? environmentEditForm.assignedContractorId : null,
          modificationNote: environmentEditForm.modificationNote.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'No se pudo actualizar el ambiente.');
      }

      const updatedQuotation = normalizeQuotationRecord(await response.json());
      setEditingEnvironment(null);
      onReplaceQuotation(updatedQuotation);
      toast({
        title: 'Ambiente actualizado',
        description: 'El proyecto por ambiente y sus montos quedaron sincronizados.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el ambiente.';
      setEnvironmentError(message);
      toast({ title: 'Error al actualizar', description: message, variant: 'destructive' });
    } finally {
      setEnvironmentSaving(false);
    }
  }

  async function saveEnvironmentProjects() {
    const preparedRows = environmentRows.map((row) => ({
      ambience: row.ambience.trim(),
      description: row.description.trim() || null,
      price: Number(row.price),
      clientPrice: Number(row.price),
      estimatedStartDate: row.estimatedStartDate,
      estimatedEndDate: row.estimatedEndDate,
      assignedContractorId: isUuid(row.assignedContractorId) ? row.assignedContractorId : null,
      sketchupFileName: row.sketchupFileName.trim() || null,
      sketchupFileUrl: row.sketchupFileUrl.trim() || null,
      sketchupFileSize: row.sketchupFileSize.trim() || null,
      sketchupFileData: row.sketchupFileData || null,
      uploadedBy: userName,
    }));

    const hasInvalidRow = preparedRows.some((row) => {
      if (!row.ambience || !Number.isFinite(row.price) || row.price < 0) return true;
      if (!row.estimatedStartDate || !row.estimatedEndDate) return true;
      return new Date(row.estimatedEndDate).getTime() < new Date(row.estimatedStartDate).getTime();
    });

    if (hasInvalidRow) {
      setEnvironmentError('Completa ambiente, precio al cliente y rango de fechas válido en cada fila.');
      return;
    }

    const newEnvironmentTotal = preparedRows.reduce((sum, row) => sum + row.clientPrice, 0);
    const projectedTotal = environmentTotal + newEnvironmentTotal;
    if (projectedTotal > displayTotal) {
      showEnvironmentBudgetToast(projectedTotal);
      setEnvironmentError(`La suma de ambientes excede la cotización por ${formatCurrency(projectedTotal - displayTotal)}.`);
      return;
    }

    setEnvironmentSaving(true);
    setEnvironmentError(null);

    try {
      const response = await fetch(`${apiBase}/api/quotations/${quotation.id}/environment-projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: preparedRows }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const details =
          body?.details && typeof body.details === 'object'
            ? Object.entries(body.details)
                .flatMap(([field, messages]) =>
                  Array.isArray(messages)
                    ? messages.filter(Boolean).map((message) => `${field}: ${String(message)}`)
                    : [],
                )
                .join(' | ')
            : '';
        throw new Error(details || body?.error || 'No se pudieron crear los proyectos por ambiente.');
      }

      const updatedQuotation = normalizeQuotationRecord(await response.json());
      setEnvironmentRows([
        {
          key: 'env-1',
          ambience: '',
          description: '',
          price: '',
          estimatedStartDate: '',
          estimatedEndDate: '',
          assignedContractorId: '',
          sketchupFileName: '',
          sketchupFileUrl: '',
          sketchupFileSize: '',
          sketchupFileData: '',
        },
      ]);
      setShowEnvironmentBuilder(false);
      onReplaceQuotation(updatedQuotation);
      toast({
        title: 'Proyectos creados',
        description: `Se asignaron ${formatCurrency(newEnvironmentTotal)} de la cotización por ambientes.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron crear los proyectos por ambiente.';
      setEnvironmentError(message);
      toast({ title: 'Error al crear ambientes', description: message, variant: 'destructive' });
    } finally {
      setEnvironmentSaving(false);
    }
  }

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
            <h1 className="text-xl font-bold truncate">{quotationHeadline}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cliente: {clientName ?? 'Cliente'} · Cotización #{quotationCode} · Creada el {formatDate(quotation.createdDate)}
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
                              totalAmount: editableItemsSubtotal,
                              advanceAmount: editableAdvance,
                            });
                            setEditing(false);
                          }}
                        >
                          {saving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditableItems(currentQuotation.items.map((it: any) => ({ ...it })));
                          setEditableTotal(currentQuotation.totalAmount || subtotal);
                          setEditableAdvance(currentQuotation.advanceAmount || 0);
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
                      {formatCurrency(editing ? editableItemsSubtotal : currentQuotation.totalAmount || editableTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Proyectos Por Ambiente
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Divide esta cotización en ambientes independientes con fechas y contratista responsable.
                </p>
              </div>
              {canCreateEnvironmentProjects && (
                <Button
                  size="sm"
                  className="gap-1.5 self-start"
                  onClick={() => setShowEnvironmentBuilder(true)}
                  style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Crear proyectos por ambiente
                </Button>
              )}
            </div>

            <div className={`grid gap-3 sm:grid-cols-3 ${environmentTotal > displayTotal ? 'text-red-700' : ''}`}>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Monto cotizado</p>
                <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(displayTotal)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Asignado a ambientes</p>
                <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(environmentTotal)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Disponible</p>
                <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(environmentRemaining)}</p>
              </div>
            </div>

            {currentQuotation.environmentProjects && currentQuotation.environmentProjects.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted/35">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ambiente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Contratista</th>
                      <th className="w-44 px-4 py-3 text-left text-xs font-semibold text-muted-foreground">SketchUp</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Precio al cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Inicio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Fin</th>
                      {canManageEnvironmentProjects && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuotation.environmentProjects.map((environment) => (
                      <tr key={environment.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{environment.ambience}</td>
                        <td className="px-4 py-3 text-muted-foreground">{environment.description || '—'}</td>
                        <td className="px-4 py-3">{environment.contractorName || 'Sin asignar'}</td>
                        <td className="max-w-44 px-4 py-3 text-muted-foreground">
                          {environment.sketchupFileName ? (
                            environment.sketchupFileUrl ? (
                              <a className="block truncate font-medium text-[#b87932] hover:underline" href={environment.sketchupFileUrl} target="_blank" rel="noreferrer" title={environment.sketchupFileName}>
                                {environment.sketchupFileName}
                              </a>
                            ) : (
                              <span className="block truncate" title={environment.sketchupFileName}>{environment.sketchupFileName}</span>
                            )
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(environment.clientPrice ?? environment.price)}</td>
                        <td className="px-4 py-3">{environment.estimatedStartDate}</td>
                        <td className="px-4 py-3">{environment.estimatedEndDate}</td>
                        {canManageEnvironmentProjects && (
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openEnvironmentEditor(environment)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                Aún no hay ambientes creados para esta cotización.
              </div>
            )}
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
                label="Referencia"
                value={quotationHeadline}
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
                    <p className="text-xs text-muted-foreground">Total calculado</p>
                    <p className="mt-0.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono font-semibold">
                      {formatCurrency(editableItemsSubtotal)}
                    </p>
                  </div>
                </div>
              ) : (
                <SummaryRow
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  label="Total"
                  value={formatCurrency(displayTotal)}
                  mono
                />
              )}
              {currentRole === 'admin' && editing ? (
                <div className="flex items-start gap-2.5">
                  <span className="text-muted-foreground mt-0.5">
                    <Layers3 className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Anticipo</p>
                    <Input
                      type="number"
                      value={String(editableAdvance)}
                      onChange={(e) => setEditableAdvance(Number(e.target.value || 0))}
                      className="text-sm font-medium mt-0.5 w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <Layers3 className="h-3.5 w-3.5" />
                      <p className="text-xs font-medium">Anticipo pagado</p>
                    </div>
                    <p className="mt-1 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      {formatCurrency(displayAdvance)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/25">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <DollarSign className="h-3.5 w-3.5" />
                      <p className="text-xs font-medium">Saldo pendiente</p>
                    </div>
                    <p className="mt-1 font-mono text-sm font-bold text-amber-800 dark:text-amber-200">
                      {formatCurrency(pendingBalance)}
                    </p>
                  </div>
                </div>
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

      {editingEnvironment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Editar ambiente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Actualiza el contenido del proyecto y deja una nota clara del cambio.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditingEnvironment(null)} disabled={environmentSaving}>
                Cerrar
              </Button>
            </div>

            {environmentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {environmentError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Ambiente</p>
                <Input
                  value={environmentEditForm.ambience}
                  onChange={(e) => setEnvironmentEditForm((current) => ({ ...current, ambience: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Precio al cliente</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={environmentEditForm.price}
                  onChange={(e) => setEnvironmentEditForm((current) => ({ ...current, price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Descripción / contenido</p>
                <Textarea
                  rows={4}
                  value={environmentEditForm.description}
                  onChange={(e) => setEnvironmentEditForm((current) => ({ ...current, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Contratista</p>
                <select
                  value={environmentEditForm.assignedContractorId}
                  onChange={(e) => setEnvironmentEditForm((current) => ({ ...current, assignedContractorId: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {contractorOptions.filter((contractor) => isUuid(contractor.id)).map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 text-left"
                  >
                    <div className="grid flex-1 grid-cols-2 gap-3">
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha inicio</span>
                        <span className="block truncate text-xs font-medium">{formatDisplayDate(environmentEditForm.estimatedStartDate)}</span>
                      </span>
                      <span className="min-w-0 border-l border-border pl-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha fin</span>
                        <span className="block truncate text-xs font-medium">{formatDisplayDate(environmentEditForm.estimatedEndDate)}</span>
                      </span>
                    </div>
                    <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <DateRangeCalendar
                    mode="range"
                    locale={es}
                    numberOfMonths={1}
                    selected={{
                      from: parseLocalDate(environmentEditForm.estimatedStartDate),
                      to: parseLocalDate(environmentEditForm.estimatedEndDate),
                    }}
                    onSelect={(range) => {
                      setEnvironmentEditForm((current) => ({
                        ...current,
                        estimatedStartDate: range?.from ? toLocalDateString(range.from) : '',
                        estimatedEndDate: range?.to ? toLocalDateString(range.to) : '',
                      }));
                    }}
                  />
                </PopoverContent>
              </Popover>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Nota de modificación *</p>
                <Textarea
                  rows={3}
                  placeholder="Ej: Se cambió melamina por MDF y se ajustó el precio por herrajes adicionales."
                  value={environmentEditForm.modificationNote}
                  onChange={(e) => setEnvironmentEditForm((current) => ({ ...current, modificationNote: e.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cotización</p>
                  <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(displayTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nuevo total ambientes</p>
                  <p className="mt-1 font-mono text-sm font-bold">
                    {formatCurrency(environmentTotal - getEnvironmentPrice(editingEnvironment) + Number(environmentEditForm.price || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Disponible</p>
                  <p className="mt-1 font-mono text-sm font-bold">
                    {formatCurrency(Math.max(displayTotal - (environmentTotal - getEnvironmentPrice(editingEnvironment) + Number(environmentEditForm.price || 0)), 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEnvironment(null)} disabled={environmentSaving}>
                Cancelar
              </Button>
              <Button onClick={saveEnvironmentEdit} disabled={environmentSaving} style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                {environmentSaving ? 'Guardando...' : 'Guardar ambiente'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showEnvironmentBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-6xl max-h-[88vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Crear proyectos por ambiente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Registra ambientes, precio al cliente, rango de fechas y contratista para esta cotización.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEnvironmentBuilder(false)} disabled={environmentSaving}>
                Cerrar
              </Button>
            </div>

            {environmentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {environmentError}
              </div>
            )}

            <div className={`rounded-xl border px-4 py-3 ${environmentDraftExceeds ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-muted/20'}`}>
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cotización</p>
                  <p className="font-mono font-bold">{formatCurrency(displayTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ya asignado</p>
                  <p className="font-mono font-bold">{formatCurrency(environmentTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nuevos ambientes</p>
                  <p className="font-mono font-bold">{formatCurrency(environmentDraftTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{environmentDraftExceeds ? 'Excedente' : 'Disponible'}</p>
                  <p className="font-mono font-bold">
                    {formatCurrency(environmentDraftExceeds ? environmentProjectedTotal - displayTotal : displayTotal - environmentProjectedTotal)}
                  </p>
                </div>
              </div>
              {environmentDraftExceeds && (
                <p className="mt-2 text-xs font-medium">
                  La suma de ambientes no puede superar el monto cotizado.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {environmentRows.map((row) => (
                <div key={row.key} className="grid gap-3 rounded-2xl border border-border bg-muted/15 p-4 lg:grid-cols-[minmax(120px,1fr)_minmax(150px,1.2fr)_minmax(150px,1fr)_minmax(150px,150px)_minmax(130px,0.8fr)_minmax(240px,1.4fr)_auto]">
                  <Input
                    placeholder="Ambiente"
                    value={row.ambience}
                    onChange={(e) => setEnvironmentRows((current) => current.map((item) => item.key === row.key ? { ...item, ambience: e.target.value } : item))}
                  />
                  <Input
                    placeholder="Descripción"
                    value={row.description}
                    onChange={(e) => setEnvironmentRows((current) => current.map((item) => item.key === row.key ? { ...item, description: e.target.value } : item))}
                  />
                  <select
                    value={row.assignedContractorId}
                    onChange={(e) => setEnvironmentRows((current) => current.map((item) => item.key === row.key ? { ...item, assignedContractorId: e.target.value } : item))}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Asignar contratista</option>
                    {contractorOptions.filter((contractor) => isUuid(contractor.id)).map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {row.sketchupFileName || 'Archivo SketchUp'}
                    </span>
                    <input
                      type="file"
                      accept=".skp,.skb,application/octet-stream"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        const fileData = file ? await readFileAsBase64(file) : '';
                        setEnvironmentRows((current) =>
                          current.map((item) =>
                            item.key === row.key
                              ? {
                                  ...item,
                                  sketchupFileName: file?.name ?? '',
                                  sketchupFileSize: file ? formatFileSize(file.size) : '',
                                  sketchupFileUrl: '',
                                  sketchupFileData: fileData,
                                }
                              : item,
                          ),
                        );
                      }}
                    />
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio al cliente"
                    value={row.price}
                    onChange={(e) => setEnvironmentRows((current) => current.map((item) => item.key === row.key ? { ...item, price: e.target.value } : item))}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 text-left"
                      >
                        <div className="grid flex-1 grid-cols-2 gap-3">
                          <span className="min-w-0">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha inicio</span>
                            <span className="block truncate text-xs font-medium">{formatDisplayDate(row.estimatedStartDate)}</span>
                          </span>
                          <span className="min-w-0 border-l border-border pl-3">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha fin</span>
                            <span className="block truncate text-xs font-medium">{formatDisplayDate(row.estimatedEndDate)}</span>
                          </span>
                        </div>
                        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <DateRangeCalendar
                        mode="range"
                        locale={es}
                        numberOfMonths={1}
                        selected={{
                          from: parseLocalDate(row.estimatedStartDate),
                          to: parseLocalDate(row.estimatedEndDate),
                        }}
                        onSelect={(range) => {
                          setEnvironmentRows((current) =>
                            current.map((item) =>
                              item.key === row.key
                                ? {
                                    ...item,
                                    estimatedStartDate: range?.from ? toLocalDateString(range.from) : '',
                                    estimatedEndDate: range?.to ? toLocalDateString(range.to) : '',
                                  }
                                : item,
                            ),
                          );
                        }}
                        classNames={{
                          range_start: 'rounded-l-md bg-zinc-700 text-white hover:bg-zinc-700 focus:bg-zinc-700',
                          range_middle: 'rounded-none bg-zinc-200 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100',
                          range_end: 'rounded-r-md bg-zinc-700 text-white hover:bg-zinc-700 focus:bg-zinc-700',
                          day_button:
                            'data-[selected-single=true]:bg-zinc-700 data-[selected-single=true]:text-white data-[range-start=true]:bg-zinc-700 data-[range-start=true]:text-white data-[range-end=true]:bg-zinc-700 data-[range-end=true]:text-white data-[range-middle=true]:bg-zinc-200 data-[range-middle=true]:text-zinc-900 dark:data-[range-middle=true]:bg-zinc-800 dark:data-[range-middle=true]:text-zinc-100',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10"
                    onClick={() => setEnvironmentRows((current) => current.filter((item) => item.key !== row.key))}
                    disabled={environmentRows.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" className="gap-1.5" onClick={addEnvironmentRow}>
                <FolderPlus className="w-3.5 h-3.5" />
                Agregar ambiente
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEnvironmentBuilder(false)} disabled={environmentSaving}>
                  Cancelar
                </Button>
                <Button onClick={saveEnvironmentProjects} disabled={environmentSaving || environmentDraftExceeds} style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                  {environmentSaving ? 'Guardando...' : 'Crear proyectos'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
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
