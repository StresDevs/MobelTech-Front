'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuppliersList } from '@/components/modules/inventory/suppliers-list';
import { MaterialsCatalog } from '@/components/modules/inventory/materials-catalog';
import { PurchaseOrders } from '@/components/modules/inventory/purchase-orders';
import { Store, Package, ShoppingCart } from 'lucide-react';

export default function InventoryPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventario y Compras</h1>
          <p className="text-muted-foreground mt-2">Gestión de proveedores, materiales y órdenes de compra</p>
        </div>

        <Tabs defaultValue="suppliers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suppliers" className="gap-2">
              <Store className="w-4 h-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Package className="w-4 h-4" />
              Materiales
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Compras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-6">
            <SuppliersList />
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <MaterialsCatalog />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <PurchaseOrders />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
