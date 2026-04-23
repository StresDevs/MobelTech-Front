'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Construction } from 'lucide-react';

export default function QuotationsPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cotización</h1>
          <p className="text-muted-foreground mt-2">Gestión de cotizaciones</p>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Construction className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">En construcción</h2>
          <p className="text-sm text-muted-foreground/60 mt-1">Este módulo estará disponible próximamente</p>
        </div>
      </div>
    </AppLayout>
  );
}
