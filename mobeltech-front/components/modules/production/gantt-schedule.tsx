'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as DateRangeCalendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRole } from '@/hooks/use-role-context';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Loader2,
  PencilLine,
  Save,
  X,
} from 'lucide-react';

type PhaseName = 'cortado' | 'canteado' | 'ensamblado' | 'instalacion' | 'entregado';
type ScheduleViewMode = 'mine' | 'global';
type CuttingMachine = 'cortadora-1' | 'cortadora-2';

type ProductionOrder = {
  id: string;
  projectId?: string | null;
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
  type: 'tentative' | 'actual';
  phase: PhaseName;
  startDate: string;
  endDate: string;
  cuttingMachine?: CuttingMachine | null;
};

type EditablePhase = {
  phase: PhaseName;
  startDate: string;
  endDate: string;
  cuttingMachine: CuttingMachine | null;
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

type Project = {
  id: string;
  name: string;
  clientId: string;
  startDate: string;
  estimatedDeliveryDate: string;
};

type MachineReservation = {
  orderId: string;
  furnitureName: string;
  contractorName: string;
  startDate: string;
  endDate: string;
};

const PHASES: Array<{ key: PhaseName; label: string; color: string }> = [
  { key: 'cortado', label: 'Corte', color: '#3b82f6' },
  { key: 'canteado', label: 'Canteado', color: '#f59e0b' },
  { key: 'ensamblado', label: 'Ensamblado', color: '#10b981' },
  { key: 'instalacion', label: 'Instalacion', color: '#8b5cf6' },
  { key: 'entregado', label: 'Entrega', color: '#14b8a6' },
];

const CUTTING_MACHINES: Array<{ value: CuttingMachine; label: string }> = [
  { value: 'cortadora-1', label: 'Cortadora 1' },
  { value: 'cortadora-2', label: 'Cortadora 2' },
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

function toLocalDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function formatDisplayDate(value?: string | Date | null) {
  const date = parseDate(value);
  if (!date) return 'dd/mm/yyyy';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatRangeLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 'Sin rango';
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

function getDefaultActualPlan(startDate?: string | null) {
  let cursor = startDate ? String(startDate).slice(0, 10) : toInputDate(new Date());
  return PHASES.map((phase) => {
    const start = cursor;
    const end = addDays(start, phase.key === 'entregado' ? 0 : 2);
    cursor = addDays(end, 1);
    return {
      phase: phase.key,
      startDate: start,
      endDate: end,
      cuttingMachine: phase.key === 'cortado' ? 'cortadora-1' as CuttingMachine : null,
    };
  });
}

function normalizeActualPhases(rows: SchedulePhase[] | undefined, fallbackStart?: string | null) {
  const existing = rows?.filter((row) => row.type === 'actual') ?? [];
  const fallback = getDefaultActualPlan(fallbackStart);
  return PHASES.map((phase, index) => {
    const found = existing.find((row) => row.phase === phase.key);
    return {
      phase: phase.key,
      startDate: found?.startDate?.slice(0, 10) ?? fallback[index].startDate,
      endDate: found?.endDate?.slice(0, 10) ?? fallback[index].endDate,
      cuttingMachine: phase.key === 'cortado'
        ? (found?.cuttingMachine as CuttingMachine | null | undefined) ?? 'cortadora-1'
        : null,
    };
  });
}

function validatePhaseRanges(phases: EditablePhase[]) {
  for (const phase of phases) {
    const start = parseDate(phase.startDate);
    const end = parseDate(phase.endDate);

    if (!start || !end) {
      return 'Cada fase debe tener fecha de inicio y fin.';
    }

    if (end < start) {
      return 'La fecha final de cada fase debe ser igual o posterior a su inicio.';
    }
  }

  const cuttingPhase = phases.find((phase) => phase.phase === 'cortado');
  if (!cuttingPhase?.cuttingMachine) {
    return 'Selecciona la cortadora de la fase de corte.';
  }

  return null;
}

function dateRangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() <= endB.getTime() && endA.getTime() >= startB.getTime();
}

function daysBetween(startValue?: string | null, endValue?: string | null) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end || end < start) return [];

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function buildMachineCalendarWindow(reservations: MachineReservation[], selectedStart?: string, selectedEnd?: string) {
  const dates = [
    parseDate(selectedStart),
    parseDate(selectedEnd),
    ...reservations.flatMap((reservation) => [parseDate(reservation.startDate), parseDate(reservation.endDate)]),
  ].filter(Boolean) as Date[];

  const base = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : new Date();
  base.setDate(base.getDate() - 3);
  return daysBetween(toLocalDateString(base), toLocalDateString(new Date(base.getTime() + 20 * DAY_MS)));
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

function groupColumns(dates: Date[], getKey: (date: Date) => string, getLabel: (date: Date, end: Date) => string) {
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

function assignPhaseLanes(rows: SchedulePhase[]) {
  const laneEndTimes: number[] = [];

  return [...rows]
    .sort((left, right) => {
      const leftStart = parseDate(left.startDate)?.getTime() ?? 0;
      const rightStart = parseDate(right.startDate)?.getTime() ?? 0;
      if (leftStart !== rightStart) return leftStart - rightStart;

      const leftEnd = parseDate(left.endDate)?.getTime() ?? 0;
      const rightEnd = parseDate(right.endDate)?.getTime() ?? 0;
      if (leftEnd !== rightEnd) return leftEnd - rightEnd;

      return PHASES.findIndex((phase) => phase.key === left.phase) - PHASES.findIndex((phase) => phase.key === right.phase);
    })
    .map((row) => {
      const startTime = parseDate(row.startDate)?.getTime() ?? 0;
      const endTime = parseDate(row.endDate)?.getTime() ?? 0;
      let lane = laneEndTimes.findIndex((laneEnd) => laneEnd < startTime);

      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(endTime);
      } else {
        laneEndTimes[lane] = endTime;
      }

      return { row, lane };
    });
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedContractorFilter, setSelectedContractorFilter] = useState('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('mine');
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);
  const [editing, setEditing] = useState<{
    order: ProductionOrder;
    phases: EditablePhase[];
  } | null>(null);

  const isContractor = currentRole === 'contractor';

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, contractorsResponse, quotationsResponse, clientsResponse, projectsResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractors`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/projects`, { cache: 'no-store' }),
      ]);

      if (!ordersResponse.ok) throw new Error('No se pudieron cargar las ordenes de produccion.');
      if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas.');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones.');
      if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes.');
      if (!projectsResponse.ok) throw new Error('No se pudieron cargar los proyectos.');

      setOrders(await ordersResponse.json());
      setContractors(await contractorsResponse.json());
      setQuotations(await quotationsResponse.json());
      setClients(await clientsResponse.json());
      setProjects(await projectsResponse.json());
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
    if (scheduleViewMode === 'global') return orders;
    return orders.filter((order) => order.assignedContractorId === myContractor.id);
  }, [isContractor, myContractor, orders, scheduleViewMode]);

  function getQuotation(order: ProductionOrder) {
    return quotations.find((quotation) => quotation.id === order.quotationId);
  }

  function getProject(order: ProductionOrder) {
    return projects.find((project) => project.id === order.projectId);
  }

  function getOrderClientId(order: ProductionOrder) {
    return getProject(order)?.clientId ?? getQuotation(order)?.clientId;
  }

  function getClient(order: ProductionOrder) {
    return clients.find((client) => client.id === getOrderClientId(order));
  }

  function getContractor(order: ProductionOrder) {
    return contractors.find((contractor) => contractor.id === order.assignedContractorId);
  }

  function getFurnitureName(order: ProductionOrder) {
    const project = getProject(order);
    if (project?.name) return project.name;
    const quotation = getQuotation(order);
    return quotation?.items?.[0]?.description || order.items?.[0]?.description || 'Trabajo sin titulo';
  }

  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      const matchesContractor = selectedContractorFilter === 'all' || order.assignedContractorId === selectedContractorFilter;
      const matchesClient = selectedClientFilter === 'all' || getOrderClientId(order) === selectedClientFilter;
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

  const availableContractors = useMemo(() => {
    const ids = new Set(visibleOrders.map((order) => order.assignedContractorId).filter(Boolean));
    return contractors
      .filter((contractor) => ids.has(contractor.id))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [contractors, visibleOrders]);

  const availableClients = useMemo(() => {
    const ids = new Set(
      visibleOrders
        .map((order) => getOrderClientId(order))
        .filter((value): value is string => Boolean(value)),
    );

    return clients
      .filter((client) => ids.has(client.id))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [clients, visibleOrders]);

  function startEditing(order: ProductionOrder) {
    setError(null);
    setEditing({
      order,
      phases: normalizeActualPhases(order.schedulePhases, order.startDate),
    });
  }

  function closeEditing() {
    if (saving) return;
    setEditing(null);
  }

  function updatePhaseRange(index: number, startDate: string, endDate: string) {
    setEditing((current) => {
      if (!current) return current;
      return {
        ...current,
        phases: current.phases.map((phase, phaseIndex) => (
          phaseIndex === index
            ? { ...phase, startDate, endDate }
            : phase
        )),
      };
    });
  }

  function updateCuttingMachine(value: CuttingMachine) {
    setEditing((current) => {
      if (!current) return current;
      return {
        ...current,
        phases: current.phases.map((phase) => (
          phase.phase === 'cortado' ? { ...phase, cuttingMachine: value } : phase
        )),
      };
    });
  }

  const machineReservations = useMemo<MachineReservation[]>(() => {
    if (!editing) return [];
    const cuttingPhase = editing.phases.find((phase) => phase.phase === 'cortado');
    if (!cuttingPhase?.cuttingMachine) return [];

    return orders
      .flatMap((order) => {
        if (order.id === editing.order.id) return [];

        return (order.schedulePhases ?? [])
          .filter((phase) => (
            phase.type === 'actual' &&
            phase.phase === 'cortado' &&
            phase.cuttingMachine === cuttingPhase.cuttingMachine
          ))
          .map((phase) => ({
            orderId: order.id,
            furnitureName: getFurnitureName(order),
            contractorName: getContractor(order)?.name ?? 'Sin contratista',
            startDate: phase.startDate,
            endDate: phase.endDate,
          }));
      })
      .sort((left, right) => {
        const leftStart = parseDate(left.startDate)?.getTime() ?? 0;
        const rightStart = parseDate(right.startDate)?.getTime() ?? 0;
        return leftStart - rightStart;
      });
  }, [editing, orders]);

  async function saveSchedule() {
    if (!editing || !apiBase) return;

    const validation = validatePhaseRanges(editing.phases);
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
          type: 'actual',
          createdBy: user?.id && UUID_REGEX.test(user.id) ? user.id : null,
          phases: editing.phases,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo guardar el cronograma por fases.');
      }

      setOrders((current) => current.map((order) => (order.id === body.id ? body : order)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cronograma.');
    } finally {
      setSaving(false);
    }
  }

  function getTimelinePlacement(startValue?: string | null, endValue?: string | null) {
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start || !end) return null;

    const visibleStart = new Date(Math.max(start.getTime(), visibleTimelineStart.getTime()));
    const visibleEnd = new Date(Math.min(end.getTime(), visibleTimelineStart.getTime() + ((visibleTimelineDays - 1) * DAY_MS)));
    if (visibleEnd.getTime() < visibleTimelineStart.getTime() || visibleStart.getTime() > visibleEnd.getTime()) return null;

    const left = Math.max(0, ((visibleStart.getTime() - visibleTimelineStart.getTime()) / DAY_MS / visibleTimelineDays) * 100);
    const width = Math.max(2, (((visibleEnd.getTime() - visibleStart.getTime()) / DAY_MS + 1) / visibleTimelineDays) * 100);

    return {
      left,
      width: Math.min(width, 100 - left),
    };
  }

  function renderTentativeBar(order: ProductionOrder) {
    const placement = getTimelinePlacement(order.startDate, order.estimatedDeliveryDate);
    if (!placement) {
      return (
        <div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/20 px-3 text-xs text-muted-foreground">
          Sin tiempo tentativo asignado
        </div>
      );
    }

    return (
      <div className="relative h-9 rounded-md bg-muted/25">
        <div
          className="absolute top-1 h-7 rounded-md bg-zinc-400 px-3 text-[11px] font-semibold leading-7 text-white shadow-sm ring-1 ring-zinc-500/20"
          style={{ left: `${placement.left}%`, width: `${placement.width}%` }}
          title={`Tiempo tentativo: ${formatShortDate(order.startDate)} - ${formatShortDate(order.estimatedDeliveryDate)}`}
        >
          <span className="block truncate">Tiempo tentativo</span>
        </div>
      </div>
    );
  }

  function renderActualBars(order: ProductionOrder, canEdit: boolean) {
    const rows = (order.schedulePhases ?? []).filter((phase) => phase.type === 'actual');

    if (rows.length === 0) {
      return (
        <div className="flex h-10 items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/20 px-3 text-xs text-muted-foreground">
          <span>Sin cronograma por fases registrado.</span>
          {canEdit ? <span className="font-medium text-foreground/70">Usa "Editar fases".</span> : null}
        </div>
      );
    }

    const laneRows = assignPhaseLanes(rows);
    const laneCount = Math.max(...laneRows.map((entry) => entry.lane)) + 1;
    const contentHeight = Math.max(38, laneCount * 30 + 8);

    return (
      <div className="relative rounded-md bg-muted/30" style={{ height: `${contentHeight}px` }}>
        {laneRows.map(({ row, lane }) => {
          const phaseConfig = PHASES.find((phase) => phase.key === row.phase);
          const placement = getTimelinePlacement(row.startDate, row.endDate);
          if (!placement) return null;

          const machineLabel = row.phase === 'cortado'
            ? CUTTING_MACHINES.find((machine) => machine.value === row.cuttingMachine)?.label
            : null;

          return (
            <div
              key={`actual-${row.phase}-${row.id ?? `${row.startDate}-${row.endDate}`}`}
              className="absolute h-6 rounded-md px-2 text-[11px] font-semibold leading-6 text-white shadow-sm"
              style={{
                left: `${placement.left}%`,
                width: `${Math.min(placement.width, 100 - placement.left)}%`,
                top: `${lane * 30 + 4}px`,
                backgroundColor: phaseConfig?.color ?? '#eab676',
              }}
              title={`${phaseConfig?.label}: ${formatRangeLabel(row.startDate, row.endDate)}${machineLabel ? ` · ${machineLabel}` : ''}`}
            >
              <span className="block truncate">
                {phaseConfig?.label}
                {machineLabel ? ` · ${machineLabel.replace('Cortadora ', 'C')}` : ''}
              </span>
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
        description="Sincronizando ordenes, contratistas y tiempos tentativos."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cronograma de produccion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El tiempo tentativo viene del proyecto y el contratista registra su cronograma por fases sobre ese marco.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          {error}
        </Card>
      ) : null}

      {isContractor ? (
        <Card className="p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setScheduleViewMode('mine')}
              className={`rounded-md px-4 py-3 text-left text-sm transition-colors ${
                scheduleViewMode === 'mine'
                  ? 'bg-[#eab676] font-semibold text-[#1f1f1f]'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              Ver mi cronograma
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewMode('global')}
              className={`rounded-md px-4 py-3 text-left text-sm transition-colors ${
                scheduleViewMode === 'global'
                  ? 'bg-[#eab676] font-semibold text-[#1f1f1f]'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              Ver cronograma global
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <ScheduleMetric icon={<ClipboardList className="h-4 w-4" />} label="Trabajos" value={String(filteredOrders.length)} />
        <ScheduleMetric icon={<Clock3 className="h-4 w-4" />} label="Tentativos" value={String(filteredOrders.filter((order) => order.startDate && order.estimatedDeliveryDate).length)} />
        <ScheduleMetric icon={<CalendarRange className="h-4 w-4" />} label="Con fases" value={String(filteredOrders.filter((order) => order.schedulePhases?.some((phase) => phase.type === 'actual')).length)} />
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
                  Tiempo tentativo
                </span>
                {PHASES.map((phase) => (
                  <span key={phase.key} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                    <span className="h-3 w-6 rounded" style={{ backgroundColor: phase.color }} />
                    {phase.label}
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
            <div className="sticky top-0 z-20 grid border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground shadow-sm" style={{ gridTemplateColumns: `320px ${timelineColumnWidth}` }}>
              <div className="border-r border-border bg-muted/30 px-4 py-3">Mueble / Cliente / Contratista</div>
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
              const canEditActual = isContractor && scheduleViewMode === 'mine' && myContractor?.id === order.assignedContractorId;

              return (
                <div key={order.id} className="grid border-b border-border" style={{ gridTemplateColumns: `320px ${timelineColumnWidth}` }}>
                  <div className="border-r border-border px-4 py-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{getFurnitureName(order)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{client?.name ?? 'Cliente no registrado'}</p>
                      </div>
                      {canEditActual ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => startEditing(order)}>
                          <PencilLine className="h-3.5 w-3.5" />
                          Editar fases
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{contractor?.name ?? 'Sin contratista'}</Badge>
                      {canEditActual ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Editable</Badge> : null}
                      {isContractor && scheduleViewMode === 'global' ? <Badge variant="outline">Solo lectura</Badge> : null}
                    </div>
                  </div>
                  <div
                    className="space-y-3 px-3 py-4"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(42px - 1px), rgba(148,163,184,0.18) calc(42px - 1px), rgba(148,163,184,0.18) 42px)',
                      backgroundSize: '42px 100%',
                    }}
                  >
                    {renderTentativeBar(order)}
                    {renderActualBars(order, canEditActual)}
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
          <Card className="w-full max-w-4xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Cronograma por fases del contratista</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getFurnitureName(editing.order)} - {getClient(editing.order)?.name ?? 'Cliente'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeEditing} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
              Puedes planificar fases en el mismo dia o en rangos superpuestos. La disponibilidad de cortadoras se muestra como referencia para elegir mejor tus fechas.
            </div>

            <div className="mt-5 grid gap-3">
              {editing.phases.map((phase, index) => {
                const phaseConfig = PHASES.find((item) => item.key === phase.phase);
                const selectedMachineLabel = CUTTING_MACHINES.find((machine) => machine.value === phase.cuttingMachine)?.label ?? 'Cortadora';

                return (
                  <div key={phase.phase} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[150px_1fr] md:items-center">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: phaseConfig?.color }} />
                      <div>
                        <p className="text-sm font-semibold">{phaseConfig?.label}</p>
                        <p className="text-[11px] text-muted-foreground">{formatRangeLabel(phase.startDate, phase.endDate)}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px]">
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
                                <span className="block truncate text-xs font-medium">{formatDisplayDate(phase.startDate)}</span>
                              </span>
                              <span className="min-w-0 border-l border-border pl-3">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha fin</span>
                                <span className="block truncate text-xs font-medium">{formatDisplayDate(phase.endDate)}</span>
                              </span>
                            </div>
                            <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <DateRangeCalendar
                            mode="range"
                            numberOfMonths={1}
                            defaultMonth={parseDate(phase.startDate) ?? new Date()}
                            selected={{
                              from: parseDate(phase.startDate) ?? undefined,
                              to: parseDate(phase.endDate) ?? undefined,
                            }}
                            onSelect={(range) => {
                              const nextStart = range?.from ? toLocalDateString(range.from) : '';
                              updatePhaseRange(
                                index,
                                nextStart,
                                range?.to ? toLocalDateString(range.to) : nextStart,
                              );
                            }}
                            classNames={{
                              range_start: 'rounded-l-md bg-[#0f3d73] text-white',
                              range_middle: 'rounded-none bg-[#eab676]/35 text-foreground',
                              range_end: 'rounded-r-md bg-[#0f3d73] text-white',
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                      {phase.phase === 'cortado' ? (
                        <div className="flex gap-2">
                          <select
                            value={phase.cuttingMachine ?? 'cortadora-1'}
                            onChange={(event) => updateCuttingMachine(event.target.value as CuttingMachine)}
                            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {CUTTING_MACHINES.map((machine) => (
                              <option key={machine.value} value={machine.value}>
                                {machine.label}
                              </option>
                            ))}
                          </select>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="icon" aria-label={`Ver disponibilidad de ${selectedMachineLabel}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[360px] p-0">
                              <div className="border-b border-border px-4 py-3">
                                <p className="font-semibold">Disponibilidad de {selectedMachineLabel}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Bloques ya ocupados por otros trabajos en la etapa de corte.
                                </p>
                              </div>
                              <div className="space-y-3 p-4">
                                <div className="rounded-lg border border-border bg-muted/20 p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Rango que estas planificando</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{formatRangeLabel(phase.startDate, phase.endDate)}</p>
                                </div>

                                <MachineAvailabilityMiniCalendar
                                  reservations={machineReservations}
                                  selectedStart={phase.startDate}
                                  selectedEnd={phase.endDate}
                                />

                                {machineReservations.length === 0 ? (
                                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                                    No hay reservas registradas para esta cortadora en otros trabajos.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mini cronograma</p>
                                      <Badge variant="outline">{machineReservations.length} bloques</Badge>
                                    </div>
                                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                                      {machineReservations.map((reservation) => (
                                        <div key={`${reservation.orderId}-${reservation.startDate}-${reservation.endDate}`} className="rounded-lg border border-border/70 bg-background p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-semibold text-foreground">{reservation.furnitureName}</p>
                                              <p className="mt-1 text-xs text-muted-foreground">{reservation.contractorName}</p>
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                                              {formatRangeLabel(reservation.startDate, reservation.endDate)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditing} disabled={saving}>Cancelar</Button>
              <Button onClick={() => void saveSchedule()} disabled={saving} className="gap-2">
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

function MachineAvailabilityMiniCalendar({
  reservations,
  selectedStart,
  selectedEnd,
}: {
  reservations: MachineReservation[];
  selectedStart: string;
  selectedEnd: string;
}) {
  const days = buildMachineCalendarWindow(reservations, selectedStart, selectedEnd);
  const selectedStartDate = parseDate(selectedStart);
  const selectedEndDate = parseDate(selectedEnd);

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <div key={`${day}-${index}`} className="py-1">{day}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const occupied = reservations.some((reservation) => {
            const start = parseDate(reservation.startDate);
            const end = parseDate(reservation.endDate);
            return start && end && dateRangesOverlap(day, day, start, end);
          });
          const selected = selectedStartDate && selectedEndDate && dateRangesOverlap(day, day, selectedStartDate, selectedEndDate);

          return (
            <div
              key={day.toISOString()}
              className={`flex h-8 items-center justify-center rounded-md border text-[11px] font-semibold ${
                selected
                  ? 'border-sky-400 bg-sky-100 text-sky-800'
                  : occupied
                    ? 'border-amber-200 bg-amber-100 text-amber-800'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
              }`}
              title={`${formatDisplayDate(day)} ${occupied ? 'ocupado' : 'disponible'}${selected ? ' - rango elegido' : ''}`}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100 ring-1 ring-emerald-200" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 ring-1 ring-amber-200" />
          Ocupado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-100 ring-1 ring-sky-300" />
          Tu rango
        </span>
      </div>
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
