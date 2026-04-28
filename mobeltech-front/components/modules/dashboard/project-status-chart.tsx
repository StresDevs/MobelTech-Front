'use client';

import { Card } from '@/components/ui/card';
import { PROJECTS } from '@/lib/mock-data';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

export function ProjectStatusChart() {
  const statusCounts = {
    quotation: PROJECTS.filter(p => p.status === 'quotation').length,
    production: PROJECTS.filter(p => p.status === 'production').length,
    delivered: PROJECTS.filter(p => p.status === 'delivered').length,
  };

  const chartData = [
    { name: 'Cotización', value: statusCounts.quotation, color: '#f59e0b' },
    { name: 'Producción', value: statusCounts.production, color: '#d6a85a' },
    { name: 'Entregado', value: statusCounts.delivered, color: '#10b981' },
  ].filter(item => item.value > 0);

  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-6">Proyectos por Estado</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${value} proyecto${(value as number) > 1 ? 's' : ''}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No hay proyectos para mostrar
        </div>
      )}
    </Card>
  );
}
