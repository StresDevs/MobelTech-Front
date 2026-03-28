'use client';

import { Card } from '@/components/ui/card';
import { PROJECT_FINANCES, PROJECTS } from '@/lib/mock-data';

export function ProjectFinances() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Rentabilidad por Proyecto</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Ingresos</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Materiales</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Mano de Obra</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total Gastos</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Utilidad</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">% Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {PROJECT_FINANCES.map((finance) => {
              const project = PROJECTS.find(p => p.id === finance.projectId);
              const color = finance.utilidadPercentage > 15 ? '#10b981' : finance.utilidadPercentage > 10 ? '#f59e0b' : '#ef4444';

              return (
                <tr key={finance.projectId} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-semibold">{project?.name}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span style={{ color: '#10b981' }}>
                      Bs. {finance.ingresos.total.toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    Bs. {finance.egresos.materials.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    Bs. {finance.egresos.labor.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span style={{ color: '#ef4444' }}>
                      Bs. {finance.egresos.total.toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <span style={{ color }}>
                      Bs. {finance.utilidad.toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <span style={{ color }}>
                      {finance.utilidadPercentage.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="p-4 border border-border bg-muted">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Ingresos</p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
              Bs. {PROJECT_FINANCES.reduce((sum, f) => sum + f.ingresos.total, 0).toLocaleString('es-BO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Gastos</p>
            <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
              Bs. {PROJECT_FINANCES.reduce((sum, f) => sum + f.egresos.total, 0).toLocaleString('es-BO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Utilidad Total</p>
            <p className="text-2xl font-bold" style={{ color: '#d6a85a' }}>
              Bs. {PROJECT_FINANCES.reduce((sum, f) => sum + f.utilidad, 0).toLocaleString('es-BO')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">% Promedio</p>
            <p className="text-2xl font-bold">
              {(PROJECT_FINANCES.reduce((sum, f) => sum + f.utilidadPercentage, 0) / PROJECT_FINANCES.length).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
