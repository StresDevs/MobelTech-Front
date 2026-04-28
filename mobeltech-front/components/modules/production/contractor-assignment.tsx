'use client';

import { useEffect, useMemo, useState } from 'react';
import { PRODUCTION_ORDERS, PROJECTS, CLIENTS, CONTRACTORS } from '@/lib/mock-data';
import { ProductionOrder, Contractor } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  HardHat,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  UserPlus,
  RefreshCw,
  Building2,
  X,
  Users,
  ChevronRight,
} from 'lucide-react';

type Status = ProductionOrder['status'];

const STATUS_CFG: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    cls: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    icon: <Clock className="w-3 h-3" />,
  },
  'in-progress': {
    label: 'En progreso',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: <RefreshCw className="w-3 h-3" />,
  },
  delayed: {
    label: 'Retrasada',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  completed: {
    label: 'Completada',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

type Filter = 'all' | 'unassigned' | 'assigned' | Status;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unassigned', label: 'Sin asignar' },
  { id: 'assigned', label: 'Asignadas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'in-progress', label: 'En progreso' },
  { id: 'delayed', label: 'Retrasadas' },
  { id: 'completed', label: 'Completadas' },
];

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ContractorAssignmentModule() {
  const [orders, setOrders] = useState<ProductionOrder[]>(PRODUCTION_ORDERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [assignTarget, setAssignTarget] = useState<ProductionOrder | null>(null);

  const enriched = useMemo(() => {
    return orders.map((o) => {
      const project = PROJECTS.find((p) => p.id === o.projectId);
      const client = CLIENTS.find((c) => c.id === project?.clientId);
      const contractor = o.assignedContractorId
        ? CONTRACTORS.find((c) => c.id === o.assignedContractorId)
        : null;
      const itemsText = o.items.map((i) => i.description).join(' ');
      return { o, project, client, contractor, itemsText };
    });
  }, [orders]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter(({ o, project, client, contractor, itemsText }) => {
      const searchMatch =
        !term ||
        o.id.toLowerCase().includes(term) ||
        (project?.name ?? '').toLowerCase().includes(term) ||
        (client?.name ?? '').toLowerCase().includes(term) ||
        (contractor?.name ?? '').toLowerCase().includes(term) ||
        itemsText.toLowerCase().includes(term);

      let filterMatch = true;
      if (filter === 'unassigned') filterMatch = !o.assignedContractorId;
      else if (filter === 'assigned') filterMatch = !!o.assignedContractorId;
      else if (filter !== 'all') filterMatch = o.status === filter;

      return searchMatch && filterMatch;
    });
  }, [enriched, search, filter]);

  const stats = useMemo(() => {
    const unassigned = orders.filter((o) => !o.assignedContractorId).length;
    const assigned = orders.length - unassigned;
    const inProgress = orders.filter((o) => o.status === 'in-progress').length;
    const delayed = orders.filter((o) => o.status === 'delayed').length;
    return { total: orders.length, unassigned, assigned, inProgress, delayed };
  }, [orders]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: orders.length,
      unassigned: orders.filter((o) => !o.assignedContractorId).length,
      assigned: orders.filter((o) => o.assignedContractorId).length,
    };
    (['pending', 'in-progress', 'delayed', 'completed'] as Status[]).forEach((s) => {
      map[s] = orders.filter((o) => o.status === s).length;
    });
    return map;
  }, [orders]);

  function assignContractor(orderId: string, contractorId: string | null) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, assignedContractorId: contractorId ?? undefined }
          : o,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asignación de Contratistas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Asigna contratistas a las órdenes de producción según especialización y carga de trabajo.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="Órdenes totales"
          value={stats.total}
          accent="#eab676"
        />
        <StatCard
          icon={<UserPlus className="w-4 h-4" />}
          label="Sin asignar"
          value={stats.unassigned}
          accent="#ef4444"
        />
        <StatCard
          icon={<HardHat className="w-4 h-4" />}
          label="Asignadas"
          value={stats.assigned}
          accent="#10b981"
        />
        <StatCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Retrasadas"
          value={stats.delayed}
          accent="#f59e0b"
        />
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, cliente, proyecto, mueble o contratista…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {f.label} · {counts[f.id] ?? 0}
            </button>
          ))}
          {(search || filter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center">
          <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin resultados</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Probá con otra búsqueda o filtro.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ o, project, client, contractor }) => {
            const cfg = STATUS_CFG[o.status];
            const totalUnits = o.items.reduce((s, i) => s + i.quantity, 0);
            const unassigned = !contractor;
            return (
              <Card
                key={o.id}
                className={`p-4 transition-all ${
                  unassigned ? 'border-l-4 border-l-red-400' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Icon + main */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#eab67622' }}
                    >
                      <Package className="w-5 h-5" style={{ color: '#eab676' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">
                          {project?.name ?? 'Proyecto'}{' '}
                          <span className="text-muted-foreground font-normal">·</span>{' '}
                          <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {o.items.map((i) => `${i.quantity}× ${i.description}`).join(' · ')}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {client?.name ?? '—'}
                        </span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Inicio {formatDate(o.startDate)}
                        </span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Entrega {formatDate(o.estimatedDeliveryDate)}
                        </span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="w-3 h-3" />
                          {totalUnits} u.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contractor */}
                  <div className="flex items-center gap-3 shrink-0">
                    {contractor ? (
                      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                        >
                          {getInitials(contractor.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{contractor.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {contractor.specialization}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-red-500 font-medium">
                        <UserPlus className="w-3.5 h-3.5" />
                        Sin contratista
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant={contractor ? 'outline' : 'default'}
                      className={`gap-1.5 text-xs ${
                        contractor
                          ? ''
                          : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                      onClick={() => setAssignTarget(o)}
                    >
                      {contractor ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reasignar
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          Asignar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign dialog */}
      <AssignDialog
        order={assignTarget}
        contractors={CONTRACTORS}
        ordersCountByContractor={Object.fromEntries(
          CONTRACTORS.map((c) => [
            c.id,
            orders.filter((o) => o.assignedContractorId === c.id).length,
          ]),
        )}
        onClose={() => setAssignTarget(null)}
        onAssign={(contractorId) => {
          if (assignTarget) assignContractor(assignTarget.id, contractorId);
          setAssignTarget(null);
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
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
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </Card>
  );
}

interface AssignDialogProps {
  order: ProductionOrder | null;
  contractors: Contractor[];
  ordersCountByContractor: Record<string, number>;
  onClose: () => void;
  onAssign: (contractorId: string | null) => void;
}

function AssignDialog({
  order,
  contractors,
  ordersCountByContractor,
  onClose,
  onAssign,
}: AssignDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // reset when dialog reopens
  const open = Boolean(order);
  if (open && selected === null && order?.assignedContractorId) {
    // preselect current
    setSelected(order.assignedContractorId);
  }
  if (!open && selected !== null) {
    setSelected(null);
    setSearch('');
  }

  const term = search.trim().toLowerCase();
  const filtered = contractors
    .filter((c) => c.status === 'active')
    .filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.specialization.toLowerCase().includes(term),
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {order?.assignedContractorId ? 'Reasignar contratista' : 'Asignar contratista'}
          </DialogTitle>
          <DialogDescription>
            {order ? (
              <>
                Orden{' '}
                <span className="font-mono text-foreground">{order.id}</span> ·{' '}
                {order.items.length} ítem(s)
              </>
            ) : (
              null
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o especialización…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5 max-h-[320px] overflow-y-auto -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay contratistas disponibles.
            </p>
          ) : (
            filtered.map((c) => {
              const isSelected = selected === c.id;
              const count = ordersCountByContractor[c.id] ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'border-foreground bg-muted/60'
                      : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.specialization}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                    <Users className="w-3 h-3" />
                    {count} {count === 1 ? 'orden' : 'órdenes'}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row sm:justify-between">
          {order?.assignedContractorId ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onAssign(null)}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Quitar asignación
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!selected}
              onClick={() => selected && onAssign(selected)}
              className="gap-1.5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
