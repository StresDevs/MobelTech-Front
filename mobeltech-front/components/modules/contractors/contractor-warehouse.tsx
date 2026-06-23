"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Minus, PackageSearch, Plus, Search, ShoppingCart, Undo2, X } from 'lucide-react';

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

export function ContractorWarehouse({ contractorId }: { contractorId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedJobId, setSelectedJobId] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
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
    const quantity = quantities[materialId] ?? 0;
    if (!selectedJobId) {
      toast({
        title: 'Selecciona el trabajo primero',
        description: 'Antes de agregar materiales, elige el trabajo correspondiente en el selector.',
        duration: 3000,
        className: 'border-amber-300 bg-amber-50 text-amber-950 shadow-lg dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
      });
      return;
    }
    if (quantity <= 0) {
      setError('Ingresa una cantidad valida antes de agregar un material.');
      return;
    }

    setError(null);
    setCart((current) => {
      const existing = current.find((item) => item.materialId === materialId);
      if (existing) {
        return current.map((item) =>
          item.materialId === materialId
            ? { ...item, quantity: item.quantity + quantity, notes: notes[materialId] || item.notes }
            : item,
        );
      }

      return [
        ...current,
        {
          materialId,
          quantity,
          notes: notes[materialId] || '',
        },
      ];
    });
    setQuantities((current) => ({ ...current, [materialId]: 0 }));
    setNotes((current) => ({ ...current, [materialId]: '' }));
  }

  function removeFromCart(materialId: string) {
    setCart((current) => current.filter((item) => item.materialId !== materialId));
    setQuantities((current) => ({ ...current, [materialId]: 0 }));
    setNotes((current) => ({ ...current, [materialId]: '' }));
  }

  function updateMaterialQuantity(materialId: string, delta: number) {
    setQuantities((current) => {
      const previous = current[materialId] ?? 0;
      const nextValue = Math.max(0, previous + delta);
      return { ...current, [materialId]: nextValue };
    });
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
      setQuantities({});
      setNotes({});
      setShowCart(false);
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
    setQuantities(
      request.items.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.materialId] = item.quantity;
        return accumulator;
      }, {}),
    );
    setNotes(
      request.items.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.materialId] = item.notes ?? '';
        return accumulator;
      }, {}),
    );
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
                  Usa la tabla para elegir materiales y la burbuja del carrito para revisar antes de enviar.
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
                <Button
                  type="button"
                  onClick={() => setShowCart(true)}
                  className="rounded-full bg-[#d6a85a] px-4 text-white hover:bg-[#c3964b]"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Carrito ({cart.length})
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Trabajo asignado</label>
                <select
                  value={selectedJobId}
                  onChange={(event) => setSelectedJobId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-[#d6a85a]"
                >
                  <option value="">Selecciona un trabajo</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {getOrderLabel(order.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Buscar material</label>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Melamina, bisagra, tornillo..."
                    className="rounded-xl pl-9"
                  />
                </div>
              </div>
            </div>
            {!selectedJobId ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Selecciona primero un trabajo para poder agregar materiales.
              </p>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-semibold">Material</th>
                <th className="px-5 py-4 font-semibold">Unidad</th>
                <th className="px-5 py-4 font-semibold">Stock</th>
                <th className="px-5 py-4 font-semibold">Cantidad</th>
                <th className="px-5 py-4 font-semibold">Notas</th>
                <th className="px-5 py-4 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleMaterials.map((material, index) => {
                const cartItem = cart.find((item) => item.materialId === material.id);
                return (
                  <tr key={material.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                    <td className="border-t border-border/60 px-5 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-semibold leading-6">{material.name}</p>
                        {cartItem ? (
                          <Badge className="mt-1 w-fit rounded-full bg-[#d6a85a] text-white">{cartItem.quantity} en carrito</Badge>
                        ) : (
                          <p className="text-xs text-muted-foreground">Disponible para solicitar</p>
                        )}
                      </div>
                    </td>
                    <td className="border-t border-border/60 px-5 py-4 align-top text-sm text-muted-foreground">
                      {material.unit}
                    </td>
                    <td className="border-t border-border/60 px-5 py-4 align-top">
                      <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1">
                        {material.stock}
                      </Badge>
                    </td>
                    <td className="border-t border-border/60 px-5 py-4 align-top">
                      <div className="flex w-36 items-stretch overflow-hidden rounded-xl border border-input bg-background shadow-sm">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 w-11 rounded-none border-r border-input px-0"
                          onClick={() => updateMaterialQuantity(material.id, -1)}
                          disabled={(quantities[material.id] || 0) <= 0}
                        >
                          <Minus className="h-4 w-4" />
                          <span className="sr-only">Disminuir cantidad</span>
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={quantities[material.id] || ''}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [material.id]: event.target.value === '' ? 0 : Number(event.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                          className="h-11 w-full rounded-none border-0 text-center shadow-none [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 w-11 rounded-none border-l border-input px-0"
                          onClick={() => updateMaterialQuantity(material.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">Aumentar cantidad</span>
                        </Button>
                      </div>
                    </td>
                    <td className="border-t border-border/60 px-5 py-4 align-top">
                      <Input
                        value={notes[material.id] || ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [material.id]: event.target.value }))}
                        placeholder="Opcional"
                        className="min-w-[240px]"
                      />
                    </td>
                    <td className="border-t border-border/60 px-5 py-4 align-top">
                      <Button
                        onClick={() => addToCart(material.id)}
                        disabled={Boolean(selectedJobId) && (quantities[material.id] || 0) <= 0}
                        className="w-full rounded-xl bg-[#d6a85a] text-white hover:bg-[#c3964b]"
                      >
                        Agregar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleMaterials.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
            <PackageSearch className="h-10 w-10 opacity-60" />
            <div>
              <p className="font-medium">No encontramos materiales con esa búsqueda.</p>
              <p className="text-sm">Prueba con otro nombre o limpia el filtro para ver todo el catálogo.</p>
            </div>
          </div>
        ) : null}
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

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="h-[92vh] w-[min(96vw,42rem)] max-h-[92vh] overflow-hidden rounded-3xl">
          <DialogHeader className="space-y-2">
            <DialogTitle>Carrito de solicitud</DialogTitle>
            <p className="text-sm text-muted-foreground">Confirma lo que vas a enviar. Aquí no se muestran precios.</p>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 opacity-60" />
              <p>Aun no agregaste materiales al carrito.</p>
            </div>
          ) : (
            <>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {cart.map((item) => {
                  const material = materials.find((entry) => entry.id === item.materialId);
                  if (!material) return null;
                  return (
                    <div key={item.materialId} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{material.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} {material.unit}</p>
                        {item.notes ? <p className="text-xs italic text-muted-foreground">Notas: {item.notes}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.materialId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trabajo asociado</span>
                  <span className="font-semibold">{getOrderLabel(selectedJobId)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unidades totales</span>
                  <span className="text-xl font-bold">{cartUnits}</span>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowCart(false)}>
                  Cancelar
                </Button>
                <Button onClick={submitRequest} disabled={submitting} className="bg-[#d6a85a] text-white hover:bg-[#c3964b]">
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
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
