 'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocalData } from '@/lib/contexts/LocalDataContext';
import { Prequotation, PrequotationStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Plus,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { PrequotationDetail } from './prequotation-detail';
import { NewPrequotationDialog } from './new-prequotation-dialog';
import { useRole } from '@/hooks/use-role-context';

const STATUS_CONFIG: Record<
  PrequotationStatus,
  { label: string; color: string; icon: React.ReactNode; dot: string }
> = {
  draft: {
    label: 'Elaboración',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    icon: <Clock className="w-3 h-3" />,
    dot: 'bg-zinc-400',
  },
  'in-review': {
    label: 'Enviado a Cliente',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: <FileText className="w-3 h-3" />,
    dot: 'bg-blue-400',
  },
  adjustment: {
    label: 'En ajuste',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <AlertCircle className="w-3 h-3" />,
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-3 h-3" />,
    dot: 'bg-emerald-400',
  },
  rejected: {
    label: 'Rechazado',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <XCircle className="w-3 h-3" />,
    dot: 'bg-red-400',
  },
};

const ALL_STATUSES: PrequotationStatus[] = ['draft', 'in-review', 'adjustment', 'confirmed', 'rejected'];
const FILTER_PREFERENCE_KEY = 'prequotations.filters';

type PrequotationFilters = {
  search: string;
  statusFilter: PrequotationStatus | 'all';
  showBillingOnly: boolean;
};

const DEFAULT_FILTERS: PrequotationFilters = {
  search: '',
  statusFilter: 'all',
  showBillingOnly: false,
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function PrequotationsModule() {
  const { currentRole } = useRole();
  const { quotations } = useLocalData();
  const [data, setData] = useState<Prequotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState<PrequotationStatus | 'all'>(DEFAULT_FILTERS.statusFilter);
  const [showBillingOnly, setShowBillingOnly] = useState(DEFAULT_FILTERS.showBillingOnly);
  const [selected, setSelected] = useState<Prequotation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [anchoredDraft, setAnchoredDraft] = useState<{ clientId: string; measurementId: string } | null>(null);
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);

  function normalizePrequotation(p: any): Prequotation {
    return {
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      uidAssignedAt: p.uidAssignedAt ? new Date(p.uidAssignedAt) : null,
      totalAmount: p.totalAmount != null ? Number(p.totalAmount) : undefined,
      advanceAmount: p.advanceAmount != null ? Number(p.advanceAmount) : undefined,
      versions: (p.versions ?? [])
        .map((v: any) => ({
          ...v,
          uploadedAt: new Date(v.uploadedAt),
        }))
        .sort((a: Prequotation['versions'][number], b: Prequotation['versions'][number]) => a.version - b.version),
      logs: (p.logs ?? []).map((l: any) => ({
        ...l,
        performedAt: new Date(l.performedAt),
      })),
    };
  }

  function getCurrentFilters(overrides?: Partial<PrequotationFilters>): PrequotationFilters {
    return {
      search,
      statusFilter,
      showBillingOnly,
      ...overrides,
    };
  }

  async function saveFilterPreference(filters: PrequotationFilters) {
    if (!apiBase) return;
    await fetch(`${apiBase}/api/preferences/${FILTER_PREFERENCE_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: filters }),
    }).catch(() => undefined);
  }

  async function loadFilterPreference() {
    if (!apiBase) return DEFAULT_FILTERS;

    try {
      const response = await fetch(`${apiBase}/api/preferences/${FILTER_PREFERENCE_KEY}`, { cache: 'no-store' });
      if (!response.ok) return DEFAULT_FILTERS;
      const json = await response.json();
      const value = json.value ?? {};
      return {
        search: typeof value.search === 'string' ? value.search : DEFAULT_FILTERS.search,
        statusFilter: ['all', ...ALL_STATUSES].includes(value.statusFilter) ? value.statusFilter : DEFAULT_FILTERS.statusFilter,
        showBillingOnly: typeof value.showBillingOnly === 'boolean' ? value.showBillingOnly : DEFAULT_FILTERS.showBillingOnly,
      } as PrequotationFilters;
    } catch {
      return DEFAULT_FILTERS;
    }
  }

  async function loadPrequotations() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/prequotations`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudieron cargar las precotizaciones');
      const json = await response.json();
      setData(json.map(normalizePrequotation));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando precotizaciones');
    } finally {
      setLoading(false);
    }
  }

  async function loadPrequotationById(prequotationId: string) {
    if (!apiBase) return false;

    try {
      const response = await fetch(`${apiBase}/api/prequotations/${prequotationId}`, { cache: 'no-store' });
      if (!response.ok) return false;

      setSelected(normalizePrequotation(await response.json()));
      return true;
    } catch {
      return false;
    }
  }

  async function openPrequotation(prequotation: Prequotation) {
    setSelected(prequotation);
    await loadPrequotationById(prequotation.id);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      void loadPrequotations();
      return;
    }

    const prequotationId = new URLSearchParams(window.location.search).get('prequotationId');

    void (async () => {
      setError(null);
      const savedFilters = await loadFilterPreference();
      setSearch(savedFilters.search);
      setStatusFilter(savedFilters.statusFilter);
      setShowBillingOnly(savedFilters.showBillingOnly);
      setFiltersReady(true);

      if (prequotationId) {
        setLoading(true);
        const loadedDetail = await loadPrequotationById(prequotationId);
        if (!loadedDetail) await loadPrequotations();
        else setLoading(false);
        return;
      }

      await loadPrequotations();
    })();
  }, []);

  useEffect(() => {
    if (!filtersReady) return;

    const nextFilters = getCurrentFilters();
    const timeout = window.setTimeout(() => {
      void saveFilterPreference(nextFilters);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, statusFilter, showBillingOnly, filtersReady]);

  async function loadClients() {
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/clients`, { cache: 'no-store' });
      if (!response.ok) return;
      const json = await response.json();
      setClients(json);
    } catch {
      // ignore client label load errors; prequotations can still render
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    if (selected || data.length === 0 || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const prequotationId = params.get('prequotationId');
    if (!prequotationId) return;

    const linkedPrequotation = data.find((prequotation) => prequotation.id === prequotationId);
    if (linkedPrequotation) setSelected(linkedPrequotation);
  }, [data, selected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const measurementId = params.get('measurementId');
    const clientId = params.get('clientId');
    if (!measurementId || !clientId) return;

    setAnchoredDraft({ clientId, measurementId });
    setShowNew(true);
  }, []);

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return data.filter((p) => {
      const clientName = clients.find((client) => client.id === p.clientId)?.name ?? '';
      const matchesSearch =
        !searchTerm ||
        [p.title, clientName, p.createdBy]
          .some((value) => String(value ?? '').toLowerCase().includes(searchTerm));
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesBilling = !showBillingOnly || !!p.billingRequested;
      return matchesSearch && matchesStatus && matchesBilling;
    });
  }, [data, search, statusFilter, showBillingOnly, clients]);

  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = data.filter((p) => p.status === s).length;
    return acc;
  }, {});
  const billingCount = data.filter((p) => !!p.billingRequested).length;

  async function handleUpdate(updated: Prequotation) {
    if (!apiBase) return;
    const response = await fetch(`${apiBase}/api/prequotations/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!response.ok) return;
    const next = normalizePrequotation(await response.json());
    setSelected(next);
    await loadPrequotations();
  }

  async function handleCreate(p: Prequotation) {
    if (!apiBase) return;
    const response = await fetch(`${apiBase}/api/prequotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || body?.message || 'No se pudo crear la precotización');
    }
    const next = normalizePrequotation(await response.json());
    setShowNew(false);
    setSelected(next);
    await loadPrequotations();
  }

  const returnToPrequotationsList = async () => {
    setSelected(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/prequotations');
    }
    await loadPrequotations();
  };

  if (selected) {
    const client = clients.find((c) => c.id === selected.clientId);
    return (
      <div className="p-6">
        <PrequotationDetail
          prequotation={selected}
          clientName={client?.name ?? 'Cliente'}
          onBack={() => {
            void returnToPrequotationsList();
          }}
          onUpdate={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && <Card className="p-3 border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Precotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona el ciclo de vida de cada precotización hasta convertirla en cotización.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por título o cliente…"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            className="max-w-xs"
          />
          {currentRole !== 'partner' ? (
            <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            statusFilter === 'all'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-foreground/40'
          }`}
        >
          Todos · {data.length}
        </button>
        <button
          onClick={() => { setShowBillingOnly((s) => !s); setStatusFilter('all'); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            showBillingOnly
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-foreground/40'
          }`}
        >
          Facturación · {billingCount}
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              statusFilter === s
                ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {STATUS_CONFIG[s].label} · {statusCounts[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <PrequotationsLoadingState /> : null}
      <div className={`space-y-3 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {filtered.map((p) => {
          const client = clients.find((c) => c.id === p.clientId);
          const cfg = STATUS_CONFIG[p.status];
          const latestVersion = p.versions[p.versions.length - 1];
          const isConverted = Boolean(p.convertedToQuotationId);
          return (
            <Card
              key={p.id}
              onClick={() => {
                void openPrequotation(p);
              }}
              className={`p-4 cursor-pointer transition-all group ${
                isConverted
                  ? 'border-dashed bg-muted/45 opacity-75 hover:opacity-90 hover:border-muted-foreground/40'
                  : 'hover:shadow-md hover:border-foreground/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* File icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted ${isConverted ? 'grayscale opacity-60' : ''}`}>
                  {latestVersion?.fileType === 'excel' ? (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold truncate ${isConverted ? 'text-muted-foreground line-through decoration-muted-foreground/70' : ''}`}>{p.title}</p>
                    {p.uid && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted text-muted-foreground">
                        UID {p.uid}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    {p.convertedToQuotationId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Convertida a cotización oficial
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 mt-1 flex-wrap ${isConverted ? 'text-muted-foreground/75' : ''}`}>
                    <span className="text-xs text-muted-foreground">{client?.name ?? '—'}</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">v{p.currentVersion}</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">{formatDate(p.updatedAt)}</span>
                    {latestVersion && (
                      <>
                        <span className="text-xs text-muted-foreground/50">·</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {latestVersion.fileName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Avatars (log participants) */}
                <div className="hidden sm:flex items-center -space-x-2 shrink-0">
                  {[...new Set(p.logs.map((l) => l.performedBy))].slice(0, 3).map((name) => (
                    <div
                      key={name}
                      title={name}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background"
                      style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                    >
                      {getInitials(name)}
                    </div>
                  ))}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Billing-only compact list */}
      {showBillingOnly && (
        <div className="mt-4">
          <h3 className="text-lg font-medium">Clientes que solicitaron factura</h3>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {filtered.map((p) => {
              const client = clients.find((c) => c.id === p.clientId)!;
              const linkedQuotation = quotations.find((q) => q.id === p.convertedToQuotationId);
              return (
                <div key={p.id} className="p-3 border rounded-md flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{p.title} — {new Date(p.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {linkedQuotation ? `$ ${linkedQuotation.totalAmount?.toFixed(2) ?? '0.00'}` : '$ —'}
                    </div>
                    <div className="text-xs text-muted-foreground">{(client as any).contact ?? ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showNew && (
        <NewPrequotationDialog
          onClose={() => {
            setShowNew(false);
            setAnchoredDraft(null);
          }}
          onCreate={handleCreate}
          initialClientId={anchoredDraft?.clientId}
          initialMeasurementId={anchoredDraft?.measurementId}
        />
      )}
    </div>
  );
}

function PrequotationsLoadingState() {
  return (
    <PageLoadingState
      title="Cargando precotizaciones"
      description="Consultando documentos, versiones e historial..."
      preview={
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-[#eab676]/20" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-[#eab676]/16" />
            </div>
          ))}
        </div>
      }
    />
  );
}
