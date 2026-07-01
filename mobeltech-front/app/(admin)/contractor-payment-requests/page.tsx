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
import { CheckCircle2, Eye, Loader2, Plus, Search, XCircle } from 'lucide-react';

type PlanLine = {
  id?: string;
  phaseKey: string;
  phaseLabel: string;
  unit?: string;
  width?: number;
  heightQuantity?: number;
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
  lines: PlanLine[];
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
};

const money = (value: number) =>
  `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

function slugifyLaborKey(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `actividad-${Date.now()}`;
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
  const [rejectPlan, setRejectPlan] = useState<PaymentPlan | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityLabel, setActivityLabel] = useState('');
  const [activityUnit, setActivityUnit] = useState('ML');
  const [activityAmount, setActivityAmount] = useState('');
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
  }

  function editActivity(item: LaborCatalogItem) {
    setEditingActivityId(item.id);
    setActivityLabel(item.label);
    setActivityUnit(item.unit || 'ML');
    setActivityAmount(String(item.referencePrice ?? item.defaultAmount));
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
                  <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_120px_170px_auto_auto] lg:items-end">
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
                    <Button type="button" variant="outline" onClick={resetActivityForm}>Limpiar</Button>
                    <Button type="button" disabled={savingActivity} onClick={() => void saveActivity()}>
                      {savingActivity ? 'Guardando...' : editingActivityId ? 'Actualizar' : 'Agregar'}
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-md border border-border/70">
                  <table className="w-full min-w-[860px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className="w-[36%] bg-amber-100 px-3 py-2 text-left font-semibold text-amber-950">ITEM</th>
                        <th className="w-[14%] bg-amber-100 px-3 py-2 text-center font-semibold text-amber-950">UNIDAD</th>
                        <th className="w-[18%] bg-sky-100 px-3 py-2 text-right font-semibold text-sky-950">P.UNITARIO</th>
                        <th className="w-[14%] px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="w-[18%] px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborItems.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No hay actividades creadas.</td></tr>
                      ) : laborItems.map((item) => (
                        <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                          <td className="truncate bg-amber-50/80 px-3 py-3 font-medium">{item.label}</td>
                          <td className="bg-amber-50/80 px-3 py-3 text-center font-mono text-xs font-semibold">{item.unit || 'UND'}</td>
                          <td className="bg-sky-50 px-3 py-3 text-right font-mono font-semibold">{money(item.referencePrice ?? item.defaultAmount)}</td>
                          <td className="px-3 py-3">
                            <Badge className={item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'}>
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
                        <th className="w-[28%] bg-amber-100 px-3 py-2 text-left font-semibold text-amber-950">ITEM</th>
                        <th className="w-[10%] bg-amber-100 px-3 py-2 text-center font-semibold text-amber-950">UNIDAD</th>
                        <th className="w-[10%] bg-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">Alto</th>
                        <th className="w-[14%] bg-emerald-100 px-3 py-2 text-right font-semibold text-emerald-950">Ancho/Cantidad</th>
                        <th className="w-[11%] bg-sky-100 px-3 py-2 text-right font-semibold text-sky-950">TOTAL</th>
                        <th className="w-[13%] bg-sky-100 px-3 py-2 text-right font-semibold text-sky-950">P.UNITARIO</th>
                        <th className="w-[14%] bg-sky-100 px-3 py-2 text-right font-semibold text-sky-950">P.PARCIAL (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlan?.lines.map((line, index) => (
                        <tr key={line.id ?? line.phaseKey} className="border-b border-border/60 last:border-b-0">
                          <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                          <td className="truncate bg-amber-50/80 px-3 py-2 font-medium">{line.phaseLabel}</td>
                          <td className="bg-amber-50/80 px-3 py-2 text-center font-mono text-xs font-semibold">{line.unit || 'UND'}</td>
                          <td className="bg-emerald-50 px-3 py-2 text-right font-mono">{Number(line.width ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className="bg-emerald-50 px-3 py-2 text-right font-mono">{Number(line.heightQuantity ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className="bg-sky-50 px-3 py-2 text-right font-mono font-semibold">{Number(line.measuredTotal ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 })}</td>
                          <td className="bg-sky-50 px-3 py-2 text-right font-mono">{money(line.unitPrice ?? 0)}</td>
                          <td className="bg-sky-50 px-3 py-2 text-right font-mono font-semibold">{money(line.plannedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 sm:min-w-72">
                  <span>Total solicitud</span>
                  <span className="font-mono">{money(selectedPlan?.totalAmount ?? 0)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={saving || selectedPlan?.reviewStatus === 'approved'} onClick={() => selectedPlan ? reviewPlan(selectedPlan, 'approved') : undefined}>Aprobar</Button>
                  <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={saving} onClick={() => { if (selectedPlan) setRejectPlan(selectedPlan); }}>
                    Rechazar
                  </Button>
                </div>
              </div>
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
