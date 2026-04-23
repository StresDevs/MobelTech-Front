'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { InventoryControlCenter } from '@/components/modules/inventory/inventory-control-center';

export default function InventoryPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventario y Compras</h1>
          <p className="text-muted-foreground mt-2">
            Gestión integral de inventario, proveedores, solicitudes, compras y control de calidad
          </p>
        </div>

        <InventoryControlCenter />
      </div>
    </AppLayout>
  );
}
