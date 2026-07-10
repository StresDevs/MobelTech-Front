"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, Check, CheckCircle2, ClipboardList, Clock3, History, Package, Plus, Save, Search, Undo2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type Material = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  unitPrice: number;
};

type ProductionOrder = {
  id: string;
  quotationId?: string | null;
  assignedContractorId?: string | null;
  projectId?: string | null;
  status?: 'pending' | 'in-progress' | 'delayed' | 'completed';
  items?: Array<{ description: string; quantity: number }>;
};

type Project = {
  id: string;
  name: string;
  status?: 'quotation' | 'production' | 'delivered';
};

type MaterialRequestItem = {
  id: string;
  materialId: string;
  quantity: number;
  notes?: string | null;
};

type MaterialRequestAdjustment = {
  id: string;
  materialRequestId: string;
  materialRequestItemId: string;
  materialId: string;
  previousQuantity: number;
  newQuantity: number;
  note?: string | null;
  changedByUserId?: string | null;
  createdAt: string;
};

type MaterialRequest = {
  id: string;
  contractorId: string;
  productionOrderId?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionComments?: string | null;
  stockConsumedAt?: string | null;
  requestDate: string;
  items: MaterialRequestItem[];
  adjustments?: MaterialRequestAdjustment[];
};

type CartItem = {
  materialId: string;
  quantity: number;
  notes: string;
};

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
} as const;

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
} as const;

const tableItemHeaderClass = 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100';
const tableItemCellClass = 'bg-amber-50/80 text-zinc-900 dark:bg-amber-500/10 dark:text-zinc-100';
const tableMeasureHeaderClass = 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100';
const tableMeasureCellClass = 'bg-emerald-50/80 text-zinc-900 dark:bg-emerald-500/10 dark:text-zinc-100';
const tableMetaHeaderClass = 'bg-sky-100 text-sky-950 dark:bg-sky-500/20 dark:text-sky-100';
const tableMetaCellClass = 'bg-sky-50/80 text-zinc-900 dark:bg-sky-500/10 dark:text-zinc-100';

