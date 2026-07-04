'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarRange, CheckCircle2, Download, Eye, Loader2, Plus, Search, XCircle } from 'lucide-react';

type PlanLine = {
  id?: string;
  phaseKey: string;
  phaseLabel: string;
  unit?: string;
  width?: number;
  heightQuantity?: number;
  enableHeight?: boolean;
  enableWidthQuantity?: boolean;
  measuredTotal?: number;
  unitPrice?: number;
  plannedAmount: number;
};

type PaymentPlan = {
  id: string;
  contractorId: string;
  productionOrderId: string;
  contractorName: string;
  jobName: string;
  totalAmount: number;
  reviewStatus?: 'submitted' | 'approved' | 'rejected' | string;
  reviewNotes?: string | null;
  estimatedSchedule?: EstimatedScheduleRow[];
  lines: PlanLine[];
};

type EstimatedScheduleRow = {
  phaseKey: string;
  phaseLabel: string;
  startDate: string;
  endDate: string;
};

type SchedulePhaseView = EstimatedScheduleRow & {
  color: string;
  label: string;
  left: number;
  width: number;
  start: Date;
  end: Date;
};

type LaborCatalogItem = {
  id: string;
  itemKey: string;
  label: string;
  unit: string;
  defaultAmount: number;
  referencePrice?: number;
  active: boolean;
  sortOrder: number;
  enableHeight?: boolean;
  enableWidthQuantity?: boolean;
};

