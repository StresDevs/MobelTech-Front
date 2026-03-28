'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersList } from '@/components/modules/production/orders-list';
import { OrderDetail } from '@/components/modules/production/order-detail';
import { ContractorPayments } from '@/components/modules/production/contractor-payments';
import { ContractorWarehouse } from '@/components/modules/contractors/contractor-warehouse';
import { Package, CheckCircle, DollarSign, Warehouse } from 'lucide-react';

export default function ProductionPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Producción</h1>
          <p className="text-muted-foreground mt-2">Gestión de órdenes, seguimiento y pagos a contratistas</p>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              Órdenes
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Seguimiento
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="gap-2">
              <Warehouse className="w-4 h-4" />
              Almacén
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Pagos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <OrdersList />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <OrderDetail />
          </TabsContent>

          <TabsContent value="warehouse" className="mt-6">
            <ContractorWarehouse contractorId="contr-1" />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <ContractorPayments />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
