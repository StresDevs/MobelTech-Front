import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import AssignedJobs from '@/components/modules/contractor/assigned-jobs';

export default function Page() {
  return (
    <AppLayout>
      <div className="p-6">
        <AssignedJobs />
      </div>
    </AppLayout>
  );
}
