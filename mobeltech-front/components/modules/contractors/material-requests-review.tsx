"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, CalendarDays, Check, ClipboardList, Hash, Package, Search, ShoppingBag, X } from 'lucide-react';

type Material = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
};

type Contractor = {
  id: string;
  name: string;
};

type ProductionOrder = {
  id: string;
  items?: Array<{ description: string; quantity: number }>;
};

type MaterialRequestItem = {
  materialId: string;
  quantity: number;
  notes?: string | null;
};

type MaterialRequest = {
  id: string;
  contractorId: string;
  productionOrderId?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionComments?: string | null;
  requestDate: string;
  items: MaterialRequestItem[];
};

const STATUS_META = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprobada', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rechazada', className: 'bg-rose-100 text-rose-800' },
} as const;

export function MaterialRequestsReview() {
  const { user } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionComments, setRejectionComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    try {
      const [requestsResponse, materialsResponse, contractorsResponse, ordersResponse] = await Promise.all([
        fetch(`${apiBase}/api/material-requests`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/materials`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractors`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/production-orders`, { cache: 'no-store' }),
      ]);

      if (!requestsResponse.ok) throw new Error('No se pudieron cargar las solicitudes.');
      if (!materialsResponse.ok) throw new Error('No se pudieron cargar los materiales.');
      if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas.');
      if (!ordersResponse.ok) throw new Error('No se pudieron cargar los trabajos.');

      setRequests(await requestsResponse.json());
      setMaterials(await materialsResponse.json());
      setContractors(await contractorsResponse.json());
      setOrders(await ordersResponse.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando solicitudes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    if (!apiBase) return;
    const interval = window.setInterval(() => {
      void loadData();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [apiBase]);

  const filteredRequests = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return requests;
    return requests.filter((request) => {
      const contractorName = contractors.find((entry) => entry.id === request.contractorId)?.name ?? '';
      const orderName = orders.find((entry) => entry.id === request.productionOrderId)?.items?.[0]?.description ?? '';
      return [contractorName, orderName, request.id].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [contractors, orders, requests, searchQuery]);

  const pendingRequests = filteredRequests.filter((request) => request.status === 'pending');
  const approvedRequests = filteredRequests.filter((request) => request.status === 'approved');
  const rejectedRequests = filteredRequests.filter((request) => request.status === 'rejected');

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedRequestTotalUnits = selectedRequest?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const contractorsById = useMemo(
    () => new Map(contractors.map((contractor) => [contractor.id, contractor])),
    [contractors],
  );
  const ordersById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );
  const materialsById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  function getContractorName(contractorId: string) {
    return contractorsById.get(contractorId)?.name ?? 'Contratista';
  }

  function getOrderName(orderId?: string | null) {
    return ordersById.get(orderId ?? '')?.items?.[0]?.description ?? 'Trabajo sin detalle';
  }

  function getMaterial(materialId: string) {
    return materialsById.get(materialId);
  }

  function getMaterialLabel(item: MaterialRequestItem) {
    const material = getMaterial(item.materialId);
    const quantityLabel = `${item.quantity} ${material?.unit ?? 'u'}`;
    return {
      name: material?.name ?? 'Material no encontrado',
      quantityLabel,
      notes: item.notes?.trim() || null,
    };
  }

  function formatRequestDate(value: string) {
    return new Date(value).toLocaleString('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function getRequestSummary(request: MaterialRequest) {
    const totalLines = request.items.length;
    const totalQuantity = request.items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalLines} ${totalLines === 1 ? 'material' : 'materiales'} · ${totalQuantity} unidades`;
  }

  async function updateRequestStatus(status: 'approved' | 'rejected') {
    if (!selectedRequest || !apiBase) return;
    if (status === 'rejected' && !rejectionComments.trim()) {
      setError('Debes escribir el motivo del rechazo.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/material-requests/${selectedRequest.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedByUserId: user?.id ?? null,
          rejectionComments: status === 'rejected' ? rejectionComments : null,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo actualizar la solicitud.');
      }

      setSelectedRequestId(null);
      setRejectionComments('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando solicitud.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando solicitudes"
        description="Recuperando solicitudes, materiales y contratistas..."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(255,255,255,0.92))] p-5 shadow-sm dark:bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(22,22,22,0.96))]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6b2f]">Panel Administrativo</p>
            <h2 className="mt-2 text-2xl font-bold">Solicitudes de materiales de contratistas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aprueba rapido, observa con comentarios y devuelve la solicitud para correccion cuando sea necesario.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por contratista, trabajo o ID..."
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {error ? <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<AlertCircle className="h-4 w-4" />} label="Pendientes" value={String(pendingRequests.length)} />
        <MetricCard icon={<Check className="h-4 w-4" />} label="Aprobadas" value={String(approvedRequests.length)} />
        <MetricCard icon={<X className="h-4 w-4" />} label="Rechazadas" value={String(rejectedRequests.length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RequestsColumn
          title="Pendientes"
          description="Requieren aprobacion o comentarios."
          requests={pendingRequests}
          openRequest={setSelectedRequestId}
          getContractorName={getContractorName}
          getOrderName={getOrderName}
          materialsById={materialsById}
        />
        <RequestsColumn
          title="Aprobadas"
          description="Ya notificadas al contratista."
          requests={approvedRequests}
          openRequest={setSelectedRequestId}
          getContractorName={getContractorName}
          getOrderName={getOrderName}
          materialsById={materialsById}
        />
        <RequestsColumn
          title="Rechazadas"
          description="Devueltas para correccion."
          requests={rejectedRequests}
          openRequest={setSelectedRequestId}
          getContractorName={getContractorName}
          getOrderName={getOrderName}
          materialsById={materialsById}
        />
      </div>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
        <DialogContent className="h-[92vh] w-[96vw] max-w-6xl overflow-hidden rounded-3xl p-0 shadow-2xl sm:max-w-none">
          {selectedRequest ? (
            <div className="flex h-full min-h-0 flex-col bg-background">
              <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(234,182,118,0.24),transparent_42%),linear-gradient(180deg,rgba(255,248,236,0.96),rgba(255,255,255,0.98))] px-5 py-5 sm:px-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(234,182,118,0.15),transparent_42%),linear-gradient(180deg,rgba(24,24,24,0.98),rgba(20,20,20,0.95))]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${STATUS_META[selectedRequest.status].className} rounded-full px-3 py-1 text-xs font-semibold`}>
                        {STATUS_META[selectedRequest.status].label}
                      </Badge>
                      <Badge variant="outline" className="gap-1.5 rounded-full border-border/70 bg-background/80 px-3 py-1 text-xs">
                        <Hash className="h-3.5 w-3.5" />
                        Solicitud #{selectedRequest.id.slice(0, 8)}
                      </Badge>
                    </div>
                    <DialogTitle className="mt-3 text-left text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      Detalle de solicitud
                    </DialogTitle>
                    <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                      {getRequestSummary(selectedRequest)}. Revisa el pedido completo, valida cantidades y decide si apruebas o devuelves esta solicitud.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_380px]">
                  <section className="space-y-4">
                    <Card className="overflow-hidden border-border/70 bg-card/95 p-4 shadow-sm sm:p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow
                          icon={<ShoppingBag className="h-4 w-4" />}
                          label="Contratista"
                          value={getContractorName(selectedRequest.contractorId)}
                        />
                        <InfoRow
                          icon={<Package className="h-4 w-4" />}
                          label="Trabajo"
                          value={getOrderName(selectedRequest.productionOrderId)}
                        />
                        <InfoRow
                          icon={<CalendarDays className="h-4 w-4" />}
                          label="Fecha"
                          value={formatRequestDate(selectedRequest.requestDate)}
                        />
                        <InfoRow
                          icon={<Check className="h-4 w-4" />}
                          label="Estado"
                          value={STATUS_META[selectedRequest.status].label}
                        />
                      </div>
                    </Card>

                    <Card className="border-border/70 p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Materiales solicitados
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Nombres, unidades y cantidades en un formato limpio para revisar rápido sin que nada se corte.
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit rounded-full bg-muted/40 px-3 py-1 text-foreground">
                          {selectedRequest.items.length} líneas
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedRequest.items.map((item, index) => {
                          const material = getMaterial(item.materialId);
                          const materialInfo = getMaterialLabel(item);
                          return (
                            <Card
                              key={`${selectedRequest.id}-${item.materialId}`}
                              className="border-border/70 bg-background/95 p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eab676]/15 text-[#9a6b2f]">
                                  <span className="text-sm font-bold">{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words font-semibold leading-6 text-foreground">{materialInfo.name}</p>
                                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Cantidad solicitada:{' '}
                                        <span className="font-semibold text-foreground">{materialInfo.quantityLabel}</span>
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="w-fit shrink-0 rounded-full bg-muted/40">
                                      {material?.unit ? `Unidad: ${material.unit}` : 'Sin unidad'}
                                    </Badge>
                                  </div>

                                  {materialInfo.notes ? (
                                    <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-sm leading-6 text-muted-foreground">
                                      <span className="font-semibold text-foreground">Notas: </span>
                                      <span className="break-words">{materialInfo.notes}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </Card>
                  </section>

                  <aside className="space-y-4">
                    <Card className="border-border/70 bg-muted/25 p-4 shadow-sm sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resumen</p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">Vista rápida de la solicitud</h3>
                        </div>
                        <Badge className={`${STATUS_META[selectedRequest.status].className} rounded-full px-3 py-1`}>
                          {STATUS_META[selectedRequest.status].label}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border/70 bg-background p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Materiales
                          </p>
                          <p className="mt-1 text-2xl font-bold leading-none">{selectedRequest.items.length}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Unidades
                          </p>
                          <p className="mt-1 text-2xl font-bold leading-none">{selectedRequestTotalUnits}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fecha</p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-foreground">
                            {formatRequestDate(selectedRequest.requestDate)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trabajo</p>
                          <p className="mt-1 break-words text-sm font-semibold leading-5 text-foreground">
                            {getOrderName(selectedRequest.productionOrderId)}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {selectedRequest.status === 'rejected' && selectedRequest.rejectionComments ? (
                      <Card className="border-rose-200 bg-rose-50/80 p-4 shadow-sm sm:p-5 dark:border-rose-900/60 dark:bg-rose-950/35">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                          Motivo de rechazo
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-rose-700 dark:text-rose-200">
                          {selectedRequest.rejectionComments}
                        </p>
                      </Card>
                    ) : null}

                    {selectedRequest.status === 'pending' ? (
                      <Card className="border-border/70 p-4 shadow-sm sm:p-5">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Decisión
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-foreground">Comentario si rechazas</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Explica con claridad qué debe corregir el contratista para que la solicitud quede bien.
                            </p>
                          </div>
                          <Textarea
                            value={rejectionComments}
                            onChange={(event) => setRejectionComments(event.target.value)}
                            placeholder="Escribe aquí el motivo del rechazo..."
                            className="min-h-[140px] resize-y"
                          />
                        </div>

                        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
                          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedRequestId(null)}>
                            Cerrar
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={() => void updateRequestStatus('rejected')}
                            disabled={saving}
                          >
                            {saving ? 'Procesando...' : 'Rechazar'}
                          </Button>
                          <Button
                            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                            onClick={() => void updateRequestStatus('approved')}
                            disabled={saving}
                          >
                            {saving ? 'Procesando...' : 'Aprobar'}
                          </Button>
                        </DialogFooter>
                      </Card>
                    ) : (
                      <Card className="border-border/70 p-4 shadow-sm sm:p-5">
                        <p className="text-sm leading-6 text-muted-foreground">
                          Esta solicitud ya fue {selectedRequest.status === 'approved' ? 'aprobada' : 'rechazada'}.
                        </p>
                        <Button variant="outline" className="mt-4 w-full" onClick={() => setSelectedRequestId(null)}>
                          Cerrar detalle
                        </Button>
                      </Card>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function RequestsColumn({
  title,
  description,
  requests,
  openRequest,
  getContractorName,
  getOrderName,
  materialsById,
}: {
  title: string;
  description: string;
  requests: MaterialRequest[];
  openRequest: (requestId: string) => void;
  getContractorName: (contractorId: string) => string;
  getOrderName: (orderId?: string | null) => string;
  materialsById: Map<string, Material>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{requests.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <Card
            key={request.id}
            className="cursor-pointer border-border/70 p-4 transition hover:shadow-sm"
            onClick={() => openRequest(request.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{getContractorName(request.contractorId)}</p>
                <p className="text-sm text-muted-foreground">{getOrderName(request.productionOrderId)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.items.length} materiales · {new Date(request.requestDate).toLocaleDateString('es-BO')}
                </p>
              </div>
              <Badge className={STATUS_META[request.status].className}>{STATUS_META[request.status].label}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {request.items.slice(0, 3).map((item) => {
                const material = materialsById.get(item.materialId);
                return (
                  <Badge key={`${request.id}-${item.materialId}`} variant="outline" className="max-w-full">
                    <span className="truncate">
                      {material?.name ?? 'Material'} · {item.quantity} {material?.unit ?? 'u'}
                    </span>
                  </Badge>
                );
              })}
              {request.items.length > 3 ? (
                <Badge variant="outline">+{request.items.length - 3} más</Badge>
              ) : null}
            </div>
            {request.status === 'rejected' && request.rejectionComments ? (
              <p className="mt-3 line-clamp-2 text-xs text-rose-700">{request.rejectionComments}</p>
            ) : null}
          </Card>
        ))}

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-60" />
            <p>No hay solicitudes en esta bandeja.</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eab676]/15 text-[#9a6b2f]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-5 text-foreground">{value}</p>
      </div>
    </div>
  );
}
