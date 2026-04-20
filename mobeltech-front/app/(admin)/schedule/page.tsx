'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { GanttSchedule } from '@/components/modules/production/gantt-schedule';

export default function SchedulePage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cronograma de Producción</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">Gestión de cronogramas de producción con seguimiento en tiempo real</p>
        </div>
        <GanttSchedule />
      </div>
    </AppLayout>
  );
}
