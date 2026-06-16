'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardOverview } from '@/components/modules/dashboard/dashboard-overview';
import { useRole } from '@/hooks/use-role-context';

export default function DashboardPage() {
  const { currentRole } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (currentRole === 'contractor') {
      router.replace('/assigned-jobs');
    }
  }, [currentRole, router]);

  return (
    <AppLayout>
      <div className="p-6">
        <DashboardOverview />
      </div>
    </AppLayout>
  );
}
