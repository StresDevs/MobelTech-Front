'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { GanttSchedule } from '@/components/modules/production/gantt-schedule';
import { useSearchParams } from 'next/navigation';

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const embedded = searchParams.get('embedded') === '1';

  if (embedded) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-5">
        <GanttSchedule />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <GanttSchedule />
      </div>
    </AppLayout>
  );
}
