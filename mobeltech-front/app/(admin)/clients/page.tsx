'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientList } from '@/components/modules/clients/client-list';
import { MeasurementCalendar } from '@/components/modules/clients/measurement-calendar';
import { Users, Calendar } from 'lucide-react';

export default function ClientsPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mediciones y Clientes</h1>
          <p className="text-muted-foreground mt-2">Gestión de clientes y mediciones</p>
        </div>

        <Tabs defaultValue="measurements" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="measurements" className="gap-2">
              <Calendar className="w-4 h-4" />
              Mediciones
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="measurements" className="mt-6">
            <MeasurementCalendar />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <ClientList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
