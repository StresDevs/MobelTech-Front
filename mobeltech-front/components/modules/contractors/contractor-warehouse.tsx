"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { CURRENCY_FORMAT } from '@/lib/constants';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, CheckCircle2, PackageSearch, Search, ShoppingCart, Undo2, X } from 'lucide-react';

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
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    try {
      const [materialsResponse, ordersResponse, requestsResponse] = await Promise.all([
        fetch(`${apiBase}/api/materials`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/production-orders?contractorId=${contractorId}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/material-requests?contractorId=${contractorId}`, { cache: 'no-store' }),
      ]);

      if (!materialsResponse.ok) throw new Error('No se pudieron cargar los materiales.');
      if (!ordersResponse.ok) throw new Error('No se pudieron cargar tus trabajos.');
      if (!requestsResponse.ok) throw new Error('No se pudieron cargar tus solicitudes.');

      setMaterials(await materialsResponse.json());
      setOrders(await ordersResponse.json());
      setRequests(await requestsResponse.json());
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
  const rejectedRequests = requests.filter((request) => request.status === 'rejected');

  const cartTotal = cart.reduce((sum, item) => {
    const material = materials.find((entry) => entry.id === item.materialId);
    return sum + (material?.unitPrice ?? 0) * item.quantity;
  }, 0);

  function getOrderLabel(orderId?: string | null) {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return 'Trabajo no encontrado';
    return order.items?.[0]?.description || `Trabajo ${order.id.slice(0, 8)}`;
  }

  function addToCart(materialId: string) {
    const quantity = quantities[materialId] ?? 0;
    if (!selectedJobId) {
      setError('Selecciona primero el trabajo al que pertenece esta solicitud.');
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
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(255,255,255,0.92))] p-5 shadow-sm dark:bg-[linear-gradient(135deg,rgba(234,182,118,0.16),rgba(22,22,22,0.96))]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6b2f]">Solicitud Operativa</p>
            <h2 className="mt-2 text-2xl font-bold">Solicita materiales para tus trabajos</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Busca materiales rapido, arma tu carrito y envia la solicitud al equipo administrativo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Materiales" value={String(materials.length)} />
            <SummaryCard label="Pendientes" value={String(pendingRequests.length)} />
            <SummaryCard label="Observadas" value={String(rejectedRequests.length)} />
          </div>
        </div>
      </Card>

      {feedback ? <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{feedback}</Card> : null}
      {error ? <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium">Trabajo asignado</label>
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecciona un trabajo</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {getOrderLabel(order.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Buscar material</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Melamina, bisagra, tornillo..."
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={() => setShowCart(true)} className="h-11 gap-2 bg-[#d6a85a] text-white hover:bg-[#c3964b]">
              <ShoppingCart className="h-4 w-4" />
              Ver carrito ({cart.length})
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleMaterials.map((material) => {
              const cartItem = cart.find((item) => item.materialId === material.id);
              return (
                <Card key={material.id} className="border-border/70 p-4 shadow-none">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{material.name}</p>
                      <p className="text-sm text-muted-foreground">{material.unit}</p>
                    </div>
                    {cartItem ? (
                      <Badge className="bg-[#d6a85a] text-white">{cartItem.quantity} en carrito</Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Stock</p>
                      <p className="mt-1 text-lg font-semibold">{material.stock}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Referencia</p>
                      <p className="mt-1 text-lg font-semibold">{CURRENCY_FORMAT}{material.unitPrice}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={quantities[material.id] || ''}
                        onChange={(event) => setQuantities((current) => ({ ...current, [material.id]: Number(event.target.value) || 0 }))}
                        placeholder="Cantidad"
                      />
                      <Button onClick={() => addToCart(material.id)} className="bg-[#d6a85a] text-white hover:bg-[#c3964b]">
                        Agregar
                      </Button>
                    </div>
                    <Input
                      value={notes[material.id] || ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [material.id]: event.target.value }))}
                      placeholder="Notas opcionales"
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {visibleMaterials.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <PackageSearch className="mx-auto mb-3 h-10 w-10 opacity-60" />
              <p>No encontramos materiales con esa busqueda.</p>
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Solicitudes pendientes</h3>
                <p className="text-sm text-muted-foreground">Seguimiento rapido de tus envios recientes.</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800">{pendingRequests.length}</Badge>
            </div>
            <ScrollArea className="mt-4 h-[220px]">
              <div className="space-y-3 pr-3">
                {pendingRequests.map((request) => (
                  <StatusCard
                    key={request.id}
                    request={request}
                    title={getOrderLabel(request.productionOrderId)}
                  />
                ))}
                {pendingRequests.length === 0 ? (
                  <EmptyHint icon={<CheckCircle2 className="h-5 w-5" />} text="No tienes solicitudes pendientes." />
                ) : null}
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Solicitudes observadas</h3>
                <p className="text-sm text-muted-foreground">Revisa el motivo, corrige y vuelve a enviar.</p>
              </div>
              <Badge className="bg-rose-100 text-rose-800">{rejectedRequests.length}</Badge>
            </div>
            <ScrollArea className="mt-4 h-[260px]">
              <div className="space-y-3 pr-3">
                {rejectedRequests.map((request) => (
                  <Card key={request.id} className="border-rose-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{getOrderLabel(request.productionOrderId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.requestDate).toLocaleString('es-BO')}
                        </p>
                      </div>
                      <Badge className={STATUS_STYLES.rejected}>Rechazada</Badge>
                    </div>
                    <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                      {request.rejectionComments || 'Sin comentario del administrador.'}
                    </div>
                    <Button variant="outline" className="mt-3 gap-2" onClick={() => reloadRejectedRequest(request)}>
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
          </Card>
        </div>
      </div>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitud de materiales</DialogTitle>
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
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {material.unit} · {CURRENCY_FORMAT}{material.unitPrice}
                        </p>
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
                  <span className="text-sm text-muted-foreground">Referencia total</span>
                  <span className="text-xl font-bold">{CURRENCY_FORMAT}{cartTotal}</span>
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

function StatusCard({ request, title }: { request: MaterialRequest; title: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{new Date(request.requestDate).toLocaleString('es-BO')}</p>
        </div>
        <Badge className={STATUS_STYLES[request.status]}>{request.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{request.items.length} materiales en revision.</p>
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