export function ContractorWarehouse({ contractorId }: { contractorId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const requestedJobId = searchParams.get('jobId');
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryRequestId, setSelectedHistoryRequestId] = useState<string | null>(null);
  const [historyDraftQuantities, setHistoryDraftQuantities] = useState<Record<string, number>>({});
  const [savingHistoryRequest, setSavingHistoryRequest] = useState(false);

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    try {
      const [materialsResponse, ordersResponse, requestsResponse, projectsResponse] = await Promise.all([
        fetch(`${apiBase}/api/materials`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/production-orders?contractorId=${contractorId}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/material-requests?contractorId=${contractorId}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/projects`, { cache: 'no-store' }),
      ]);

      if (!materialsResponse.ok) throw new Error('No se pudieron cargar los materiales.');
      if (!ordersResponse.ok) throw new Error('No se pudieron cargar tus trabajos.');
      if (!requestsResponse.ok) throw new Error('No se pudieron cargar tus solicitudes.');
      setMaterials(await materialsResponse.json());
      setOrders(await ordersResponse.json());
      setRequests(await requestsResponse.json());
      setProjects(projectsResponse.ok ? await projectsResponse.json() : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando solicitud de materiales.');
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
  }, [apiBase, contractorId]);

  useEffect(() => {
    if (!requestedJobId || selectedJobId || orders.length === 0) return;
    if (orders.some((order) => order.id === requestedJobId)) {
      setSelectedJobId(requestedJobId);
      setFeedback('Trabajo seleccionado. Completa los materiales y envía la solicitud antes de iniciar avance real.');
    }
  }, [orders, requestedJobId, selectedJobId]);

  const visibleMaterials = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return materials;
    return materials.filter((material) =>
      [material.name, material.unit]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [materials, searchQuery]);
  const availableMaterials = visibleMaterials.filter((material) => !cart.some((item) => item.materialId === material.id));

  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const approvedRequests = requests.filter((request) => request.status === 'approved');
  const rejectedRequests = requests.filter((request) => request.status === 'rejected');
  const cartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const ordersById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );
  const materialsById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  const historyRequests = useMemo(() => {
    const normalized = historySearch.trim().toLowerCase();
    if (!normalized) return requests;

    return requests.filter((request) => {
      const orderLabel = getOrderLabel(request.productionOrderId);
      const statusLabel = {
        pending: 'pendiente',
        approved: 'aprobada',
        rejected: 'rechazada observada',
      }[request.status];
      const materialNames = request.items
        .map((item) => materialsById.get(item.materialId)?.name ?? '')
        .join(' ');

      return [request.id, orderLabel, statusLabel, materialNames, request.rejectionComments ?? '']
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [historySearch, materialsById, requests, orders, projectsById]);

  const pendingHistoryRequests = historyRequests.filter((request) => request.status === 'pending');
  const approvedHistoryRequests = historyRequests.filter((request) => request.status === 'approved');
  const rejectedHistoryRequests = historyRequests.filter((request) => request.status === 'rejected');
  const selectedHistoryRequest = requests.find((request) => request.id === selectedHistoryRequestId) ?? null;
  const selectedHistoryOrder = selectedHistoryRequest?.productionOrderId
    ? ordersById.get(selectedHistoryRequest.productionOrderId)
    : null;
  const selectedHistoryProject = selectedHistoryOrder?.projectId
    ? projectsById.get(selectedHistoryOrder.projectId)
    : null;
  const selectedHistoryRequestEditable = Boolean(
    selectedHistoryRequest?.status === 'approved' &&
    selectedHistoryOrder &&
    selectedHistoryOrder.status !== 'completed' &&
    selectedHistoryProject?.status !== 'delivered',
  );

  useEffect(() => {
    if (!selectedHistoryRequest) {
      setHistoryDraftQuantities({});
      return;
    }

    setHistoryDraftQuantities(
      Object.fromEntries(selectedHistoryRequest.items.map((item) => [item.id, item.quantity])),
    );
  }, [selectedHistoryRequest]);

  function getOrderLabel(orderId?: string | null) {
    const order = ordersById.get(orderId ?? '');
    if (!order) return 'Trabajo no encontrado';
    return projectsById.get(order.projectId ?? '')?.name || order.items?.[0]?.description || `Trabajo ${order.id.slice(0, 8)}`;
  }

  function addToCart(materialId: string) {
    const quantity = 1;
    if (!selectedJobId) {
      toast({
        title: 'Selecciona el trabajo primero',
        description: 'Antes de agregar materiales, elige el trabajo correspondiente en el selector.',
        duration: 3000,
        className: 'border-amber-300 bg-amber-50 text-amber-950 shadow-lg dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
      });
      return;
    }
    setError(null);
    setCart((current) => {
      const existing = current.find((item) => item.materialId === materialId);
      if (existing) {
        return current.map((item) =>
          item.materialId === materialId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...current,
        {
          materialId,
          quantity,
          notes: '',
        },
      ];
    });
  }

  function removeFromCart(materialId: string) {
    setCart((current) => current.filter((item) => item.materialId !== materialId));
  }

  function updateCartItem(materialId: string, field: 'quantity' | 'notes', value: string) {
    setCart((current) => current.map((item) => {
      if (item.materialId !== materialId) return item;
      if (field === 'quantity') return { ...item, quantity: Math.max(0, Number(value) || 0) };
      return { ...item, notes: value };
    }));
  }

  async function submitRequest() {
    if (!apiBase || cart.length === 0 || !selectedJobId) return;

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`${apiBase}/api/material-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          productionOrderId: selectedJobId,
          submittedByUserId: user?.id ?? null,
          items: cart.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo enviar la solicitud.');
      }

      setFeedback('Solicitud enviada correctamente. El administrador ya puede revisarla.');
      setCart([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  function reloadRejectedRequest(request: MaterialRequest) {
    setSelectedJobId(request.productionOrderId ?? '');
    setSearchQuery('');
    setCart(
      request.items.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
        notes: item.notes ?? '',
      })),
    );
    setFeedback('Se cargo la solicitud rechazada para que la ajustes y la vuelvas a enviar.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateHistoryDraftQuantity(itemId: string, value: string) {
    setHistoryDraftQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.trunc(Number(value) || 0)),
    }));
  }

  async function saveHistoryRequestAdjustments() {
    if (!apiBase || !selectedHistoryRequest || !selectedHistoryRequestEditable) return;

    const nextItems = selectedHistoryRequest.items.map((item) => ({
      id: item.id,
      quantity: historyDraftQuantities[item.id] ?? item.quantity,
    }));

    if (nextItems.some((item) => item.quantity <= 0)) {
      setError('Todas las cantidades reajustadas deben ser mayores a cero.');
      return;
    }

    const changed = nextItems.some((item) => {
      const current = selectedHistoryRequest.items.find((entry) => entry.id === item.id);
      return current && current.quantity !== item.quantity;
    });

    if (!changed) {
      toast({
        title: 'Sin cambios',
        description: 'No modificaste ninguna cantidad de esta solicitud.',
        duration: 2500,
      });
      return;
    }

    setSavingHistoryRequest(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/material-requests/${selectedHistoryRequest.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          changedByUserId: user?.id ?? null,
          items: nextItems,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo reajustar la solicitud.');
      }

      setRequests((current) => current.map((request) => (request.id === body.id ? body : request)));
      setSelectedHistoryRequestId(body.id);
      toast({
        title: 'Solicitud reajustada',
        description: 'Las cantidades fueron actualizadas y el historial quedó registrado.',
        duration: 3000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reajustando la solicitud.');
    } finally {
      setSavingHistoryRequest(false);
    }
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando materiales"
        description="Recuperando catalogo, trabajos asignados e historial de solicitudes."
      />
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{feedback}</Card> : null}
      {error ? <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card> : null}

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <div className="border-b border-border/70 bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Solicitud de materiales</h3>
                <p className="text-sm text-muted-foreground">
                  Busca materiales, agrégalos y completa cantidades. La solicitud quedará en revisión por administración.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequests(true)}
                  className="rounded-full border-[#eab676]/35 bg-[#eab676]/15 px-4 text-[#9a6b2f] hover:bg-[#eab676]/25 hover:text-[#8a5d26]"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Historial de solicitudes
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <label className="text-sm font-medium">Trabajo asignado</label>
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-[#d6a85a]"
              >
                <option value="">Selecciona un trabajo</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {getOrderLabel(order.id)}
                  </option>
                ))}
              </select>
            </div>
            {!selectedJobId ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Selecciona primero un trabajo para poder agregar materiales.
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Buscador</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar material por nombre o unidad..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => setSearchQuery('')}>Limpiar</Button>
              </div>
            </div>

            {availableMaterials.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-md border border-border/70">
                {availableMaterials.slice(0, 10).map((material) => (
                  <div key={material.id} className="flex items-center justify-between gap-3 border-b border-border/60 bg-emerald-50/60 px-3 py-2 text-zinc-900 transition hover:bg-emerald-100/70 last:border-b-0 dark:bg-emerald-500/10 dark:text-zinc-100 dark:hover:bg-emerald-500/15">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{material.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {material.unit} · Stock {material.stock}
                      </p>
                    </div>
                    <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={() => addToCart(material.id)} disabled={!selectedJobId}>
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </Button>
                  </div>
                ))}
              </div>
            ) : materials.length > 0 ? (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
                No hay materiales disponibles para ese filtro o todos ya fueron agregados.
              </p>
            ) : (
              <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                No hay materiales configurados en inventario.
              </Card>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[940px] table-fixed text-sm">
              <thead>
              <tr>
                <th className="w-12 px-2 py-2 text-center font-semibold text-muted-foreground">No</th>
                <th className={`w-[36%] px-3 py-2 text-left font-semibold ${tableItemHeaderClass}`}>MATERIAL</th>
                <th className={`w-[10%] px-3 py-2 text-center font-semibold ${tableItemHeaderClass}`}>UNIDAD</th>
                <th className={`w-[10%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>STOCK</th>
                <th className={`w-[12%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>CANTIDAD</th>
                <th className={`w-[22%] px-3 py-2 text-left font-semibold ${tableMetaHeaderClass}`}>NOTAS</th>
                <th className="w-[10%] px-3 py-2 text-right font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Agrega materiales desde el buscador.</td>
                </tr>
              ) : cart.map((item, index) => {
                const material = materials.find((entry) => entry.id === item.materialId);
                if (!material) return null;
                return (
                  <tr key={item.materialId} className="border-b border-border/60 last:border-b-0">
                    <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td className={`px-3 py-2 font-medium ${tableItemCellClass}`}><span className="block whitespace-normal leading-snug">{material.name}</span></td>
                    <td className={`px-3 py-2 text-center font-mono text-xs font-semibold ${tableItemCellClass}`}>{material.unit}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${tableMeasureCellClass}`}>{material.stock}</td>
                    <td className={`px-3 py-2 ${tableMeasureCellClass}`}>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.quantity || ''}
                        onChange={(event) => updateCartItem(item.materialId, 'quantity', event.target.value)}
                        className="h-8 text-right font-mono dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-100"
                        placeholder="0"
                      />
                    </td>
                    <td className={`px-3 py-2 ${tableMetaCellClass}`}>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateCartItem(item.materialId, 'notes', event.target.value)}
                        placeholder="Opcional"
                        className="h-8 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFromCart(item.materialId)}>Quitar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm dark:bg-sky-500/10 sm:min-w-80">
            <div>
              <span className="font-medium text-sky-800 dark:text-sky-100">Total solicitado</span>
              <p className="text-xs font-normal text-muted-foreground">Revisa cantidades antes de enviar.</p>
            </div>
            <span className="font-mono font-semibold text-sky-800 dark:text-sky-100">{cartUnits} unidades</span>
          </div>
          <Button
            onClick={submitRequest}
            disabled={submitting || !selectedJobId || cart.length === 0 || cart.some((item) => item.quantity <= 0)}
            className="bg-[#d6a85a] text-white hover:bg-[#c3964b]"
          >
            {submitting ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </div>
      </Card>

      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="h-[92vh] w-[min(96vw,74rem)] max-w-none overflow-hidden rounded-2xl p-0">
          <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-left text-2xl">Historial de solicitudes de material</DialogTitle>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Revisa tus solicitudes por estado. Haz clic en una solicitud para ver el detalle y reajustar cantidades cuando el trabajo siga vigente.
                </p>
              </DialogHeader>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <HistoryMetric icon={<Clock3 className="h-4 w-4" />} label="Pendientes" value={pendingRequests.length} tone="pending" />
                <HistoryMetric icon={<Check className="h-4 w-4" />} label="Aprobadas" value={approvedRequests.length} tone="approved" />
                <HistoryMetric icon={<X className="h-4 w-4" />} label="Rechazadas" value={rejectedRequests.length} tone="rejected" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Buscar por trabajo, material, estado o ID..."
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => setHistorySearch('')}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-3">
                <RequestHistoryColumn
                  title="Pendientes"
                  description="Requieren aprobación de administración."
                  requests={pendingHistoryRequests}
                  openRequest={setSelectedHistoryRequestId}
                  getOrderLabel={getOrderLabel}
                  materialsById={materialsById}
                  emptyIcon={<CheckCircle2 className="h-6 w-6" />}
                  emptyText="No tienes solicitudes pendientes."
                />
                <RequestHistoryColumn
                  title="Aprobadas"
                  description="Puedes reajustar cantidades si el trabajo sigue vigente."
                  requests={approvedHistoryRequests}
                  openRequest={setSelectedHistoryRequestId}
                  getOrderLabel={getOrderLabel}
                  materialsById={materialsById}
                  emptyIcon={<CheckCircle2 className="h-6 w-6" />}
                  emptyText="Aún no tienes solicitudes aprobadas."
                />
                <RequestHistoryColumn
                  title="Rechazadas"
                  description="Devueltas para corrección."
                  requests={rejectedHistoryRequests}
                  openRequest={setSelectedHistoryRequestId}
                  getOrderLabel={getOrderLabel}
                  materialsById={materialsById}
                  onReloadRejected={reloadRejectedRequest}
                  emptyIcon={<AlertCircle className="h-6 w-6" />}
                  emptyText="No hay solicitudes observadas por corregir."
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedHistoryRequest)} onOpenChange={(open) => !open && setSelectedHistoryRequestId(null)}>
        <DialogContent className="h-[90vh] w-[min(96vw,54rem)] max-w-none overflow-hidden rounded-2xl p-0">
          {selectedHistoryRequest ? (
            <div className="flex h-full min-h-0 flex-col bg-background">
              <div className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Badge className={`${STATUS_STYLES[selectedHistoryRequest.status]} rounded-full px-3 py-1`}>
                      {STATUS_LABELS[selectedHistoryRequest.status]}
                    </Badge>
                    <DialogTitle className="mt-2 text-left text-xl font-semibold">
                      {getOrderLabel(selectedHistoryRequest.productionOrderId)}
                    </DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Solicitud #{selectedHistoryRequest.id.slice(0, 8)} · {new Date(selectedHistoryRequest.requestDate).toLocaleString('es-BO')}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                    {selectedHistoryRequest.items.length} materiales
                  </Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-4">
                  {selectedHistoryRequestEditable ? (
                    <Card className="border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                      Este trabajo sigue vigente. Puedes reajustar cantidades de esta solicitud aprobada y quedará registrado en historial.
                    </Card>
                  ) : (
                    <Card className="border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                      Esta solicitud no está editable porque no está aprobada o pertenece a un trabajo/proyecto cerrado.
                    </Card>
                  )}

                  <Card className="overflow-hidden border-border/70">
                    <div className="border-b border-border/70 px-4 py-3">
                      <p className="text-sm font-semibold">Materiales solicitados</p>
                    </div>
                    <div className="divide-y divide-border/70">
                      {selectedHistoryRequest.items.map((item) => {
                        const material = materialsById.get(item.materialId);
                        return (
                          <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_9rem] md:items-center">
                            <div className="min-w-0">
                              <p className="font-semibold leading-5">{material?.name ?? 'Material no encontrado'}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Unidad: {material?.unit ?? 'u'}{item.notes ? ` · ${item.notes}` : ''}
                              </p>
                            </div>
                            {selectedHistoryRequestEditable ? (
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={historyDraftQuantities[item.id] ?? item.quantity}
                                onChange={(event) => updateHistoryDraftQuantity(item.id, event.target.value)}
                                className="h-10 text-right font-mono"
                              />
                            ) : (
                              <p className="text-right font-mono font-semibold">
                                {item.quantity} {material?.unit ?? 'u'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="border-border/70 p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Historial de modificaciones</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(selectedHistoryRequest.adjustments ?? []).map((adjustment) => {
                        const material = materialsById.get(adjustment.materialId);
                        return (
                          <div key={adjustment.id} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                            <p className="font-medium">
                              Se modificó la cantidad de {material?.name ?? 'un material'} de {adjustment.previousQuantity} a {adjustment.newQuantity}.
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(adjustment.createdAt).toLocaleString('es-BO')}
                            </p>
                          </div>
                        );
                      })}
                      {(selectedHistoryRequest.adjustments ?? []).length === 0 ? (
                        <EmptyHint icon={<History className="h-5 w-5" />} text="Esta solicitud aún no tiene modificaciones registradas." />
                      ) : null}
                    </div>
                  </Card>

                  {selectedHistoryRequest.status === 'rejected' ? (
                    <Card className="border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                      <p className="font-semibold">Motivo de rechazo</p>
                      <p className="mt-2 leading-6">{selectedHistoryRequest.rejectionComments || 'Sin comentario del administrador.'}</p>
                    </Card>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                <Button variant="outline" onClick={() => setSelectedHistoryRequestId(null)}>
                  Cerrar
                </Button>
                {selectedHistoryRequestEditable ? (
                  <Button
                    onClick={saveHistoryRequestAdjustments}
                    disabled={savingHistoryRequest}
                    className="gap-2 bg-[#d6a85a] text-white hover:bg-[#c3964b]"
                  >
                    <Save className="h-4 w-4" />
                    {savingHistoryRequest ? 'Guardando...' : 'Guardar reajuste'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function HistoryMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: MaterialRequest['status'];
}) {
  return (
    <Card className="border-border/70 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function RequestHistoryColumn({
  title,
  description,
  requests,
  openRequest,
  getOrderLabel,
  materialsById,
  onReloadRejected,
  emptyIcon,
  emptyText,
}: {
  title: string;
  description: string;
  requests: MaterialRequest[];
  openRequest: (requestId: string) => void;
  getOrderLabel: (orderId?: string | null) => string;
  materialsById: Map<string, Material>;
  onReloadRejected?: (request: MaterialRequest) => void;
  emptyIcon: React.ReactNode;
  emptyText: string;
}) {
  return (
    <Card className="min-h-[28rem] border-border/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{requests.length}</Badge>
      </div>

      <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {requests.map((request) => (
          <RequestHistoryCard
            key={request.id}
            request={request}
            title={getOrderLabel(request.productionOrderId)}
            materialsById={materialsById}
            onClick={() => openRequest(request.id)}
            onReloadRejected={onReloadRejected}
          />
        ))}

        {requests.length === 0 ? (
          <EmptyHint icon={emptyIcon} text={emptyText} />
        ) : null}
      </div>
    </Card>
  );
}

function RequestHistoryCard({
  request,
  title,
  materialsById,
  onClick,
  onReloadRejected,
}: {
  request: MaterialRequest;
  title: string;
  materialsById: Map<string, Material>;
  onClick: () => void;
  onReloadRejected?: (request: MaterialRequest) => void;
}) {
  const lastAdjustment = request.adjustments?.[0] ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
      }}
      className="block w-full rounded-xl border border-border/70 bg-background p-4 text-left shadow-sm transition hover:border-[#d6a85a]/70 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#d6a85a]/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Solicitud #{request.id.slice(0, 8)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.items.length} materiales · {new Date(request.requestDate).toLocaleDateString('es-BO')}
          </p>
        </div>
        <Badge className={`${STATUS_STYLES[request.status]} shrink-0 rounded-full px-3 py-1`}>
          {STATUS_LABELS[request.status]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {request.items.slice(0, 3).map((item) => {
          const material = materialsById.get(item.materialId);
          return (
            <Badge key={`${request.id}-${item.id}`} variant="outline" className="max-w-full gap-1.5 bg-muted/30">
              <Package className="h-3 w-3" />
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

      {lastAdjustment ? (
        <div className="mt-3 rounded-lg border border-[#d6a85a]/35 bg-[#eab676]/10 px-3 py-2 text-xs leading-5 text-[#7b5524] dark:text-amber-100">
          Se modificó la cantidad de {materialsById.get(lastAdjustment.materialId)?.name ?? 'un material'} · {new Date(lastAdjustment.createdAt).toLocaleString('es-BO')}
        </div>
      ) : null}

      {request.status === 'rejected' && request.rejectionComments ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-rose-700 dark:text-rose-300">
          {request.rejectionComments}
        </p>
      ) : null}

      {request.status === 'rejected' && onReloadRejected ? (
        <span
          role="button"
          tabIndex={0}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-950/40"
          onClick={(event) => {
            event.stopPropagation();
            onReloadRejected(request);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            onReloadRejected(request);
          }}
        >
          <Undo2 className="h-4 w-4" />
          Corregir y reenviar
        </span>
      ) : null}
    </div>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      <div className="mb-2 flex justify-center">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
