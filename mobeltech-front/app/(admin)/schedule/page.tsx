'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { GanttSchedule } from '@/components/modules/production/gantt-schedule';

export default function SchedulePage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <GanttSchedule />
      </div>
    </AppLayout>
  );
}
