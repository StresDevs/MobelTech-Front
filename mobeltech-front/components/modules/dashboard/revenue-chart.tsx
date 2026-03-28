'use client';

import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const chartData = [
  { month: 'Enero', ingresos: 35000, gastos: 28000 },
  { month: 'Febrero', ingresos: 42000, gastos: 31000 },
  { month: 'Marzo', ingresos: 38000, gastos: 29000 },
  { month: 'Abril', ingresos: 48000, gastos: 35000 },
  { month: 'Mayo', ingresos: 45000, gastos: 38000 },
  { month: 'Junio', ingresos: 52000, gastos: 40000 },
];

export function RevenueChart() {
  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-6">Ingresos vs Gastos - Últimos 6 Meses</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
            }}
            formatter={(value) => `Bs. ${(value as number).toLocaleString('es-BO')}`}
          />
          <Legend />
          <Bar dataKey="ingresos" fill="#d6a85a" name="Ingresos" radius={[8, 8, 0, 0]} />
          <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
