'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientList } from '@/components/modules/clients/client-list';
import { MeasurementCalendar } from '@/components/modules/clients/measurement-calendar';
import { PrequotationList } from '@/components/modules/clients/prequotation-list';
import { NewMeasurementModal } from '@/components/modules/clients/new-measurement-modal';
import { Users, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';

export default function ClientsPage() {
  const [refreshMeasurements, setRefreshMeasurements] = useState(0);

  const handleMeasurementAdded = () => {
    setRefreshMeasurements(prev => prev + 1);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mediciones y Clientes</h1>
            <p className="text-muted-foreground mt-2">Gestión de clientes, mediciones y cotizaciones</p>
          </div>
          <NewMeasurementModal onMeasurementAdded={handleMeasurementAdded} />
        </div>

        <Tabs defaultValue="measurements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="measurements" className="gap-2">
              <Calendar className="w-4 h-4" />
              Mediciones
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="prequotations" className="gap-2">
              <FileText className="w-4 h-4" />
              Precotizaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="measurements" className="mt-6">
            <MeasurementCalendar key={refreshMeasurements} />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <ClientList />
          </TabsContent>

          <TabsContent value="prequotations" className="mt-6">
            <PrequotationList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
