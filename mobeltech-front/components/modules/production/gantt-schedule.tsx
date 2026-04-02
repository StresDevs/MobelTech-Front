'use client';

import { useEffect, useMemo, useState } from 'react';
import { PROJECT_SCHEDULES } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { useRole } from '@/hooks/use-role-context';
import { jsPDF } from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PHASE_COLORS = {
  corte: '#10b981',      // Verde
  canteado: '#ef4444',   // Rojo
  ensamblado: '#f59e0b', // Naranja
  instalacion: '#8b5cf6', // Lila
  entrega: '#06b6d4',    // Celeste
};

const PHASE_LABELS = {
  corte: 'Corte',
  canteado: 'Canteado',
  ensamblado: 'Ensamblado',
  instalacion: 'Instalación',
  entrega: 'Entrega',
};

interface DayInfo {
  date: Date;
  week: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
}

type ScheduleItem = (typeof PROJECT_SCHEDULES)[number];

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function GanttSchedule() {
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>(''); // 'corte' | 'canteado' | 'ensamblado' | 'instalacion' | 'entrega' | ''
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [calendarModalProjectId, setCalendarModalProjectId] = useState<string | null>(null);
  const { currentRole } = useRole();

  const isAdmin = currentRole === 'admin';

  // Ensure client-only rendering
  useEffect(() => {
    setIsClient(true);
    if (!selectedMonth) {
      setSelectedMonth(new Date(2026, 2, 1));
    }
  }, [selectedMonth]);

  // Get unique clients and contractors
  const { uniqueClients, uniqueContractors } = useMemo(() => {
    const clients = new Set<string>();
    const contractors = new Set<string>();
    PROJECT_SCHEDULES.forEach((schedule) => {
      clients.add(schedule.clientName);
      contractors.add(schedule.contractorName);
    });
    return {
      uniqueClients: Array.from(clients).sort(),
      uniqueContractors: Array.from(contractors).sort(),
    };
  }, []);

  // Filter schedules based on selected filters
  const filteredSchedules = useMemo(() => {
    return PROJECT_SCHEDULES.filter((schedule) => {
      const clientMatch = !filterClient || schedule.clientName === filterClient;
      const contractorMatch = !filterContractor || schedule.contractorName === filterContractor;

      // Machine filter only applies to corte and canteado phases
      let phaseMatch = true;
      if (filterPhase) {
        if (filterPhase === 'corte') {
          phaseMatch = schedule.phases.some((p) => p.phase === 'corte');
        } else if (filterPhase === 'corte-2') {
          phaseMatch = schedule.phases.some((p) => p.phase === 'corte');
        } else if (filterPhase === 'canteado') {
          phaseMatch = schedule.phases.some((p) => p.phase === 'canteado');
        } else if (filterPhase === 'canteado-2') {
          phaseMatch = schedule.phases.some((p) => p.phase === 'canteado');
        }
      }

      return clientMatch && contractorMatch && phaseMatch;
    });
  }, [filterClient, filterContractor, filterPhase]);

  // Generate calendar grid - two full months
  const calendarDays = useMemo(() => {
    if (!selectedMonth) return [];

    const days: DayInfo[] = [];
    let globalWeek = 1;

    // ── Month 1 ──
    const year1 = selectedMonth.getFullYear();
    const month1 = selectedMonth.getMonth();
    const firstDay1 = new Date(year1, month1, 1).getDay();
    const daysInMonth1 = new Date(year1, month1 + 1, 0).getDate();
    const daysInPrevMonth = new Date(year1, month1, 0).getDate();

    // Trailing days from the previous month (to fill first week row)
    for (let i = firstDay1 - 1; i >= 0; i--) {
      days.push({
        date: new Date(year1, month1 - 1, daysInPrevMonth - i),
        week: globalWeek,
        dayOfWeek: (firstDay1 - 1 - i) % 7,
        isCurrentMonth: false,
      });
    }

    // All days of month 1
    for (let i = 1; i <= daysInMonth1; i++) {
      const weekNumber = Math.floor((i + firstDay1 - 1) / 7) + 1;
      days.push({
        date: new Date(year1, month1, i),
        week: weekNumber,
        dayOfWeek: (i + firstDay1 - 1) % 7,
        isCurrentMonth: true,
      });
    }

    // How many weeks did month 1 occupy?
    const weeksInMonth1 = Math.ceil((daysInMonth1 + firstDay1) / 7);
    globalWeek = weeksInMonth1 + 1;

    // ── Month 2 ──
    const month2Date = new Date(year1, month1 + 1, 1);
    const year2 = month2Date.getFullYear();
    const month2 = month2Date.getMonth();
    const firstDay2 = new Date(year2, month2, 1).getDay();
    const daysInMonth2 = new Date(year2, month2 + 1, 0).getDate();

    // If month 2 starts mid-week we DON'T add trailing filler; we start a fresh week row
    // to keep months visually separated while still aligning to the same grid.
    for (let i = 1; i <= daysInMonth2; i++) {
      const weekInMonth2 = Math.floor((i + firstDay2 - 1) / 7) + 1;
      days.push({
        date: new Date(year2, month2, i),
        week: weeksInMonth1 + weekInMonth2,
        dayOfWeek: (i + firstDay2 - 1) % 7,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [selectedMonth]);

  // Group days by week (no cap — two months)
  const weeks = useMemo(() => {
    if (!selectedMonth) return [];
    const grouped: { [key: number]: DayInfo[] } = {};
    calendarDays.forEach((day) => {
      if (!grouped[day.week]) grouped[day.week] = [];
      grouped[day.week].push(day);
    });
    return Object.values(grouped);
  }, [calendarDays, selectedMonth]);

  const monthStart = selectedMonth ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1) : null;
  // Extend the visible range to cover two months
  const monthEnd = selectedMonth ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 2, 0) : null;

  const getPhaseWidth = (startDate: Date, endDate: Date) => {
    if (!monthStart || !monthEnd) return 0;
    const start = Math.max(startDate.getTime(), monthStart.getTime());
    const end = Math.min(endDate.getTime(), monthEnd.getTime());
    const phaseDays = (end - start) / (1000 * 60 * 60 * 24);
    const totalDays = (monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.round((phaseDays / totalDays) * 100 * 10000) / 10000; // Round to 4 decimals
  };

  const getPhaseOffset = (startDate: Date) => {
    if (!monthStart || !monthEnd) return 0;
    const offset = Math.max(0, (startDate.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = (monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.round((offset / totalDays) * 100 * 10000) / 10000; // Round to 4 decimals
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No definido';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const formatDateLong = (date?: Date) => {
    if (!date) return 'No definido';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDaysBetween = (start: Date, end: Date) => {
    return Math.max(1, Math.floor((normalizeDate(end).getTime() - normalizeDate(start).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const getEstimatedTimeline = (schedule: ScheduleItem) => {
    const start = schedule.phases.reduce(
      (min, phase) => (phase.plannedStart < min ? phase.plannedStart : min),
      schedule.phases[0].plannedStart
    );
    const end = schedule.phases.reduce(
      (max, phase) => (phase.plannedEnd > max ? phase.plannedEnd : max),
      schedule.phases[0].plannedEnd
    );

    return {
      start,
      end,
      days: getDaysBetween(start, end),
    };
  };

  const getActualTimeline = (schedule: ScheduleItem) => {
    const phasesWithActual = schedule.phases.filter((phase) => phase.actualStart);

    if (phasesWithActual.length === 0) {
      return null;
    }

    const start = phasesWithActual.reduce(
      (min, phase) => (phase.actualStart! < min ? phase.actualStart! : min),
      phasesWithActual[0].actualStart!
    );
    const end = phasesWithActual.reduce(
      (max, phase) => ((phase.actualEnd || new Date()) > max ? (phase.actualEnd || new Date()) : max),
      phasesWithActual[0].actualEnd || new Date()
    );

    return {
      start,
      end,
      days: getDaysBetween(start, end),
    };
  };

  const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const isDateInRange = (date: Date, start: Date, end: Date) => {
    const current = normalizeDate(date).getTime();
    const startTime = normalizeDate(start).getTime();
    const endTime = normalizeDate(end).getTime();
    return current >= startTime && current <= endTime;
  };

  const getMonthCalendarDays = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = firstDayWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    const remainder = days.length % 7;
    const trailingDays = remainder === 0 ? 0 : 7 - remainder;

    for (let day = 1; day <= trailingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getCalendarPhaseMarkers = (schedule: ScheduleItem, date: Date) => {
    const planned = schedule.phases
      .filter((phase) => isDateInRange(date, phase.plannedStart, phase.plannedEnd))
      .map((phase) => phase.phase);

    const actual = schedule.phases
      .filter((phase) => phase.actualStart && isDateInRange(date, phase.actualStart, phase.actualEnd || new Date()))
      .map((phase) => phase.phase);

    return {
      planned,
      actual,
    };
  };

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    const fullHex = normalized.length === 3
      ? normalized.split('').map((char) => `${char}${char}`).join('')
      : normalized;

    return {
      r: Number.parseInt(fullHex.slice(0, 2), 16),
      g: Number.parseInt(fullHex.slice(2, 4), 16),
      b: Number.parseInt(fullHex.slice(4, 6), 16),
    };
  };

  const drawMonthCalendarInPdf = (
    doc: jsPDF,
    schedule: ScheduleItem,
    monthDate: Date,
    originX: number,
    originY: number,
    width: number
  ) => {
    const monthDays = getMonthCalendarDays(monthDate);
    const cellWidth = width / 7;
    const cellHeight = 8;

    doc.setFontSize(11);
    doc.text(monthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }), originX, originY);

    let y = originY + 5;
    doc.setFontSize(7);
    WEEKDAY_LABELS.forEach((weekday, idx) => {
      doc.text(weekday, originX + idx * cellWidth + 1.5, y);
    });

    y += 2;
    monthDays.forEach((day, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = originX + col * cellWidth;
      const dayY = y + row * cellHeight;

      if (!day.isCurrentMonth) {
        doc.setFillColor(243, 244, 246);
        doc.rect(x, dayY, cellWidth, cellHeight, 'F');
      }

      doc.setDrawColor(229, 231, 235);
      doc.rect(x, dayY, cellWidth, cellHeight);

      doc.setTextColor(day.isCurrentMonth ? 17 : 156, day.isCurrentMonth ? 24 : 163, day.isCurrentMonth ? 39 : 175);
      doc.setFontSize(7);
      doc.text(String(day.date.getDate()), x + 1, dayY + 2.8);

      const markers = getCalendarPhaseMarkers(schedule, day.date);
      let markerX = x + 1;
      const markerY = dayY + 5.6;

      markers.actual.slice(0, 2).forEach((phaseKey) => {
        const { r, g, b } = hexToRgb(PHASE_COLORS[phaseKey as keyof typeof PHASE_COLORS]);
        doc.setFillColor(r, g, b);
        doc.circle(markerX, markerY, 0.8, 'F');
        markerX += 2.2;
      });

      markers.planned.slice(0, 2).forEach(() => {
        doc.setFillColor(209, 213, 219);
        doc.circle(markerX, markerY, 0.8, 'F');
        markerX += 2.2;
      });
    });

    doc.setTextColor(17, 24, 39);
  };

  const handleProjectPdfDownload = (schedule: ScheduleItem) => {
    if (!selectedMonth) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const estimatedTimeline = getEstimatedTimeline(schedule);
    const actualTimeline = getActualTimeline(schedule);

    const monthOne = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthTwo = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);

    doc.setFontSize(16);
    doc.text('Cronograma de Produccion', 12, 12);

    doc.setFontSize(10);
    doc.text(`Mueble: ${schedule.furnitureName}`, 12, 19);
    doc.text(`Cliente: ${schedule.clientName}`, 12, 24);
    doc.text(`Contratista: ${schedule.contractorName}`, 12, 29);

    doc.text(
      `Tiempo estimado: ${estimatedTimeline.days} dias de la fecha ${formatDateLong(estimatedTimeline.start)} a la fecha ${formatDateLong(estimatedTimeline.end)}.`,
      12,
      36
    );
    doc.text(
      `Tiempo de produccion: ${actualTimeline
        ? `${actualTimeline.days} dias de la fecha ${formatDateLong(actualTimeline.start)} a la fecha ${formatDateLong(actualTimeline.end)} (real segun fases).`
        : 'Aun no hay fechas reales registradas en las fases.'}`,
      12,
      41
    );

    drawMonthCalendarInPdf(doc, schedule, monthOne, 12, 50, 132);
    drawMonthCalendarInPdf(doc, schedule, monthTwo, 152, 50, 132);

    doc.setFontSize(11);
    doc.text('Fechas del contratista por fase', 12, 110);

    let phaseY = 116;
    schedule.phases.forEach((phase) => {
      const { r, g, b } = hexToRgb(PHASE_COLORS[phase.phase as keyof typeof PHASE_COLORS]);
      doc.setFillColor(r, g, b);
      doc.circle(14, phaseY - 1.2, 1.1, 'F');

      doc.setTextColor(r, g, b);
      doc.setFontSize(10);
      doc.text(`${PHASE_LABELS[phase.phase]}:`, 17, phaseY);

      doc.setTextColor(17, 24, 39);
      doc.text(
        phase.actualStart
          ? `${formatDate(phase.actualStart)} - ${formatDate(phase.actualEnd)}`
          : 'Sin fechas reales cargadas',
        48,
        phaseY
      );

      phaseY += 6;
    });

    const safeName = schedule.furnitureName.replace(/[^a-zA-Z0-9-_]+/g, '_');
    const monthLabel = selectedMonth.toLocaleString('es-ES', { month: 'short', year: 'numeric' }).replace(/\s+/g, '_');
    doc.save(`cronograma_${safeName}_${monthLabel}.pdf`);
  };

  const scheduleForCalendar = useMemo(
    () => PROJECT_SCHEDULES.find((schedule) => schedule.projectId === calendarModalProjectId) || null,
    [calendarModalProjectId]
  );

  const openCalendarModal = (projectId: string) => {
    setCalendarModalProjectId(projectId);
  };

  const closeCalendarModal = () => {
    setCalendarModalProjectId(null);
  };

  const filterControls = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg print:hidden">
      <div>
        <label className="text-sm font-semibold block mb-2">Cliente</label>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los clientes</option>
          {uniqueClients.map((client) => (
            <option key={client} value={client}>
              {client}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">Contratista</label>
        <select
          value={filterContractor}
          onChange={(e) => setFilterContractor(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los contratistas</option>
          {uniqueContractors.map((contractor) => (
            <option key={contractor} value={contractor}>
              {contractor}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">Máquina/Proceso</label>
        <select
          value={filterPhase}
          onChange={(e) => setFilterPhase(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los procesos</option>
          <option value="corte">Corte (Maquina 1)</option>
          <option value="corte-2">Corte (Maquina 2)</option>
          <option value="canteado">Canteado (Maquina 1)</option>
          <option value="canteado-2">Canteado (Maquina 2)</option>
        </select>
      </div>
    </div>
  );

  // Don't render on server to avoid hydration mismatch
  if (!isClient || !selectedMonth) {
    return <div className="space-y-6 min-h-96 bg-muted/20 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6 gantt-print-scope">
      {/* Header with month selector */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Cronograma de Producción</h2>
            <p className="text-sm text-muted-foreground">Vista Gantt con cronograma tentativo vs real</p>
          </div>
          <div className="flex flex-col gap-3 w-full lg:w-auto print:hidden">
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-center text-sm font-semibold">
              {selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              {' – '}
              {new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                className="px-3 py-2 text-sm border rounded hover:bg-muted"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                className="px-3 py-2 text-sm border rounded hover:bg-muted"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="hidden lg:block">{filterControls}</div>

        <div className="lg:hidden print:hidden">
          <button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="w-full px-3 py-2 text-sm border rounded hover:bg-muted"
          >
            {showMobileFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
          {showMobileFilters && <div className="mt-3">{filterControls}</div>}
        </div>
      </div>

      {/* Mobile/Tablet Adapted View */}
      <div className="space-y-4 lg:hidden print:hidden">
        {filteredSchedules.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground border border-border rounded-lg bg-background">
            No hay cronogramas que coincidan con los filtros seleccionados
          </div>
        ) : (
          filteredSchedules.map((schedule) => (
            <Card key={`mobile-${schedule.projectId}`} className="p-4 space-y-4">
              {(() => {
                const estimatedTimeline = getEstimatedTimeline(schedule);
                const actualTimeline = getActualTimeline(schedule);

                return (
                  <>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm md:text-base">{schedule.furnitureName}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Cliente: {schedule.clientName}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Contratista: {schedule.contractorName}</p>
              </div>

              <div className="border border-border rounded-md p-3 bg-muted/10">
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Tiempo estimado:</span>{' '}
                    {estimatedTimeline.days} dias de la fecha {formatDateLong(estimatedTimeline.start)} a la fecha {formatDateLong(estimatedTimeline.end)}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Tiempo de produccion:</span>{' '}
                    {actualTimeline
                      ? `${actualTimeline.days} dias de la fecha ${formatDateLong(actualTimeline.start)} a la fecha ${formatDateLong(actualTimeline.end)} (real segun fases).`
                      : 'Aun no hay fechas reales registradas en las fases.'}
                  </p>
                </div>
                <button
                  onClick={() => openCalendarModal(schedule.projectId)}
                  className="w-full px-3 py-2 text-xs border rounded hover:bg-muted"
                >
                  Ver calendario detallado (2 meses)
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleProjectPdfDownload(schedule)}
                    className="w-full px-3 py-2 mt-2 text-xs border rounded hover:bg-muted"
                  >
                    Descargar PDF de este proyecto
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {schedule.phases.map((phase) => {
                  return (
                    <div key={`mobile-phase-${schedule.projectId}-${phase.phase}`} className="border border-border rounded-md p-2 bg-background">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded"
                            style={{ backgroundColor: PHASE_COLORS[phase.phase as keyof typeof PHASE_COLORS] }}
                          />
                          <span className="text-sm font-medium">{PHASE_LABELS[phase.phase]}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(phase.plannedStart)} - {formatDate(phase.plannedEnd)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Real: {phase.actualStart ? `${formatDate(phase.actualStart)} - ${formatDate(phase.actualEnd)}` : 'Sin iniciar'}
                      </div>
                    </div>
                  );
                })}
              </div>
                  </>
                );
              })()}
            </Card>
          ))
        )}
      </div>

      {/* Desktop Gantt Container */}
      <div className="hidden lg:block print:block overflow-x-auto border border-border rounded-lg bg-background gantt-print-wrapper">
        <div className="min-w-full">
          {/* Header */}
          <div className="flex border-b border-border bg-muted/30">
            {/* Left columns */}
            <div className="border-r border-border p-2 font-semibold min-w-32">Mueble</div>
            <div className="border-r border-border p-2 font-semibold min-w-32">Cliente</div>
            <div className="border-r border-border p-2 font-semibold min-w-32">Contratista</div>

            {/* Weeks header */}
            {weeks.map((week, idx) => (
              <div
                key={`week-${idx}`}
                className="border-r border-border p-2 text-center font-semibold text-xs bg-muted/50 shrink-0"
                style={{ width: `${(100 / calendarDays.length) * week.length}%` }}
              >
                S{idx + 1}
              </div>
            ))}
          </div>

          {/* Days header */}
          <div className="flex border-b border-border bg-muted/20 text-xs">
            <div className="border-r border-border min-w-32" style={{ width: '96px' }}></div>
            <div className="border-r border-border min-w-32" style={{ width: '96px' }}></div>
            <div className="border-r border-border min-w-32" style={{ width: '96px' }}></div>

            {weeks.map((week, weekIdx) =>
              week.map((day, dayIdx) => (
                <div
                  key={`day-${weekIdx}-${dayIdx}`}
                  className={`border-r border-border p-1 text-center shrink-0 ${!day.isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
                    }`}
                  style={{ width: `${100 / calendarDays.length}%` }}
                >
                  {day.isCurrentMonth ? day.date.getDate() : ''}
                </div>
              ))
            )}
          </div>

          {/* Body - Schedule rows */}
          {filteredSchedules.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No hay cronogramas que coincidan con los filtros seleccionados
            </div>
          ) : (
            filteredSchedules.map((schedule, scheduleIdx) => (
              <div key={schedule.projectId}>
                {/* Combined Planned and Actual timeline row */}
                <div className="flex border-b border-border hover:bg-muted/30 h-12">
                  {scheduleIdx === 0 ? (
                    <>
                      <div className="border-r border-border p-1 font-semibold text-xs bg-muted/10 min-w-32 overflow-hidden flex items-center">
                        {schedule.furnitureName}
                      </div>
                      <div className="border-r border-border p-1 text-xs bg-muted/10 min-w-32 overflow-hidden flex items-center">
                        {schedule.clientName}
                      </div>
                      <div className="border-r border-border p-1 text-xs bg-muted/10 min-w-32 overflow-hidden flex items-center">
                        {schedule.contractorName}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-r border-border min-w-32"></div>
                      <div className="border-r border-border min-w-32"></div>
                      <div className="border-r border-border min-w-32"></div>
                    </>
                  )}

                  {/* Container for both planned and actual bars */}
                  <div className="flex-1 relative ml-4">
                    {/* Planned bars - top */}
                    <div className="absolute top-1 left-0 right-0 flex items-center h-2">
                      {schedule.phases.map((phase, idx) => {
                        const width = getPhaseWidth(phase.plannedStart, phase.plannedEnd);
                        const offset = idx === 0 ? getPhaseOffset(phase.plannedStart) : 0;

                        return (
                          <div
                            key={`planned-${phase.phase}`}
                            className="h-2 bg-gray-300 border border-gray-400 opacity-60 rounded-sm shrink-0"
                            suppressHydrationWarning
                            style={{
                              width: `calc(${width}%)`,
                              marginLeft: idx === 0 ? `calc(${offset}%)` : '1px',
                            }}
                            title={`${PHASE_LABELS[phase.phase]} (Planeado)`}
                          />
                        );
                      })}
                    </div>

                    {/* Actual bars - bottom */}
                    <div className="absolute bottom-1 left-0 right-0 flex items-center h-2">
                      {schedule.phases
                        .filter((p) => p.actualStart)
                        .map((phase, idx) => {
                          const width = getPhaseWidth(
                            phase.actualStart!,
                            phase.actualEnd || new Date()
                          );
                          const offset = idx === 0 ? getPhaseOffset(phase.actualStart!) : 0;

                          return (
                            <div
                              key={`actual-${phase.phase}`}
                              className="h-2 rounded-sm shrink-0"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: PHASE_COLORS[phase.phase as keyof typeof PHASE_COLORS],
                                width: `calc(${width}%)`,
                                marginLeft: idx === 0 ? `calc(${offset}%)` : '1px',
                              }}
                              title={`${PHASE_LABELS[phase.phase]} (Real)`}
                            />
                          );
                        })}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex border-b border-border bg-muted/5 print:hidden">
                    <div className="border-r border-border p-1 text-xs font-semibold min-w-32 flex items-center">Exportar</div>
                    <div className="border-r border-border min-w-32"></div>
                    <div className="border-r border-border min-w-32"></div>
                    <div className="flex-1 p-2">
                      <button
                        onClick={() => handleProjectPdfDownload(schedule)}
                        className="px-3 py-1 text-xs border rounded hover:bg-muted"
                      >
                        Descargar PDF de este proyecto
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Leyenda de Fases</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(PHASE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ backgroundColor: PHASE_COLORS[key as keyof typeof PHASE_COLORS] }}
              />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

      </Card>

      <Dialog open={Boolean(calendarModalProjectId)} onOpenChange={(open) => !open && closeCalendarModal()}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendario detallado del contratista</DialogTitle>
            <DialogDescription>
              {scheduleForCalendar
                ? `${scheduleForCalendar.furnitureName} · ${scheduleForCalendar.contractorName}`
                : 'Visualización de cronograma por dos meses.'}
            </DialogDescription>
          </DialogHeader>

          {scheduleForCalendar && selectedMonth && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((monthOffset) => {
                  const monthDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + monthOffset, 1);
                  const monthDays = getMonthCalendarDays(monthDate);

                  return (
                    <div key={`modal-month-${monthOffset}`} className="border border-border rounded-lg p-3">
                      <h4 className="font-semibold text-sm mb-3 capitalize">
                        {monthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                      </h4>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAY_LABELS.map((weekday) => (
                          <div key={`weekday-${monthOffset}-${weekday}`} className="text-[10px] text-center text-muted-foreground font-medium">
                            {weekday}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((day, dayIdx) => {
                          const markers = getCalendarPhaseMarkers(scheduleForCalendar, day.date);

                          return (
                            <div
                              key={`modal-day-${monthOffset}-${dayIdx}`}
                              className={`min-h-14 rounded-md border p-1 ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/20 text-muted-foreground'}`}
                            >
                              <p className="text-[10px] font-medium">{day.date.getDate()}</p>

                              <div className="mt-1 flex flex-wrap gap-1">
                                {markers.actual.slice(0, 2).map((phaseKey) => (
                                  <span
                                    key={`actual-marker-${monthOffset}-${dayIdx}-${phaseKey}`}
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ backgroundColor: PHASE_COLORS[phaseKey as keyof typeof PHASE_COLORS] }}
                                    title={`${PHASE_LABELS[phaseKey as keyof typeof PHASE_LABELS]} (Real)`}
                                  />
                                ))}
                                {markers.planned.slice(0, 2).map((phaseKey) => (
                                  <span
                                    key={`planned-marker-${monthOffset}-${dayIdx}-${phaseKey}`}
                                    className="inline-block w-2 h-2 rounded-full border border-gray-400 bg-gray-300"
                                    title={`${PHASE_LABELS[phaseKey as keyof typeof PHASE_LABELS]} (Planeado)`}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border border-border rounded-lg p-3 bg-muted/10">
                <h4 className="text-sm font-semibold mb-2">Fechas del contratista por fase</h4>
                <div className="space-y-1">
                  {scheduleForCalendar.phases.map((phase) => (
                    <div key={`modal-phase-dates-${phase.phase}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PHASE_COLORS[phase.phase as keyof typeof PHASE_COLORS] }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: PHASE_COLORS[phase.phase as keyof typeof PHASE_COLORS] }}
                      >
                        {PHASE_LABELS[phase.phase]}:
                      </span>
                      <span>
                        {phase.actualStart
                          ? `${formatDate(phase.actualStart)} - ${formatDate(phase.actualEnd)}`
                          : 'Sin fechas reales cargadas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
