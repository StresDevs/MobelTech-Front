"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Plus, Search, Undo2 } from 'lucide-react';

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
  items?: Array<{ description: string; quantity: number }>;
};

type Project = {
  id: string;
  name: string;
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

const tableItemHeaderClass = 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100';
const tableItemCellClass = 'bg-amber-50/80 text-zinc-900 dark:bg-amber-500/10 dark:text-zinc-100';
const tableMeasureHeaderClass = 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100';
const tableMeasureCellClass = 'bg-emerald-50/80 text-zinc-900 dark:bg-emerald-500/10 dark:text-zinc-100';
const tableMetaHeaderClass = 'bg-sky-100 text-sky-950 dark:bg-sky-500/20 dark:text-sky-100';
const tableMetaCellClass = 'bg-sky-50/80 text-zinc-900 dark:bg-sky-500/10 dark:text-zinc-100';

export function ContractorWarehouse({ contractorId }: { contractorId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
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

  function getOrderLabel(orderId?: string | null) {
    const order = orders.find((entry) => entry.id === orderId);
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
                  Estado de solicitudes
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
        <DialogContent className="h-[92vh] w-[min(96vw,60rem)] overflow-hidden rounded-3xl p-0">
          <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(255,255,255,0.98))] px-5 py-5 sm:px-6 dark:bg-[linear-gradient(135deg,rgba(234,182,118,0.12),rgba(20,20,20,0.98))]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-left text-2xl">Estado de solicitudes</DialogTitle>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Revisa aquí todas tus solicitudes por estado. Puedes ver las pendientes, aprobadas o las que necesitan corrección sin salir de la pantalla de trabajo.
              </p>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/60 p-1">
                <TabsTrigger value="pending" className="rounded-xl py-2.5">
                  Pendientes
                  <span className="ml-1 rounded-full bg-background/80 px-2 py-0.5 text-xs">{pendingRequests.length}</span>
                </TabsTrigger>
                <TabsTrigger value="approved" className="rounded-xl py-2.5">
                  Aprobadas
                  <span className="ml-1 rounded-full bg-background/80 px-2 py-0.5 text-xs">{approvedRequests.length}</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-xl py-2.5">
                  Observadas
                  <span className="ml-1 rounded-full bg-background/80 px-2 py-0.5 text-xs">{rejectedRequests.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[58vh] pr-2">
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <StatusCard key={request.id} request={request} title={getOrderLabel(request.productionOrderId)} tone="pending" />
                    ))}
                    {pendingRequests.length === 0 ? (
                      <EmptyHint icon={<CheckCircle2 className="h-5 w-5" />} text="No tienes solicitudes pendientes." />
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="approved" className="mt-4">
                <ScrollArea className="h-[58vh] pr-2">
                  <div className="space-y-3">
                    {approvedRequests.map((request) => (
                      <StatusCard key={request.id} request={request} title={getOrderLabel(request.productionOrderId)} tone="approved" />
                    ))}
                    {approvedRequests.length === 0 ? (
                      <EmptyHint icon={<CheckCircle2 className="h-5 w-5" />} text="Aún no tienes solicitudes aprobadas." />
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="rejected" className="mt-4">
                <ScrollArea className="h-[58vh] pr-2">
                  <div className="space-y-3">
                    {rejectedRequests.map((request) => (
                      <Card key={request.id} className="border-rose-200 bg-rose-50/70 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{getOrderLabel(request.productionOrderId)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(request.requestDate).toLocaleString('es-BO')}</p>
                          </div>
                          <Badge className={STATUS_STYLES.rejected}>Rechazada</Badge>
                        </div>
                        <div className="mt-3 rounded-2xl border border-rose-200/70 bg-background/80 p-3 text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:text-rose-200">
                          {request.rejectionComments || 'Sin comentario del administrador.'}
                        </div>
                        <Button
                          variant="outline"
                          className="mt-3 w-full gap-2 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-950/40"
                          onClick={() => reloadRejectedRequest(request)}
                        >
                          <Undo2 className="h-4 w-4" />
                          Corregir y reenviar
                        </Button>
                      </Card>
                    ))}
                    {rejectedRequests.length === 0 ? (
                      <EmptyHint icon={<AlertCircle className="h-5 w-5" />} text="No hay solicitudes observadas por corregir." />
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function StatusCard({ request, title, tone }: { request: MaterialRequest; title: string; tone: MaterialRequest['status'] }) {
  const toneLabel = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }[tone];

  return (
    <Card className="border-border/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{new Date(request.requestDate).toLocaleString('es-BO')}</p>
        </div>
        <Badge className={`${STATUS_STYLES[tone]} rounded-full px-3 py-1`}>{toneLabel}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {request.items.length} materiales · {tone === 'rejected' ? 'requiere corrección' : 'en seguimiento'}
      </p>
    </Card>
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
