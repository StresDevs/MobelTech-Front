'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockCurrent } from '@/components/modules/warehouse/stock-current';
import { MovementReport } from '@/components/modules/warehouse/movement-report';
import { Package, TrendingUp } from 'lucide-react';

export default function WarehousePage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Almacén</h1>
          <p className="text-muted-foreground mt-2">Gestión de stock, movimientos y operaciones del almacén</p>
        </div>

        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stock" className="gap-2">
              <Package className="w-4 h-4" />
              Stock Actual
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Movimientos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-6">
            <StockCurrent />
          </TabsContent>

          <TabsContent value="movements" className="mt-6">
            <MovementReport />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
