'use client';

import { Card } from '@/components/ui/card';
import { PROJECTS, CONTRACTORS } from '@/lib/mock-data';
import { BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function KPICards() {
  // Calculate metrics from mock data
  const activeProjects = PROJECTS.filter(p => p.status !== 'delivered').length;
  
  // Monthly revenue (simulated from advances)
  const monthlyRevenue = 45000;
  
  // Monthly expenses (estimated)
  const monthlyExpenses = 38000;
  
  // Net profit
  const netProfit = monthlyRevenue - monthlyExpenses;
  
  const kpis = [
    {
      label: 'Proyectos Activos',
      value: activeProjects.toString(),
      icon: BarChart3,
      color: '#d6a85a',
      trend: 'up',
      change: '+12%',
    },
    {
      label: 'Ingresos Mensuales',
      value: `Bs. ${monthlyRevenue.toLocaleString('es-BO')}`,
      icon: TrendingUp,
      color: '#10b981',
      trend: 'up',
      change: '+8%',
    },
    {
      label: 'Gastos Mensuales',
      value: `Bs. ${monthlyExpenses.toLocaleString('es-BO')}`,
      icon: TrendingDown,
      color: '#ef4444',
      trend: 'down',
      change: '+5%',
    },
    {
      label: 'Ganancia Neta',
      value: `Bs. ${netProfit.toLocaleString('es-BO')}`,
      icon: Wallet,
      color: '#2e2e2e',
      trend: 'up',
      change: '+15%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="p-6 border border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: `${kpi.color}20`,
                      color: kpi.color,
                    }}
                  >
                    {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                  </span>
                </div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
