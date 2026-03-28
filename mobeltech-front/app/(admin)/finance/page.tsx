'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectFinances } from '@/components/modules/finance/project-finances';
import { InvoiceList } from '@/components/modules/finance/invoice-list';
import { TrendingUp, FileText } from 'lucide-react';

export default function FinancePage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground mt-2">Gestión financiera, rentabilidad y facturas</p>
        </div>

        <Tabs defaultValue="profitability" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profitability" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Rentabilidad
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              Facturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="mt-6">
            <ProjectFinances />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
