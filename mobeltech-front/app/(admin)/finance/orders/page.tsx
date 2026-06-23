'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Search } from 'lucide-react';

type SupplierRecord = {
  id: string;
  name: string;
};

type PurchaseOrderRecord = {
  id: string;
  supplierId: string;
  referenceCode: string;
  status: string;
  orderedAt: string;
  items: Array<{
    quantity: number;
    unitPriceBs: number;
  }>;
};

type InventoryOverview = {
  suppliers: SupplierRecord[];
  purchaseOrders: PurchaseOrderRecord[];
};

function formatBs(amount: number) {
  return `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinanceOrdersPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState<InventoryOverview>({ suppliers: [], purchaseOrders: [] });

  useEffect(() => {
    async function loadOrders() {
      if (!apiBase) {
        setError('Falta configurar NEXT_PUBLIC_API_URL.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/inventory/overview`, { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudieron cargar las órdenes de compra.');
        setOverview(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando órdenes.');
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, [apiBase]);

  const suppliersById = useMemo(
    () => new Map(overview.suppliers.map((supplier) => [supplier.id, supplier.name])),
    [overview.suppliers],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return overview.purchaseOrders;
    return overview.purchaseOrders.filter((order) => {
      const supplierName = suppliersById.get(order.supplierId) ?? '';
      return [order.referenceCode, order.status, supplierName].some((value) => value.toLowerCase().includes(query));
    });
  }, [overview.purchaseOrders, search, suppliersById]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <PageLoadingState title="Cargando órdenes" description="Consultando historial de órdenes de compra..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6b2f]">Historial</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Órdenes de compra</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Resumen simple de órdenes globales y compras registradas.
          </p>
        </div>

        {error ? <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card> : null}

        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por referencia, proveedor o estado..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referencia</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proveedor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ítems</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay órdenes para mostrar.</td>
                  </tr>
                ) : filteredOrders.map((order) => {
                  const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceBs, 0);
                  return (
                    <tr key={order.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-4 py-3 font-medium">{order.referenceCode}</td>
                      <td className="px-4 py-3">{suppliersById.get(order.supplierId) ?? 'Proveedor no encontrado'}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{order.status}</Badge></td>
                      <td className="px-4 py-3">{new Date(order.orderedAt).toLocaleDateString('es-BO')}</td>
                      <td className="px-4 py-3 text-right">{order.items.length}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatBs(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
