'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  PackageOpen,
  Search,
  Truck,
} from 'lucide-react';

type MaterialOrderStatus = 'pending' | 'approved' | 'delivered' | 'observed';

const STATUS_CONFIG: Record<MaterialOrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Aprobado', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  observed: { label: 'Observado', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const ORDERS = [
  {
    id: 'MR-1027',
    contractor: 'Daniel G',
    project: 'Escritorios oficina central',
    requestedAt: '17/06/2026',
    status: 'pending' as MaterialOrderStatus,
    items: [
      { name: 'Melamina blanca 18mm', quantity: '6 placas' },
      { name: 'Tapacanto PVC nogal', quantity: '40 m' },
      { name: 'Tornillo confirmat', quantity: '120 u' },
    ],
  },
  {
    id: 'MR-1026',
    contractor: 'Rosa Méndez',
    project: 'Recepción showroom',
    requestedAt: '16/06/2026',
    status: 'approved' as MaterialOrderStatus,
    items: [
      { name: 'MDF RH 15mm', quantity: '4 placas' },
      { name: 'Bisagra cazoleta', quantity: '18 u' },
    ],
  },
  {
    id: 'MR-1022',
    contractor: 'Carlos Lima',
    project: 'Mueble bajo cocina',
    requestedAt: '14/06/2026',
    status: 'observed' as MaterialOrderStatus,
    items: [
      { name: 'Corredera telescópica', quantity: '10 pares' },
      { name: 'Tirador aluminio', quantity: '8 u' },
    ],
  },
  {
    id: 'MR-1019',
    contractor: 'Ana Salvatierra',
    project: 'Closet dormitorio principal',
    requestedAt: '12/06/2026',
    status: 'delivered' as MaterialOrderStatus,
    items: [
      { name: 'Melamina roble', quantity: '9 placas' },
      { name: 'Riel corredizo', quantity: '2 juegos' },
    ],
  },
];

function getTotalItems() {
  return ORDERS.reduce((total, order) => total + order.items.length, 0);
}

export default function FinanceOrdersPage() {
  const pendingCount = ORDERS.filter((order) => order.status === 'pending').length;
  const approvedCount = ORDERS.filter((order) => order.status === 'approved').length;
  const deliveredCount = ORDERS.filter((order) => order.status === 'delivered').length;
  const observedCount = ORDERS.filter((order) => order.status === 'observed').length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Pedidos de material</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Control de pedidos</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Seguimiento claro de solicitudes, aprobación y entrega de materiales para producción.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar pedido
            </Button>
            <Button className="gap-2" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
              <ClipboardList className="h-4 w-4" />
              Revisar pendientes
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pendientes" value={String(pendingCount)} tone="amber" />
          <MetricCard icon={<PackageCheck className="h-4 w-4" />} label="Aprobados" value={String(approvedCount)} tone="blue" />
          <MetricCard icon={<Truck className="h-4 w-4" />} label="Entregados" value={String(deliveredCount)} tone="emerald" />
          <MetricCard icon={<AlertCircle className="h-4 w-4" />} label="Observados" value={String(observedCount)} tone="rose" />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Bandeja de pedidos</p>
                <p className="text-xs text-muted-foreground">{ORDERS.length} solicitudes · {getTotalItems()} líneas de material</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <Badge key={status} variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {ORDERS.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              return (
                <article key={order.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">{order.id}</Badge>
                      <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
                    </div>
                    <h2 className="mt-3 text-base font-semibold">{order.project}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.contractor} · Solicitado el {order.requestedAt}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.name}`} className="rounded-md border border-border bg-background p-3">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eab676]/20 text-[#9a6b2f]">
                        <PackageOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Resumen del pedido</p>
                        <p className="text-xs text-muted-foreground">{order.items.length} materiales solicitados</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#eab676]"
                        style={{ width: order.status === 'delivered' ? '100%' : order.status === 'approved' ? '66%' : order.status === 'pending' ? '35%' : '20%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {order.status === 'observed'
                        ? 'Requiere corrección antes de aprobar.'
                        : order.status === 'delivered'
                        ? 'Material entregado y listo para producción.'
                        : 'Pendiente de cierre administrativo.'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'amber' | 'blue' | 'emerald' | 'rose' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <Card className={`border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/70">
          {icon}
        </div>
      </div>
    </Card>
  );
}
