'use client';

import { useState, useMemo } from 'react';
import { PROJECT_SCHEDULES } from '@/lib/mock-data';
import { ProjectSchedule } from '@/lib/types';
import { Card } from '@/components/ui/card';

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

export function GanttSchedule() {
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>(''); // 'corte' | 'canteado' | 'ensamblado' | 'instalacion' | 'entrega' | ''

  // Ensure client-only rendering
  useMemo(() => {
    setIsClient(true);
    if (!selectedMonth) {
      setSelectedMonth(new Date(2026, 2, 1));
    }
  }, []);

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

  // Don't render on server to avoid hydration mismatch
  if (!isClient || !selectedMonth) {
    return <div className="space-y-6 min-h-96 bg-muted/20 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cronograma de Producción</h2>
            <p className="text-sm text-muted-foreground">Vista Gantt con cronograma tentativo vs real</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
              className="px-3 py-2 text-sm border rounded hover:bg-muted"
            >
              ← Anterior
            </button>
            <span className="font-semibold min-w-56 text-center">
              {selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              {' – '}
              {new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
              className="px-3 py-2 text-sm border rounded hover:bg-muted"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
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
      </div>

      {/* Gantt Container */}
      <div className="overflow-x-auto border border-border rounded-lg bg-background">
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
                className="border-r border-border p-2 text-center font-semibold text-xs bg-muted/50 flex-shrink-0"
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
                  className={`border-r border-border p-1 text-center flex-shrink-0 ${!day.isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
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
                            className="h-2 bg-gray-300 border border-gray-400 opacity-60 rounded-sm flex-shrink-0"
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
                              className="h-2 rounded-sm flex-shrink-0"
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
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Leyenda de Fases</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
    </div>
  );
}
