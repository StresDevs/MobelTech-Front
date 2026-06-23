'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';

type ProductionPhase = 'cortado' | 'canteado' | 'ensamblado' | 'instalacion' | 'entregado';

type Contractor = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
};

type Quotation = {
  id: string;
  clientId: string;
  items?: Array<{ description: string; quantity: number }>;
};

type ProductionOrder = {
  id: string;
  quotationId?: string | null;
  assignedContractorId?: string | null;
  startDate: string;
  estimatedDeliveryDate: string;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    progress?: number;
  }>;
};

const PHASES: Array<{ value: ProductionPhase; label: string; progress: number }> = [
  { value: 'cortado', label: 'Corte', progress: 20 },
  { value: 'canteado', label: 'Canteado', progress: 40 },
  { value: 'ensamblado', label: 'Ensamblado', progress: 60 },
  { value: 'instalacion', label: 'Instalación', progress: 80 },
  { value: 'entregado', label: 'Entrega', progress: 100 },
];

function getProgress(order: ProductionOrder) {
  return Math.round(order.items.reduce((sum, item) => sum + (item.progress || 0), 0) / (order.items.length || 1));
}

function getPhaseLabel(progress: number) {
  return [...PHASES].reverse().find((phase) => progress >= phase.progress)?.label ?? 'Sin iniciar';
}

export default function ProjectStatusPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clientFilter, setClientFilter] = useState('all');
  const [contractorFilter, setContractorFilter] = useState('all');
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!apiBase) {
        setError('Falta configurar NEXT_PUBLIC_API_URL.');
        setLoading(false);
        return;
      }

      try {
        const [ordersResponse, contractorsResponse, clientsResponse, quotationsResponse] = await Promise.all([
          fetch(`${apiBase}/api/production-orders`, { cache: 'no-store' }),
          fetch(`${apiBase}/api/contractors`, { cache: 'no-store' }),
          fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
          fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        ]);

        if (!ordersResponse.ok) throw new Error('No se pudieron cargar los trabajos.');
        if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas.');
        if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes.');
        if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones.');

        setOrders(await ordersResponse.json());
        setContractors(await contractorsResponse.json());
        setClients(await clientsResponse.json());
        setQuotations(await quotationsResponse.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando estado de proyectos.');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [apiBase]);

  const quotationsById = useMemo(() => new Map(quotations.map((quotation) => [quotation.id, quotation])), [quotations]);
  const contractorsById = useMemo(() => new Map(contractors.map((contractor) => [contractor.id, contractor.name])), [contractors]);
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const quotation = quotationsById.get(order.quotationId ?? '');
      const clientId = quotation?.clientId ?? '';
      const start = order.startDate ? new Date(order.startDate) : null;
      const end = order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate) : null;
      const matchesClient = clientFilter === 'all' || clientId === clientFilter;
      const matchesContractor = contractorFilter === 'all' || order.assignedContractorId === contractorFilter;
      const matchesStart = !startFilter || (start && start >= new Date(startFilter));
      const matchesEnd = !endFilter || (end && end <= new Date(endFilter));
      return matchesClient && matchesContractor && matchesStart && matchesEnd;
    });
  }, [clientFilter, contractorFilter, endFilter, orders, quotationsById, startFilter]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <PageLoadingState title="Cargando estado" description="Consultando etapas de contratistas..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6b2f]">Estado de proyecto</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Etapas de contratistas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vista sencilla para ver en qué etapa está cada contratista.
          </p>
        </div>

        {error ? <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card> : null}

        <Card className="grid gap-3 p-4 md:grid-cols-4">
          <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Todos los clientes</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select value={contractorFilter} onChange={(event) => setContractorFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Todos los contratistas</option>
            {contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}
          </select>
          <Input type="date" value={startFilter} onChange={(event) => setStartFilter(event.target.value)} />
          <Input type="date" value={endFilter} onChange={(event) => setEndFilter(event.target.value)} />
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trabajo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contratista</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etapa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avance</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fechas</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay trabajos con esos filtros.</td>
                  </tr>
                ) : filteredOrders.map((order) => {
                  const quotation = quotationsById.get(order.quotationId ?? '');
                  const progress = getProgress(order);
                  return (
                    <tr key={order.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-4 py-3">{clientsById.get(quotation?.clientId ?? '') ?? 'Sin cliente'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{quotation?.items?.[0]?.description || order.items[0]?.description || 'Trabajo sin detalle'}</p>
                        <p className="text-xs text-muted-foreground">{order.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">{contractorsById.get(order.assignedContractorId ?? '') ?? 'Sin contratista'}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{getPhaseLabel(progress)}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-[#d6a85a]" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="font-medium">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(order.startDate).toLocaleDateString('es-BO')} - {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-BO')}
                      </td>
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
