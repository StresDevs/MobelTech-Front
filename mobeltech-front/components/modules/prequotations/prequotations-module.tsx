'use client';

import { useState } from 'react';
import { PREQUOTATIONS, CLIENTS } from '@/lib/mock-data';
import { Prequotation, PrequotationStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Search,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PrequotationDetail } from './prequotation-detail';
import { NewPrequotationDialog } from './new-prequotation-dialog';

const STATUS_CONFIG: Record<
  PrequotationStatus,
  { label: string; color: string; icon: React.ReactNode; dot: string }
> = {
  draft: {
    label: 'Borrador',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    icon: <Clock className="w-3 h-3" />,
    dot: 'bg-zinc-400',
  },
  'in-review': {
    label: 'En revisión',
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

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function PrequotationsModule() {
  const [data, setData] = useState<Prequotation[]>(PREQUOTATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrequotationStatus | 'all'>('all');
  const [selected, setSelected] = useState<Prequotation | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = data.filter((p) => {
    const client = CLIENTS.find((c) => c.id === p.clientId);
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (client?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = data.filter((p) => p.status === s).length;
    return acc;
  }, {});

  function handleUpdate(updated: Prequotation) {
    setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  }

  function handleCreate(p: Prequotation) {
    setData((prev) => [p, ...prev]);
    setShowNew(false);
    setSelected(p);
  }

  if (selected) {
    const client = CLIENTS.find((c) => c.id === selected.clientId);
    return (
      <div className="p-6">
        <PrequotationDetail
          prequotation={selected}
          clientName={client?.name ?? 'Cliente'}
          onBack={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Precotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona el ciclo de vida de cada precotización hasta convertirla en cotización.
          </p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="gap-2 shrink-0"
          style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
        >
          <Plus className="w-4 h-4" />
          Nueva Precotización
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
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
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                statusFilter === s
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label} · {statusCounts[s] ?? 0}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Filter className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin resultados</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Prueba con otro filtro o búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const client = CLIENTS.find((c) => c.id === p.clientId);
            const cfg = STATUS_CONFIG[p.status];
            const latestVersion = p.versions[p.versions.length - 1];
            return (
              <Card
                key={p.id}
                onClick={() => setSelected(p)}
                className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-foreground/20 group"
              >
                <div className="flex items-center gap-4">
                  {/* File icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                    {latestVersion?.fileType === 'excel' ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{p.title}</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {p.convertedToQuotationId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Cotización generada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
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
      )}

      {showNew && (
        <NewPrequotationDialog
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
