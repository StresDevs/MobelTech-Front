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
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRole } from '@/hooks/use-role-context';
import { CheckCircle2, Clock3, Search, WalletCards, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

type Contractor = {
  id: string;
  name: string;
  userId?: string | null;
};

type PaymentPlan = {
  id: string;
  contractorId: string;
  productionOrderId: string;
  contractorName: string;
  jobName: string;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  reviewStatus?: string;
};

type AdvanceRequest = {
  id: string;
  planId: string;
  contractorId: string;
  productionOrderId: string;
  amount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'paid' | string;
  notes?: string | null;
  reviewNotes?: string | null;
  requestedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  contractorName?: string | null;
  jobName?: string | null;
};

type ProductionOrder = {
  id: string;
  assignedContractorId?: string | null;
  status: string;
  startDate?: string | null;
  estimatedDeliveryDate?: string | null;
  items: Array<{
    id: string;
    progress?: number;
    phases?: Array<{ phase: string; completed?: string | boolean | null }>;
  }>;
  schedulePhases?: Array<{
    type: 'tentative' | 'actual' | 'real' | string;
    phase: string;
    completed?: string | boolean | null;
  }>;
};

const PHASE_KEYS = ['cortado', 'canteado', 'ensamblado', 'instalacion', 'entregado'];

function money(value: number) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Sin fecha';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
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
  if (status === 'paid') return 'Pagada';
  return 'En revision';
}