const money = (value: number) =>
  `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tableItemHeaderClass = 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100';
const tableItemCellClass = 'bg-amber-50/80 text-zinc-900 dark:bg-amber-500/10 dark:text-zinc-100';
const tableMeasureHeaderClass = 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100';
const tableMeasureCellClass = 'bg-emerald-50 text-zinc-900 dark:bg-emerald-500/10 dark:text-zinc-100';
const tableMoneyHeaderClass = 'bg-sky-100 text-sky-950 dark:bg-sky-500/20 dark:text-sky-100';
const tableMoneyCellClass = 'bg-sky-50 text-sky-950 dark:bg-sky-500/10 dark:text-sky-100';
const DAY_MS = 24 * 60 * 60 * 1000;

const schedulePhaseColors: Record<string, string> = {
  cortado: '#3b82f6',
  corte: '#3b82f6',
  canteado: '#f59e0b',
  ensamblado: '#10b981',
  instalacion: '#8b5cf6',
  instalación: '#8b5cf6',
  entregado: '#14b8a6',
  entrega: '#14b8a6',
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readError(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const payload = data as { error?: string; detail?: string; message?: string };
    return payload.detail || payload.error || payload.message || fallback;
  }
  return fallback;
}

function statusLabel(status?: string) {
  if (status === 'approved') return 'Aprobada';
  if (status === 'rejected') return 'Rechazada';
  return 'Pendiente de revisión';
}

function statusClass(status?: string) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-800';
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('es-BO');
}

function parseScheduleDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPhaseColor(phase: EstimatedScheduleRow, index: number) {
  const key = `${phase.phaseKey} ${phase.phaseLabel}`.toLowerCase();
  const match = Object.entries(schedulePhaseColors).find(([phaseKey]) => key.includes(phaseKey));
  const fallbackColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6'];
  return match?.[1] ?? fallbackColors[index % fallbackColors.length];
}

function getScheduleView(phases?: EstimatedScheduleRow[]) {
  const rows = (phases ?? [])
    .map((phase, index) => {
      const start = parseScheduleDate(phase.startDate);
      const end = parseScheduleDate(phase.endDate);
      if (!start || !end) return null;
      return {
        ...phase,
        label: phase.phaseLabel || `Etapa ${index + 1}`,
        color: getPhaseColor(phase, index),
        start,
        end,
      };
    })
    .filter((phase): phase is Omit<SchedulePhaseView, 'left' | 'width'> => Boolean(phase));

  if (rows.length === 0) return { phases: [], days: [], start: null, end: null, totalDays: 0 };

  const start = new Date(Math.min(...rows.map((phase) => phase.start.getTime())));
  const end = new Date(Math.max(...rows.map((phase) => phase.end.getTime())));
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
  const days = Array.from({ length: totalDays }, (_, index) => new Date(start.getTime() + (index * DAY_MS)));
  const phasesWithPlacement = rows.map((phase) => {
    const offsetDays = Math.max(0, Math.round((phase.start.getTime() - start.getTime()) / DAY_MS));
    const durationDays = Math.max(1, Math.round((phase.end.getTime() - phase.start.getTime()) / DAY_MS) + 1);
    return {
      ...phase,
      left: (offsetDays / totalDays) * 100,
      width: Math.max(8, (durationDays / totalDays) * 100),
    };
  });

  return { phases: phasesWithPlacement, days, start, end, totalDays };
}

function slugifyLaborKey(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `actividad-${Date.now()}`;
}

function ScheduleTimelinePreview({ plan }: { plan: PaymentPlan | null }) {
  const view = getScheduleView(plan?.estimatedSchedule);
  const timelineWidth = `${Math.max(view.totalDays * 58, 620)}px`;

  if (view.phases.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Inicio estimado</p>
          <p className="mt-1 font-semibold">{formatDate(view.start?.toISOString().slice(0, 10))}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Fin estimado</p>
          <p className="mt-1 font-semibold">{formatDate(view.end?.toISOString().slice(0, 10))}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">Duración</p>
          <p className="mt-1 font-semibold">{view.totalDays} días</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-[#f8fafc] dark:bg-zinc-950">
        <div className="min-w-full p-4" style={{ width: timelineWidth }}>
          <div
            className="grid border-b border-border/60 text-center text-[11px] font-semibold text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${view.days.length}, minmax(48px, 1fr))` }}
          >
            {view.days.map((day) => (
              <div key={day.toISOString()} className="border-r border-border/40 px-1 pb-2 last:border-r-0">
                <p className="text-foreground">{day.toLocaleDateString('es-BO', { day: '2-digit' })}</p>
                <p className="uppercase">{day.toLocaleDateString('es-BO', { month: 'short' })}</p>
              </div>
            ))}
          </div>

          <div
            className="relative mt-4 min-h-[155px] rounded-lg bg-[linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px)]"
            style={{ backgroundSize: `${100 / Math.max(view.days.length, 1)}% 100%` }}
          >
            <div className="absolute left-0 right-0 top-3 h-7 rounded-md bg-zinc-300 px-3 text-[11px] font-semibold leading-7 text-zinc-700 shadow-sm dark:bg-zinc-700 dark:text-zinc-100">
              Tiempo estimado del contratista
            </div>
            {view.phases.map((phase, index) => (
              <div
                key={`${phase.phaseKey}-${index}`}
                className="absolute h-7 rounded-md px-2 text-[11px] font-semibold leading-7 text-white shadow-sm ring-1 ring-black/10"
                style={{
                  left: `${phase.left}%`,
                  top: `${54 + ((index % 3) * 32)}px`,
                  width: `${Math.min(phase.width, 100 - phase.left)}%`,
                  backgroundColor: phase.color,
                }}
                title={`${phase.label}: ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`}
              >
                <span className="block truncate">{phase.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.phases.map((phase, index) => (
          <div key={`summary-${phase.phaseKey}-${index}`} className="rounded-lg border border-border/70 bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: phase.color }} />
                <p className="truncate text-sm font-semibold">{phase.label}</p>
              </div>
              <Badge variant="outline">Etapa {index + 1}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium">{formatDate(phase.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fin</p>
                <p className="font-medium">{formatDate(phase.endDate)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContractorPaymentRequestsPage() {
  const { toast } = useToast();
  const apiBase = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL?.trim();
    return value ? value.replace(/\/$/, '') : '';
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [laborItems, setLaborItems] = useState<LaborCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [schedulePlan, setSchedulePlan] = useState<PaymentPlan | null>(null);
  const [rejectPlan, setRejectPlan] = useState<PaymentPlan | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityLabel, setActivityLabel] = useState('');
  const [activityUnit, setActivityUnit] = useState('ML');
  const [activityAmount, setActivityAmount] = useState('');
  const [activityEnableHeight, setActivityEnableHeight] = useState(true);
  const [activityEnableWidthQuantity, setActivityEnableWidthQuantity] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    try {
      const [plansResponse, laborResponse] = await Promise.all([
        fetch(`${apiBase}/api/contractor-finance/plans`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/labor-items?activeOnly=false`, { cache: 'no-store' }),
      ]);
      const plansData = await plansResponse.json().catch(() => null);
      const laborData = await laborResponse.json().catch(() => null);
      if (!plansResponse.ok) throw new Error(readError(plansData, 'No se pudieron cargar las solicitudes.'));
      if (!laborResponse.ok) throw new Error(readError(laborData, 'No se pudieron cargar las actividades.'));
      setPlans(plansData ?? []);
      setLaborItems(laborData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando solicitudes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [apiBase]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const searchable = [plan.contractorName, plan.jobName, plan.id, statusLabel(plan.reviewStatus)].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    });
  }, [plans, search]);

  const pendingCount = plans.filter((plan) => plan.reviewStatus !== 'approved' && plan.reviewStatus !== 'rejected').length;

  function resetActivityForm() {
    setEditingActivityId(null);
    setActivityLabel('');
    setActivityUnit('ML');
    setActivityAmount('');
    setActivityEnableHeight(true);
    setActivityEnableWidthQuantity(true);
  }

  function editActivity(item: LaborCatalogItem) {
    setEditingActivityId(item.id);
    setActivityLabel(item.label);
    setActivityUnit(item.unit || 'ML');
    setActivityAmount(String(item.referencePrice ?? item.defaultAmount));
    setActivityEnableHeight(item.enableHeight ?? true);
    setActivityEnableWidthQuantity(item.enableWidthQuantity ?? true);
  }

  async function downloadApprovedPlanPdf(plan: PaymentPlan) {
    if (plan.reviewStatus !== 'approved') return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('MOBELTECH', 14, 18);
    doc.setFontSize(11);
    doc.text('Solicitud de pago de mano de obra aprobada', 14, 26);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 34, 196, 34);

    let y = 44;
    doc.setFontSize(10);
    doc.text(`Contratista: ${plan.contractorName}`, 14, y);
    y += 6;
    doc.text(`Trabajo: ${plan.jobName}`, 14, y, { maxWidth: 178 });
    y += 8;
    doc.text(`Total aprobado: ${money(plan.totalAmount)}`, 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text('Detalle de actividades', 14, y);
    y += 7;
    doc.setFontSize(8);
    doc.text('Item', 14, y);
    doc.text('Total', 112, y, { align: 'right' });
    doc.text('P.Unit.', 144, y, { align: 'right' });
    doc.text('Parcial', 188, y, { align: 'right' });
    y += 5;
    doc.line(14, y, 196, y);
    y += 5;

    plan.lines.forEach((line, index) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${index + 1}. ${line.phaseLabel}`, 14, y, { maxWidth: 86 });
      doc.text(Number(line.measuredTotal ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 }), 112, y, { align: 'right' });
      doc.text(money(line.unitPrice ?? 0), 144, y, { align: 'right' });
      doc.text(money(line.plannedAmount), 188, y, { align: 'right' });
      y += 7;
    });

    y += 5;
    doc.setFontSize(11);
    doc.text('Cronograma estimado', 14, y);
    y += 7;
    doc.setFontSize(9);
    (plan.estimatedSchedule ?? []).forEach((phase) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${phase.phaseLabel}: ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`, 16, y);
      y += 6;
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, 14, 286);
    doc.save(`mano_obra_aprobada_${plan.id.slice(0, 8)}.pdf`);
  }

  async function reviewPlan(plan: PaymentPlan, reviewStatus: 'approved' | 'rejected', notes?: string) {
    if (reviewStatus === 'rejected' && !notes?.trim()) {
      toast({ title: 'Motivo requerido', description: 'Escribe el motivo del rechazo.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/plans/${plan.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus,
          reviewNotes: reviewStatus === 'rejected' ? notes?.trim() : null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo actualizar la solicitud.'));
      setSelectedPlan(null);
      setRejectPlan(null);
      setRejectNotes('');
      await loadData();
      toast({ title: reviewStatus === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function saveActivity() {
    if (!activityLabel.trim()) {
      toast({ title: 'Nombre requerido', description: 'Escribe la actividad.', variant: 'destructive' });
      return;
    }
    if (numberValue(activityAmount) <= 0) {
      toast({ title: 'Precio inválido', description: 'El precio debe ser mayor a 0.', variant: 'destructive' });
      return;
    }
    setSavingActivity(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/labor-items${editingActivityId ? `/${editingActivityId}` : ''}`, {
        method: editingActivityId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingActivityId ? {} : { itemKey: `${slugifyLaborKey(activityLabel)}-${Date.now().toString(36)}` }),
          label: activityLabel.trim(),
          unit: activityUnit.trim().toUpperCase() || 'UND',
          referencePrice: numberValue(activityAmount),
          defaultAmount: numberValue(activityAmount),
          enableHeight: activityEnableHeight,
          enableWidthQuantity: activityEnableWidthQuantity,
          active: 'true',
          sortOrder: editingActivityId ? laborItems.find((item) => item.id === editingActivityId)?.sortOrder ?? 0 : laborItems.length + 1,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo guardar la actividad.'));
      resetActivityForm();
      await loadData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSavingActivity(false);
    }
  }

  async function toggleActivity(item: LaborCatalogItem) {
    setSavingActivity(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/labor-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: item.active ? 'false' : 'true' }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar la actividad.');
      await loadData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar.', variant: 'destructive' });
    } finally {
      setSavingActivity(false);
    }
  }

  if (loading) {
    return <PageLoadingState title="Cargando solicitudes" description="Recuperando presupuestos de mano de obra..." />;
  }

  return (
    <AppLayout>
      <main className="space-y-5 p-4 md:p-6">
        <Card className="border-none bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(255,255,255,0.94))] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Solicitudes de pago de contratistas</h1>
              <p className="text-sm text-muted-foreground">Revisa presupuestos de mano de obra enviados por contratistas.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setActivitiesOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Actividades
              </Button>
              <Badge className="w-fit bg-amber-100 text-amber-800">{pendingCount} pendientes</Badge>
            </div>
          </div>
        </Card>

        {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

        <Card className="space-y-4 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contratista, trabajo o estado" className="pl-9" />
          </div>

          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border/70">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contratista</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trabajo / Ambiente</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total mano de obra</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No hay solicitudes para mostrar.</td></tr>
                ) : filteredPlans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{plan.contractorName}</td>
                    <td className="px-4 py-3">{plan.jobName}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{money(plan.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusClass(plan.reviewStatus)}>{statusLabel(plan.reviewStatus)}</Badge>
                      {plan.reviewStatus === 'rejected' && plan.reviewNotes ? (
                        <p className="mt-1 max-w-[260px] text-xs text-red-700">{plan.reviewNotes}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedPlan(plan)} className="gap-1.5">
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSchedulePlan(plan)} className="gap-1.5">
                          <CalendarRange className="h-4 w-4" />
                          Cronograma
                        </Button>
                        <Button variant="outline" size="sm" disabled={plan.reviewStatus !== 'approved'} onClick={() => void downloadApprovedPlanPdf(plan)} className="gap-1.5">
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" disabled={saving || plan.reviewStatus === 'approved'} onClick={() => void reviewPlan(plan, 'approved')} className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button variant="outline" size="sm" disabled={saving} onClick={() => { setRejectPlan(plan); setRejectNotes(plan.reviewNotes ?? ''); }} className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={activitiesOpen} onOpenChange={(open) => { setActivitiesOpen(open); if (!open) resetActivityForm(); }}>
          <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-none lg:w-[min(1100px,calc(100vw-3rem))]">
            <div className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b border-border/70 px-5 py-4">
                <DialogTitle>Actividades de mano de obra</DialogTitle>
                <DialogDescription>Agrega actividades con precio fijo para el formulario del contratista.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_100px_150px_220px_auto_auto] lg:items-end">
                    <div className="space-y-1.5">
                      <Label>Item</Label>
                      <Input value={activityLabel} onChange={(event) => setActivityLabel(event.target.value)} placeholder="Ej. Armado de cajonería" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unidad</Label>
                      <Input value={activityUnit} onChange={(event) => setActivityUnit(event.target.value)} placeholder="ML" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>P. unitario Bs.</Label>
                      <Input type="number" value={activityAmount} onChange={(event) => setActivityAmount(event.target.value)} placeholder="0.00" />
                    </div>
                    <div className="rounded-md border border-border/70 bg-background p-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Columnas habilitadas</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={activityEnableHeight} onChange={(event) => setActivityEnableHeight(event.target.checked)} />
                        Alto
                      </label>
                      <label className="mt-1 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={activityEnableWidthQuantity} onChange={(event) => setActivityEnableWidthQuantity(event.target.checked)} />
                        Ancho/Cantidad
                      </label>
                    </div>
                    <Button type="button" variant="outline" onClick={resetActivityForm}>Limpiar</Button>
                    <Button type="button" disabled={savingActivity} onClick={() => void saveActivity()}>
                      {savingActivity ? 'Guardando...' : editingActivityId ? 'Actualizar' : 'Agregar'}
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-md border border-border/70">
                  <table className="w-full min-w-[980px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className={`w-[34%] px-3 py-2 text-left font-semibold ${tableItemHeaderClass}`}>ITEM</th>
                        <th className={`w-[12%] px-3 py-2 text-center font-semibold ${tableItemHeaderClass}`}>UNIDAD</th>
                        <th className={`w-[18%] px-3 py-2 text-left font-semibold ${tableMeasureHeaderClass}`}>MEDIDAS</th>
                        <th className={`w-[16%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>P.UNITARIO</th>
                        <th className="w-[14%] px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="w-[16%] px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborItems.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No hay actividades creadas.</td></tr>
                      ) : laborItems.map((item) => (
                        <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                          <td className={`px-3 py-3 font-medium ${tableItemCellClass}`}><span className="block whitespace-normal leading-snug">{item.label}</span></td>
                          <td className={`px-3 py-3 text-center font-mono text-xs font-semibold ${tableItemCellClass}`}>{item.unit || 'UND'}</td>
                          <td className={`px-3 py-3 ${tableMeasureCellClass}`}>
                            <div className="flex flex-wrap gap-1">
                              {item.enableHeight ?? true ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100">Alto</Badge> : null}
                              {item.enableWidthQuantity ?? true ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100">Ancho/Cantidad</Badge> : null}
                              {!(item.enableHeight ?? true) && !(item.enableWidthQuantity ?? true) ? <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">Sin medidas</Badge> : null}
                            </div>
                          </td>
                          <td className={`px-3 py-3 text-right font-mono font-semibold ${tableMoneyCellClass}`}>{money(item.referencePrice ?? item.defaultAmount)}</td>
                          <td className="px-3 py-3">
                            <Badge className={item.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100'}>
                              {item.active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => editActivity(item)}>Editar</Button>
                              <Button variant="ghost" size="sm" disabled={savingActivity} onClick={() => void toggleActivity(item)}>
                                {item.active ? 'Desactivar' : 'Activar'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedPlan} onOpenChange={(open) => { if (!open) setSelectedPlan(null); }}>
          <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-none lg:w-[min(1180px,calc(100vw-3rem))]">
            <div className="flex max-h-[88vh] flex-col">
              <DialogHeader className="border-b border-border/70 px-5 py-4">
                <DialogTitle>Detalle de solicitud</DialogTitle>
                <DialogDescription>{selectedPlan?.contractorName} · {selectedPlan?.jobName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto px-5 py-4">
                <div className="overflow-x-auto rounded-md border border-border/70">
                  <table className="w-full min-w-[1040px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className="w-12 px-2 py-2 text-center font-semibold text-muted-foreground">No</th>
                        <th className={`w-[34%] px-3 py-2 text-left font-semibold ${tableItemHeaderClass}`}>ITEM</th>
                        <th className={`w-[8%] px-3 py-2 text-center font-semibold ${tableItemHeaderClass}`}>UNIDAD</th>
                        <th className={`w-[9%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>Alto</th>
                        <th className={`w-[11%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>Ancho/Cantidad</th>
                        <th className={`w-[11%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>TOTAL</th>
                        <th className={`w-[13%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>P.UNITARIO</th>
                        <th className={`w-[14%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>P.PARCIAL (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlan?.lines.map((line, index) => (
                        <tr key={line.id ?? line.phaseKey} className="border-b border-border/60 last:border-b-0">
                          <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                          <td className={`px-3 py-2 font-medium ${tableItemCellClass}`}><span className="block whitespace-normal leading-snug">{line.phaseLabel}</span></td>
                          <td className={`px-3 py-2 text-center font-mono text-xs font-semibold ${tableItemCellClass}`}>{line.unit || 'UND'}</td>
                          <td className={`px-3 py-2 text-right font-mono ${tableMeasureCellClass}`}>{line.enableHeight === false ? 'N/A' : Number(line.width ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className={`px-3 py-2 text-right font-mono ${tableMeasureCellClass}`}>{line.enableWidthQuantity === false ? 'N/A' : Number(line.heightQuantity ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${tableMoneyCellClass}`}>{Number(line.measuredTotal ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className={`px-3 py-2 text-right font-mono ${tableMoneyCellClass}`}>{money(line.unitPrice ?? 0)}</td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${tableMoneyCellClass}`}>{money(line.plannedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 dark:bg-sky-500/10 dark:text-sky-100 sm:min-w-72">
                  <span>Total solicitud</span>
                  <span className="font-mono">{money(selectedPlan?.totalAmount ?? 0)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => selectedPlan ? setSchedulePlan(selectedPlan) : undefined} className="gap-2">
                    <CalendarRange className="h-4 w-4" />
                    Cronograma
                  </Button>
                  <Button variant="outline" disabled={selectedPlan?.reviewStatus !== 'approved'} onClick={() => selectedPlan ? void downloadApprovedPlanPdf(selectedPlan) : undefined} className="gap-2">
                    <Download className="h-4 w-4" />
                    PDF aprobado
                  </Button>
                  <Button variant="outline" disabled={saving || selectedPlan?.reviewStatus === 'approved'} onClick={() => selectedPlan ? reviewPlan(selectedPlan, 'approved') : undefined}>Aprobar</Button>
                  <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={saving} onClick={() => { if (selectedPlan) setRejectPlan(selectedPlan); }}>
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!schedulePlan} onOpenChange={(open) => { if (!open) setSchedulePlan(null); }}>
          <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-0">
            <DialogHeader>
              <div className="border-b border-border/70 px-5 py-4">
                <DialogTitle>Cronograma estimado del contratista</DialogTitle>
                <DialogDescription>{schedulePlan?.contractorName} · {schedulePlan?.jobName}</DialogDescription>
              </div>
            </DialogHeader>
            <div className="max-h-[74vh] overflow-y-auto px-5 py-4">
              {(schedulePlan?.estimatedSchedule?.length ?? 0) === 0 ? (
                <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  Esta solicitud no tiene cronograma estimado registrado.
                </Card>
              ) : (
                <ScheduleTimelinePreview plan={schedulePlan} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejectPlan} onOpenChange={(open) => { if (!open) { setRejectPlan(null); setRejectNotes(''); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Rechazar solicitud</DialogTitle>
              <DialogDescription>El comentario será visible para que el contratista corrija y reenvíe.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} placeholder="Motivo del rechazo..." className="min-h-28" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectPlan(null); setRejectNotes(''); }}>Cancelar</Button>
                <Button disabled={saving} onClick={() => rejectPlan ? reviewPlan(rejectPlan, 'rejected', rejectNotes) : undefined}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Rechazar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}
