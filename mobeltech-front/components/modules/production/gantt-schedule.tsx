'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRole } from '@/hooks/use-role-context';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Plus,
  Save,
  X,
} from 'lucide-react';

type PhaseName = 'cortado' | 'canteado' | 'ensamblado' | 'instalacion' | 'entregado';
type ScheduleType = 'tentative' | 'actual';

type ProductionOrder = {
  id: string;
  quotationId?: string | null;
  assignedContractorId?: string | null;
  startDate: string;
  estimatedDeliveryDate: string;
  status: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
  }>;
  schedulePhases?: SchedulePhase[];
};

type SchedulePhase = {
  id?: string;
  productionOrderId?: string;
  type: ScheduleType;
  phase: PhaseName;
  startDate: string;
  endDate: string;
};

type Contractor = {
  id: string;
  name: string;
  userId?: string | null;
  specialization?: string | null;
};

type Quotation = {
  id: string;
  clientId: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
  }>;
};

type Client = {
  id: string;
  name: string;
};

const PHASES: Array<{ key: PhaseName; label: string; color: string }> = [
  { key: 'cortado', label: 'Corte', color: '#3b82f6' },
  { key: 'canteado', label: 'Canteado', color: '#f59e0b' },
  { key: 'ensamblado', label: 'Ensamblado', color: '#10b981' },
  { key: 'instalacion', label: 'Instalacion', color: '#8b5cf6' },
  { key: 'entregado', label: 'Entrega', color: '#14b8a6' },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = parseDate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function formatShortDate(value?: string | Date | null) {
  const date = parseDate(value);
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(date);
}

function getDefaultPhasePlan(startDate?: string | null) {
  let cursor = startDate ? String(startDate).slice(0, 10) : toInputDate(new Date());
  return PHASES.map((phase) => {
    const start = cursor;
    const end = addDays(start, phase.key === 'entregado' ? 0 : 2);
    cursor = addDays(end, 1);
    return {
      phase: phase.key,
      startDate: start,
      endDate: end,
    };
  });
}

function normalizePhaseRows(rows: SchedulePhase[] | undefined, type: ScheduleType, fallbackStart?: string | null) {
  const existing = rows?.filter((row) => row.type === type) ?? [];
  const fallback = getDefaultPhasePlan(fallbackStart);
  return PHASES.map((phase, index) => {
    const found = existing.find((row) => row.phase === phase.key);
    return {
      phase: phase.key,
      startDate: found?.startDate?.slice(0, 10) ?? fallback[index].startDate,
      endDate: found?.endDate?.slice(0, 10) ?? fallback[index].endDate,
    };
  });
}

function validateSuccessivePhases(phases: ReturnType<typeof normalizePhaseRows>) {
  for (let index = 0; index < phases.length; index += 1) {
    const currentStart = parseDate(phases[index].startDate);
    const currentEnd = parseDate(phases[index].endDate);
    if (!currentStart || !currentEnd || currentEnd < currentStart) {
      return 'Cada etapa debe tener una fecha final igual o posterior a su inicio.';
    }

    if (index > 0) {
      const previousEnd = parseDate(phases[index - 1].endDate);
      if (previousEnd) {
        const expectedStart = new Date(previousEnd);
        expectedStart.setDate(expectedStart.getDate() + 1);
        if (currentStart.getTime() < expectedStart.getTime()) {
          return 'Cada etapa debe comenzar al menos al dia siguiente de la etapa anterior.';
        }
      }
    }
  }

  return null;
}

function rangeFromOrders(orders: ProductionOrder[]) {
  const dates = orders.flatMap((order) => {
    const scheduleDates = (order.schedulePhases ?? []).flatMap((phase) => [parseDate(phase.startDate), parseDate(phase.endDate)]);
    return [parseDate(order.startDate), parseDate(order.estimatedDeliveryDate), ...scheduleDates].filter(Boolean) as Date[];
  });

  if (dates.length === 0) {
    const now = new Date();
    return { start: now, days: 30 };
  }

  const min = new Date(Math.min(...dates.map((date) => date.getTime())));
  const max = new Date(Math.max(...dates.map((date) => date.getTime())));
  min.setDate(min.getDate() - 2);
  max.setDate(max.getDate() + 4);
  return {
    start: min,
    days: Math.max(14, Math.ceil((max.getTime() - min.getTime()) / DAY_MS) + 1),
  };
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(start: Date, end: Date) {
  const startDay = new Intl.DateTimeFormat('es-BO', { day: '2-digit' }).format(start);
  const endDay = new Intl.DateTimeFormat('es-BO', { day: '2-digit' }).format(end);
  return `Sem ${startDay}-${endDay}`;
}

function groupColumns<T>(dates: Date[], getKey: (date: Date) => string, getLabel: (date: Date, end: Date) => string) {
  const groups: Array<{ key: string; label: string; span: number }> = [];

  dates.forEach((date) => {
    const key = getKey(date);
    const current = groups[groups.length - 1];
    if (current && current.key === key) {
      current.span += 1;
      current.label = getLabel(new Date(date), new Date(date));
      return;
    }

    groups.push({
      key,
      label: getLabel(new Date(date), new Date(date)),
      span: 1,
    });
  });

  return groups.map((group, index) => {
    const sliceStart = dates.slice(0, groups.slice(0, index).reduce((sum, item) => sum + item.span, 0)).length;
    const firstDate = dates[sliceStart];
    const lastDate = dates[sliceStart + group.span - 1];
    return {
      ...group,
      label: getLabel(firstDate, lastDate),
    };
  });
}

function buildMonthWindows(dates: Date[]) {
  const months: Array<{
    key: string;
    label: string;
    startIndex: number;
    endIndex: number;
    span: number;
  }> = [];

  dates.forEach((date, index) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const current = months[months.length - 1];

    if (current && current.key === key) {
      current.endIndex = index;
      current.span += 1;
      return;
    }

    months.push({
      key,
      label: new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(date),
      startIndex: index,
      endIndex: index,
      span: 1,
    });
  });

  return months;
}

export function GanttSchedule() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<{
    order: ProductionOrder;
    type: ScheduleType;
    phases: ReturnType<typeof normalizePhaseRows>;
  } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedContractorFilter, setSelectedContractorFilter] = useState('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);

  const isContractor = currentRole === 'contractor';
  const canCreateTentative = currentRole === 'admin' || currentRole === 'architect';

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, contractorsResponse, quotationsResponse, clientsResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractors`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
      ]);

      if (!ordersResponse.ok) throw new Error('No se pudieron cargar las ordenes de produccion.');
      if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas.');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones.');
      if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes.');

      setOrders(await ordersResponse.json());
      setContractors(await contractorsResponse.json());
      setQuotations(await quotationsResponse.json());
      setClients(await clientsResponse.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cronograma.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const myContractor = useMemo(() => {
    if (!user) return null;
    return contractors.find((contractor) => contractor.userId === user.id || contractor.id === user.id) ?? null;
  }, [contractors, user]);

  const visibleOrders = useMemo(() => {
    if (!isContractor) return orders;
    if (!myContractor) return [];
    return orders.filter((order) => order.assignedContractorId === myContractor.id);
  }, [isContractor, myContractor, orders]);
  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      const matchesContractor = selectedContractorFilter === 'all' || order.assignedContractorId === selectedContractorFilter;
      const matchesClient = selectedClientFilter === 'all' || getQuotation(order)?.clientId === selectedClientFilter;
      return matchesContractor && matchesClient;
    });
  }, [selectedClientFilter, selectedContractorFilter, visibleOrders]);

  const timeline = useMemo(() => rangeFromOrders(filteredOrders), [filteredOrders]);
  const dayColumns = useMemo(() => {
    return Array.from({ length: timeline.days }, (_, index) => {
      const date = new Date(timeline.start);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [timeline]);
  const monthWindows = useMemo(() => buildMonthWindows(dayColumns), [dayColumns]);
  const visibleMonthSlice = useMemo(
    () => monthWindows.slice(visibleMonthIndex, visibleMonthIndex + 2),
    [monthWindows, visibleMonthIndex],
  );
  const visibleRange = useMemo(() => {
    if (visibleMonthSlice.length === 0) {
      return { startIndex: 0, endIndex: Math.max(dayColumns.length - 1, 0) };
    }

    return {
      startIndex: visibleMonthSlice[0].startIndex,
      endIndex: visibleMonthSlice[visibleMonthSlice.length - 1].endIndex,
    };
  }, [dayColumns.length, visibleMonthSlice]);
  const visibleDayColumns = useMemo(
    () => dayColumns.slice(visibleRange.startIndex, visibleRange.endIndex + 1),
    [dayColumns, visibleRange.endIndex, visibleRange.startIndex],
  );
  const monthGroups = useMemo(
    () => groupColumns(
      visibleDayColumns,
      (date) => `${date.getFullYear()}-${date.getMonth()}`,
      (date) => new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(date),
    ),
    [visibleDayColumns],
  );
  const weekGroups = useMemo(
    () => groupColumns(
      visibleDayColumns,
      (date) => startOfWeek(date).toISOString().slice(0, 10),
      (date, end) => formatWeekLabel(date, end),
    ),
    [visibleDayColumns],
  );
  const visibleTimelineStart = visibleDayColumns[0] ?? timeline.start;
  const visibleTimelineDays = Math.max(visibleDayColumns.length, 1);
  const timelineColumnWidth = `${Math.max(visibleTimelineDays * 42, 720)}px`;

  useEffect(() => {
    setVisibleMonthIndex((current) => {
      const maxIndex = Math.max(monthWindows.length - 1, 0);
      return Math.min(current, maxIndex);
    });
  }, [monthWindows.length]);

  function getQuotation(order: ProductionOrder) {
    return quotations.find((quotation) => quotation.id === order.quotationId);
  }

  function getClient(order: ProductionOrder) {
    const quotation = getQuotation(order);
    return clients.find((client) => client.id === quotation?.clientId);
  }

  function getContractor(order: ProductionOrder) {
    return contractors.find((contractor) => contractor.id === order.assignedContractorId);
  }

  function getFurnitureName(order: ProductionOrder) {
    const quotation = getQuotation(order);
    return quotation?.items?.[0]?.description || order.items?.[0]?.description || 'Trabajo sin titulo';
  }

  const availableContractors = useMemo(() => {
    const ids = new Set(visibleOrders.map((order) => order.assignedContractorId).filter(Boolean));
    return contractors
      .filter((contractor) => ids.has(contractor.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contractors, visibleOrders]);

  const availableClients = useMemo(() => {
    const ids = new Set(
      visibleOrders
        .map((order) => getQuotation(order)?.clientId)
        .filter((value): value is string => Boolean(value)),
    );

    return clients
      .filter((client) => ids.has(client.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, quotations, visibleOrders]);

  function startEditing(order: ProductionOrder, type: ScheduleType) {
    setEditing({
      order,
      type,
      phases: normalizePhaseRows(order.schedulePhases, type, order.startDate),
    });
  }

  function startCreateTentative() {
    const order = filteredOrders.find((item) => item.id === selectedOrderId) ?? filteredOrders[0];
    if (!order) return;
    startEditing(order, 'tentative');
  }

  function updatePhase(index: number, key: 'startDate' | 'endDate', value: string) {
    setEditing((current) => {
      if (!current) return current;
      const next = current.phases.map((phase, phaseIndex) => (
        phaseIndex === index ? { ...phase, [key]: value } : phase
      ));

      if (key === 'endDate' && index < next.length - 1) {
        next[index + 1] = {
          ...next[index + 1],
          startDate: addDays(value, 1),
        };
      }

      return { ...current, phases: next };
    });
  }

  async function saveSchedule() {
    if (!editing || !apiBase) return;
    const validation = validateSuccessivePhases(editing.phases);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/production-orders/${editing.order.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editing.type,
          createdBy: user?.id && UUID_REGEX.test(user.id) ? user.id : null,
          phases: editing.phases,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'No se pudo guardar el cronograma.');
      }

      const updated = await response.json();
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cronograma.');
    } finally {
      setSaving(false);
    }
  }

  function renderPhaseBars(order: ProductionOrder, type: ScheduleType) {
    const rows = (order.schedulePhases ?? []).filter((phase) => phase.type === type);
    if (rows.length === 0) {
      return (
        <div className="flex h-8 items-center rounded-md border border-dashed border-border bg-muted/20 px-3 text-xs text-muted-foreground">
          {type === 'tentative' ? 'Sin cronograma tentativo' : 'Sin avance real registrado'}
        </div>
      );
    }

    return (
      <div className="relative h-8 rounded-md bg-muted/30">
        {rows.map((row) => {
          const phaseConfig = PHASES.find((phase) => phase.key === row.phase);
          const start = parseDate(row.startDate);
          const end = parseDate(row.endDate);
          if (!start || !end) return null;
          const visibleStart = new Date(Math.max(start.getTime(), visibleTimelineStart.getTime()));
          const visibleEnd = new Date(Math.min(end.getTime(), visibleTimelineStart.getTime() + ((visibleTimelineDays - 1) * DAY_MS)));
          if (visibleEnd.getTime() < visibleTimelineStart.getTime() || visibleStart.getTime() > visibleEnd.getTime()) {
            return null;
          }

          const left = Math.max(0, ((visibleStart.getTime() - visibleTimelineStart.getTime()) / DAY_MS / visibleTimelineDays) * 100);
          const width = Math.max(2, (((visibleEnd.getTime() - visibleStart.getTime()) / DAY_MS + 1) / visibleTimelineDays) * 100);
          const color = type === 'tentative' ? '#a1a1aa' : phaseConfig?.color ?? '#eab676';

          return (
            <div
              key={`${type}-${row.phase}`}
              className="absolute top-1 h-6 rounded-md px-2 text-[11px] font-semibold leading-6 text-white shadow-sm"
              style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, backgroundColor: color }}
              title={`${phaseConfig?.label}: ${formatShortDate(row.startDate)} - ${formatShortDate(row.endDate)}`}
            >
              <span className="block truncate">{phaseConfig?.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando cronograma"
        description="Sincronizando ordenes, contratistas y fases de produccion."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cronograma de produccion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compara tiempos tentativos con avance real por etapa.
          </p>
        </div>
        {canCreateTentative ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
              className="h-10 min-w-[280px] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Elegir cotizacion/trabajo...</option>
              {filteredOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {getFurnitureName(order)} - {getClient(order)?.name ?? 'Cliente'}
                </option>
              ))}
            </select>
            <Button onClick={startCreateTentative} disabled={!selectedOrderId} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear tiempo tentativo
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <ScheduleMetric icon={<ClipboardList className="h-4 w-4" />} label="Trabajos" value={String(filteredOrders.length)} />
        <ScheduleMetric icon={<Clock3 className="h-4 w-4" />} label="Tentativos" value={String(filteredOrders.filter((order) => order.schedulePhases?.some((phase) => phase.type === 'tentative')).length)} />
        <ScheduleMetric icon={<CalendarDays className="h-4 w-4" />} label="Reales" value={String(filteredOrders.filter((order) => order.schedulePhases?.some((phase) => phase.type === 'actual')).length)} />
        <ScheduleMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Completos" value={String(filteredOrders.filter((order) => order.status === 'completed').length)} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(234,182,118,0.18),rgba(154,107,47,0.08))] px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Vista de tiempo</p>
                <p className="text-sm text-foreground/80">
                  Se muestran {visibleMonthSlice.map((month) => month.label).join(' - ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-foreground/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                  <span className="h-3 w-6 rounded bg-zinc-400" />
                  Tentativo
                </span>
                {PHASES.map((phase) => (
                  <span key={phase.key} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                    <span className="h-3 w-6 rounded" style={{ backgroundColor: phase.color }} />
                    Real {phase.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedContractorFilter}
                  onChange={(event) => setSelectedContractorFilter(event.target.value)}
                  className="h-10 min-w-[220px] rounded-md border border-border/70 bg-background/90 px-3 text-sm text-foreground shadow-sm"
                >
                  <option value="all">Todos los contratistas</option>
                  {availableContractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedClientFilter}
                  onChange={(event) => setSelectedClientFilter(event.target.value)}
                  className="h-10 min-w-[220px] rounded-md border border-border/70 bg-background/90 px-3 text-sm text-foreground shadow-sm"
                >
                  <option value="all">Todos los clientes</option>
                  {availableClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setVisibleMonthIndex((current) => Math.max(current - 1, 0))}
                  disabled={visibleMonthIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setVisibleMonthIndex((current) => Math.min(current + 1, Math.max(monthWindows.length - 2, 0)))}
                  disabled={visibleMonthIndex >= Math.max(monthWindows.length - 2, 0)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-auto">
          <div className="min-w-max">
          <div className="grid border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns: `280px ${timelineColumnWidth}` }}>
            <div className="border-r border-border px-4 py-3">Mueble / Cliente / Contratista</div>
            <div>
              <div className="grid border-b border-border/50" style={{ gridTemplateColumns: `repeat(${visibleDayColumns.length}, minmax(32px, 1fr))` }}>
              {monthGroups.map((group) => (
                <div
                  key={`month-${group.key}`}
                  className="border-r border-border/40 bg-[#e8dfd1] px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#6f5840]"
                  style={{ gridColumn: `span ${group.span} / span ${group.span}` }}
                >
                  {group.label}
                </div>
              ))}
              </div>
              <div className="grid border-b border-border/40" style={{ gridTemplateColumns: `repeat(${visibleDayColumns.length}, minmax(32px, 1fr))` }}>
              {weekGroups.map((group) => (
                <div
                  key={`week-${group.key}`}
                  className="border-r border-border/30 bg-[#f3ede4] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7257]"
                  style={{ gridColumn: `span ${group.span} / span ${group.span}` }}
                >
                  {group.label}
                </div>
              ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleDayColumns.length}, minmax(32px, 1fr))` }}>
              {visibleDayColumns.map((day) => (
                <div key={day.toISOString()} className="border-r border-border/40 px-1 py-2 text-center">
                  <div className="text-[11px] font-semibold text-foreground">
                    {new Intl.DateTimeFormat('es-BO', { day: '2-digit' }).format(day)}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                    {new Intl.DateTimeFormat('es-BO', { weekday: 'short' }).format(day)}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          {filteredOrders.map((order) => {
            const contractor = getContractor(order);
            const client = getClient(order);
            const canEditActual = isContractor && myContractor?.id === order.assignedContractorId;

            return (
              <div key={order.id} className="grid border-b border-border" style={{ gridTemplateColumns: `280px ${timelineColumnWidth}` }}>
                <button
                  type="button"
                  onClick={() => (canEditActual ? startEditing(order, 'actual') : canCreateTentative ? startEditing(order, 'tentative') : undefined)}
                  className="border-r border-border px-4 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <p className="text-sm font-semibold">{getFurnitureName(order)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{client?.name ?? 'Cliente no registrado'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{contractor?.name ?? 'Sin contratista'}</Badge>
                    {canEditActual ? <Badge className="bg-emerald-100 text-emerald-700">Editable</Badge> : null}
                  </div>
                </button>
                <div
                  className="space-y-2 px-3 py-4"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(42px - 1px), rgba(148,163,184,0.18) calc(42px - 1px), rgba(148,163,184,0.18) 42px)',
                    backgroundSize: '42px 100%',
                  }}
                >
                  {renderPhaseBars(order, 'tentative')}
                  {renderPhaseBars(order, 'actual')}
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay trabajos disponibles para este cronograma.
            </div>
          ) : null}
          </div>
        </div>
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">
                  {editing.type === 'tentative' ? 'Editar cronograma tentativo' : 'Editar cronograma real'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getFurnitureName(editing.order)} - {getClient(editing.order)?.name ?? 'Cliente'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              {editing.phases.map((phase, index) => {
                const phaseConfig = PHASES.find((item) => item.key === phase.phase);
                return (
                  <div key={phase.phase} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[140px_1fr_1fr] md:items-center">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: editing.type === 'tentative' ? '#a1a1aa' : phaseConfig?.color }} />
                      <p className="text-sm font-semibold">{phaseConfig?.label}</p>
                    </div>
                    <Input
                      type="date"
                      value={phase.startDate}
                      onChange={(event) => updatePhase(index, 'startDate', event.target.value)}
                    />
                    <Input
                      type="date"
                      value={phase.endDate}
                      onChange={(event) => updatePhase(index, 'endDate', event.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveSchedule} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cronograma
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eab676]/15 text-[#9a6b2f]">
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