function statusClass(status?: string) {
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100';
  if (status === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';
  if (status === 'paid') return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100';
  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100';
}

function isCompleted(value?: string | boolean | null) {
  return value === true || value === 'true';
}

function getOrderProgress(order?: ProductionOrder) {
  if (!order) return 0;
  const itemProgress = order.items?.length
    ? order.items.reduce((sum, item) => sum + Number(item.progress || 0), 0) / order.items.length
    : 0;
  const finishedPhaseCount = PHASE_KEYS.filter((phaseKey) => {
    const realPhase = order.schedulePhases?.find((phase) => phase.type === 'real' && phase.phase === phaseKey);
    if (isCompleted(realPhase?.completed)) return true;
    return order.items?.length
      ? order.items.every((item) => item.phases?.some((phase) => phase.phase === phaseKey && isCompleted(phase.completed)))
      : false;
  }).length;
  const phaseProgress = (finishedPhaseCount / PHASE_KEYS.length) * 100;
  return Math.round(Math.max(itemProgress, phaseProgress));
}

function getActiveAdvance(request?: AdvanceRequest) {
  return request && request.status !== 'rejected' ? request : null;
}

export default function AdvanceRequestsPage() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const focusedJobId = searchParams.get('jobId');
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const isContractor = currentRole === 'contractor';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [search, setSearch] = useState('');
  const [requestPlan, setRequestPlan] = useState<PaymentPlan | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [rejectRequest, setRejectRequest] = useState<AdvanceRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const myContractor = useMemo(() => {
    if (!user) return null;
    return contractors.find((contractor) => contractor.userId === user.id || contractor.id === user.id) ?? null;
  }, [contractors, user]);

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const contractorsResponse = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
      const contractorsData = await contractorsResponse.json().catch(() => null);
      if (!contractorsResponse.ok) throw new Error(readError(contractorsData, 'No se pudieron cargar los contratistas.'));

      const contractorRows = Array.isArray(contractorsData) ? contractorsData as Contractor[] : [];
      const activeContractor = isContractor && user
        ? contractorRows.find((contractor) => contractor.userId === user.id || contractor.id === user.id)
        : null;

      if (isContractor && !activeContractor) {
        setContractors(contractorRows);
        setPlans([]);
        setRequests([]);
        setOrders([]);
        setError('No encontramos tu perfil de contratista.');
        return;
      }

      const contractorQuery = activeContractor ? `?contractorId=${encodeURIComponent(activeContractor.id)}` : '';
      const [plansResponse, requestsResponse, ordersResponse] = await Promise.all([
        fetch(`${apiBase}/api/contractor-finance/plans${contractorQuery}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/advance-requests${contractorQuery}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/production-orders${contractorQuery}`, { cache: 'no-store' }),
      ]);
      const plansData = await plansResponse.json().catch(() => null);
      const requestsData = await requestsResponse.json().catch(() => null);
      const ordersData = await ordersResponse.json().catch(() => null);
      if (!plansResponse.ok) throw new Error(readError(plansData, 'No se pudieron cargar las manos de obra aprobadas.'));
      if (!requestsResponse.ok) throw new Error(readError(requestsData, 'No se pudieron cargar las solicitudes de anticipo.'));
      if (!ordersResponse.ok) throw new Error(readError(ordersData, 'No se pudieron cargar los trabajos.'));

      setContractors(contractorRows);
      setPlans(plansData ?? []);
      setRequests(requestsData ?? []);
      setOrders(ordersData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando solicitudes de anticipo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [apiBase, currentRole, user?.id]);

  function getPlanRequest(planId: string) {
    return requests.find((request) => request.planId === planId);
  }

  function getOrder(orderId: string) {
    return orders.find((order) => order.id === orderId);
  }

  function openRequestForm(plan: PaymentPlan) {
    const existing = getPlanRequest(plan.id);
    const progress = getOrderProgress(getOrder(plan.productionOrderId));
    const suggestedAmount = Math.max(Math.round(plan.totalAmount * Math.max(progress, 30) / 100), 0);
    setRequestPlan(plan);
    setAdvanceAmount(String(existing?.amount ?? Math.min(suggestedAmount, plan.totalAmount)));
    setAdvanceNotes(existing?.notes ?? '');
  }

  async function sendAdvanceRequest() {
    if (!apiBase || !requestPlan || !myContractor) return;
    const amount = Number(advanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Monto invalido', description: 'El anticipo debe ser mayor a 0.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/advance-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: requestPlan.id,
          contractorId: myContractor.id,
          productionOrderId: requestPlan.productionOrderId,
          amount,
          notes: advanceNotes.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo enviar la solicitud de anticipo.'));
      setRequests((current) => [data as AdvanceRequest, ...current.filter((request) => request.planId !== requestPlan.id)]);
      setRequestPlan(null);
      setAdvanceAmount('');
      setAdvanceNotes('');
      toast({ title: 'Solicitud de anticipo enviada', description: 'Administracion recibira la notificacion para revisarla.' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo enviar la solicitud.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function reviewAdvance(request: AdvanceRequest, status: 'approved' | 'rejected' | 'paid', notes?: string) {
    if (status === 'rejected' && !notes?.trim()) {
      toast({ title: 'Comentario requerido', description: 'Escribe el motivo del rechazo.', variant: 'destructive' });
      return;
    }

    setReviewingId(request.id);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/advance-requests/${request.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: status === 'rejected' ? notes?.trim() : null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo revisar el anticipo.'));
      setRequests((current) => current.map((item) => (item.id === request.id ? data as AdvanceRequest : item)));
      setRejectRequest(null);
      setRejectNotes('');
      toast({ title: 'Solicitud actualizada', description: 'El contratista recibira la notificacion correspondiente.' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo actualizar la solicitud.', variant: 'destructive' });
    } finally {
      setReviewingId(null);
    }
  }

  const contractorPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans
      .filter((plan) => plan.reviewStatus === 'approved')
      .filter((plan) => {
        const searchable = [plan.jobName, plan.contractorName, plan.id].join(' ').toLowerCase();
        return !query || searchable.includes(query);
      })
      .sort((left, right) => {
        if (left.productionOrderId === focusedJobId) return -1;
        if (right.productionOrderId === focusedJobId) return 1;
        return left.jobName.localeCompare(right.jobName);
      });
  }, [focusedJobId, plans, search]);

  const adminRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests
      .filter((request) => {
        const searchable = [
          request.contractorName,
          request.jobName,
          request.status,
          request.notes,
          request.reviewNotes,
          request.id,
        ].join(' ').toLowerCase();
        return !query || searchable.includes(query);
      })
      .sort((left, right) => {
        if (left.productionOrderId === focusedJobId) return -1;
        if (right.productionOrderId === focusedJobId) return 1;
        return new Date(right.requestedAt ?? 0).getTime() - new Date(left.requestedAt ?? 0).getTime();
      });
  }, [focusedJobId, requests, search]);

  const pendingCount = requests.filter((request) => request.status === 'submitted').length;
  const approvedCount = requests.filter((request) => request.status === 'approved' || request.status === 'paid').length;
  const rejectedCount = requests.filter((request) => request.status === 'rejected').length;

  if (loading) {
    return <PageLoadingState title="Cargando anticipos" description="Preparando solicitudes y avances de trabajos..." />;
  }

  return (
    <AppLayout>
      <main className="space-y-5 p-4 md:p-6">
        <Card className="border-none bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(255,255,255,0.94))] p-5 shadow-sm dark:bg-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{isContractor ? 'Solicitud de anticipo' : 'Solicitud de anticipos'}</h1>
              <p className="text-sm text-muted-foreground">
                {isContractor
                  ? 'Solicita anticipos por trabajo asignado y revisa el estado de administracion.'
                  : 'Revisa anticipos de contratistas, aprueba o rechaza con comentario.'}
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar trabajo, contratista o estado..." className="pl-9" />
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard icon={<Clock3 className="h-4 w-4" />} label="En revision" value={pendingCount} />
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aprobadas/Pagadas" value={approvedCount} />
          <MetricCard icon={<XCircle className="h-4 w-4" />} label="Rechazadas" value={rejectedCount} />
        </div>

        {isContractor ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {contractorPlans.map((plan) => {
              const request = getPlanRequest(plan.id);
              const activeRequest = getActiveAdvance(request);
              const order = getOrder(plan.productionOrderId);
              const progress = getOrderProgress(order);
              const highlighted = focusedJobId === plan.productionOrderId;
              const canSend = !activeRequest && plan.reviewStatus === 'approved';

              return (
                <Card key={plan.id} className={`overflow-hidden p-0 ${highlighted ? 'ring-2 ring-[#eab676]' : ''}`}>
                  <div className="border-b border-border/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{plan.jobName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Trabajo {plan.productionOrderId.slice(0, 8)}</p>
                      </div>
                      {request ? <Badge className={statusClass(request.status)}>{statusLabel(request.status)}</Badge> : <Badge variant="outline">Sin solicitud</Badge>}
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InfoBox label="Total aprobado" value={money(plan.totalAmount)} />
                      <InfoBox label="Avance real" value={`${progress}%`} />
                      <InfoBox label="Sugerido por avance" value={money(Math.round(plan.totalAmount * progress / 100))} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-[#eab676]" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
                    </div>

                    {request?.notes ? <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{request.notes}</p> : null}
                    {request?.reviewNotes ? (
                      <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                        {request.reviewNotes}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" disabled={Boolean(activeRequest)} onClick={() => openRequestForm(plan)} className="gap-2">
                        <WalletCards className="h-4 w-4" />
                        {request?.status === 'rejected' ? 'Reenviar solicitud' : canSend ? 'Solicitar anticipo' : 'Solicitud activa'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {contractorPlans.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground xl:col-span-2">
                No hay trabajos con mano de obra aprobada para solicitar anticipo.
              </Card>
            ) : null}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold">Trabajo</th>
                    <th className="px-4 py-3 text-left font-semibold">Contratista</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                    <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold">Notas</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRequests.map((request) => {
                    const highlighted = focusedJobId === request.productionOrderId;
                    return (
                      <tr key={request.id} className={`border-b border-border/60 last:border-b-0 ${highlighted ? 'bg-amber-50/70 dark:bg-amber-500/10' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{request.jobName ?? 'Trabajo sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(request.requestedAt)}</p>
                        </td>
                        <td className="px-4 py-3">{request.contractorName ?? 'Contratista'}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{money(request.amount)}</td>
                        <td className="px-4 py-3"><Badge className={statusClass(request.status)}>{statusLabel(request.status)}</Badge></td>
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="line-clamp-2 text-muted-foreground">{request.notes || 'Sin nota'}</p>
                          {request.reviewNotes ? <p className="mt-1 line-clamp-2 text-rose-600">{request.reviewNotes}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={reviewingId === request.id || request.status === 'approved' || request.status === 'paid'} onClick={() => void reviewAdvance(request, 'approved')}>
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={reviewingId === request.id || request.status === 'rejected'}
                              onClick={() => {
                                setRejectRequest(request);
                                setRejectNotes(request.reviewNotes ?? '');
                              }}
                            >
                              Rechazar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {adminRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay solicitudes de anticipo para mostrar.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={Boolean(requestPlan)} onOpenChange={(open) => { if (!open) setRequestPlan(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar solicitud de anticipo</DialogTitle>
              <DialogDescription>El monto quedara en revision de administracion.</DialogDescription>
            </DialogHeader>
            {requestPlan ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <InfoBox label="Trabajo" value={requestPlan.jobName} />
                  <InfoBox label="Total aprobado" value={money(requestPlan.totalAmount)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Monto solicitado</Label>
                  <Input type="number" min="0" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Comentario</Label>
                  <Textarea value={advanceNotes} onChange={(event) => setAdvanceNotes(event.target.value)} placeholder="Describe el avance o motivo del anticipo..." />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setRequestPlan(null)}>Cancelar</Button>
                  <Button disabled={saving || Number(advanceAmount) <= 0} onClick={() => void sendAdvanceRequest()}>
                    {saving ? 'Enviando...' : 'Enviar solicitud'}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(rejectRequest)} onOpenChange={(open) => { if (!open) setRejectRequest(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Rechazar solicitud de anticipo</DialogTitle>
              <DialogDescription>El comentario quedara visible para el contratista.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} placeholder="Explica por que se rechaza la solicitud..." />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setRejectRequest(null)}>Cancelar</Button>
                <Button variant="destructive" disabled={!rejectNotes.trim() || reviewingId === rejectRequest?.id} onClick={() => rejectRequest ? void reviewAdvance(rejectRequest, 'rejected', rejectNotes) : undefined}>
                  Rechazar solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <span className="rounded-md bg-[#eab676]/20 p-2 text-[#8a5a1e]">{icon}</span>
    </Card>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
