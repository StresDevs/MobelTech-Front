'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STOCK_MOVEMENTS, MATERIALS, PROJECTS } from '@/lib/mock-data';
import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

export function MovementReport() {
  const getMovementType = (type: string) => {
    switch (type) {
      case 'entry':
        return { icon: ArrowUp, color: '#10b981', label: 'Entrada' };
      case 'exit':
        return { icon: ArrowDown, color: '#2e2e2e', label: 'Salida' };
      case 'return':
        return { icon: ArrowUp, color: '#f59e0b', label: 'Devolución' };
      case 'damage':
        return { icon: AlertTriangle, color: '#ef4444', label: 'Daño' };
      default:
        return { icon: ArrowDown, color: '#666', label: 'Otro' };
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reporte de Movimientos</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Material</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipo</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Cantidad</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Notas</th>
            </tr>
          </thead>
          <tbody>
            {STOCK_MOVEMENTS.map((movement) => {
              const material = MATERIALS.find(m => m.id === movement.materialId);
              const project = PROJECTS.find(p => p.id === movement.projectId);
              const movementInfo = getMovementType(movement.type);
              const Icon = movementInfo.icon;

              return (
                <tr key={movement.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 text-xs font-mono">
                    {movement.date.toLocaleDateString('es-BO')}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-sm">{material?.name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className="flex items-center gap-1 w-fit"
                      style={{ backgroundColor: `${movementInfo.color}20`, color: movementInfo.color }}
                    >
                      <Icon className="w-3 h-3" />
                      {movementInfo.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    <span style={{ color: movementInfo.color }}>
                      {movement.type === 'entry' || movement.type === 'return' ? '+' : '-'}
                      {movement.quantity} {material?.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">{project?.name || '-'}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{movement.notes || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="p-4 border border-border bg-muted">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Movimientos</p>
            <p className="text-2xl font-bold">{STOCK_MOVEMENTS.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
              {STOCK_MOVEMENTS.filter(m => m.type === 'entry').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Salidas</p>
            <p className="text-2xl font-bold" style={{ color: '#2e2e2e' }}>
              {STOCK_MOVEMENTS.filter(m => m.type === 'exit').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Daños</p>
            <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
              {STOCK_MOVEMENTS.filter(m => m.type === 'damage').length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
