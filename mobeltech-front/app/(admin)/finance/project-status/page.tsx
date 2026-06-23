"use client";

import { AppLayout } from '@/components/layout/app-layout';
import { ActiveProjectsTable } from '@/components/modules/dashboard/active-projects-table';
import { ProjectStatusChart } from '@/components/modules/dashboard/project-status-chart';
import { ProjectFinances } from '@/components/modules/finance/project-finances';
import { Card } from '@/components/ui/card';
import { PROJECTS } from '@/lib/mock-data';
import { BarChart3, Building2, TrendingUp, Wallet } from 'lucide-react';

export default function ProjectStatusPage() {
  const activeProjects = PROJECTS.filter((project) => project.status !== 'delivered').length;
  const deliveredProjects = PROJECTS.filter((project) => project.status === 'delivered').length;
  const quotationProjects = PROJECTS.filter((project) => project.status === 'quotation').length;
  const productionProjects = PROJECTS.filter((project) => project.status === 'production').length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(214,168,90,0.2),rgba(255,255,255,0.96))] p-6 shadow-sm dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(24,24,24,0.96))]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Estado de proyecto</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Seguimiento visual de cada proyecto</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Consulta avance, rentabilidad y relaciones operativas para mantener controlado el flujo completo del proyecto.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <HeroStat icon={<Building2 className="h-4 w-4" />} label="Activos" value={String(activeProjects)} />
              <HeroStat icon={<TrendingUp className="h-4 w-4" />} label="Entregados" value={String(deliveredProjects)} />
              <HeroStat icon={<Wallet className="h-4 w-4" />} label="En cotización" value={String(quotationProjects)} />
              <HeroStat icon={<BarChart3 className="h-4 w-4" />} label="En producción" value={String(productionProjects)} />
            </div>
          </div>
        </Card>

        <ProjectFinances />

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <ProjectStatusChart />
          <ActiveProjectsTable />
        </div>
      </div>
    </AppLayout>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
