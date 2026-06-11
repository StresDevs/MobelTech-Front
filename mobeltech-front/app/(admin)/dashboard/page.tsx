 'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/use-role-context';
import { AppLayout } from '@/components/layout/app-layout';
import { KPICards } from '@/components/modules/dashboard/kpi-cards';
import { RevenueChart } from '@/components/modules/dashboard/revenue-chart';
import { ProjectStatusChart } from '@/components/modules/dashboard/project-status-chart';
import { ActiveProjectsTable } from '@/components/modules/dashboard/active-projects-table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panel Ejecutivo</h1>
            <p className="text-muted-foreground mt-2">Resumen de métricas y análisis financiero</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </Button>
        </div>

        <KPICards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <ProjectStatusChart />
        </div>

        <ActiveProjectsTable />
      </div>
    </AppLayout>
  );
}
