'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROJECTS, CLIENTS, PROJECT_FINANCES } from '@/lib/mock-data';

export function ActiveProjectsTable() {
  const activeProjects = PROJECTS.filter(p => p.status !== 'delivered');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quotation':
        return 'bg-yellow-100 text-yellow-800';
      case 'production':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      quotation: 'Cotización',
      production: 'Producción',
      delivered: 'Entregado',
    };
    return labels[status] || status;
  };

  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-6">Proyectos Activos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Presupuesto</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {activeProjects.map((project) => {
              const client = CLIENTS.find(c => c.id === project.clientId);
              const finances = PROJECT_FINANCES.find(f => f.projectId === project.id);
              
              return (
                <tr key={project.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">{project.name}</td>
                  <td className="py-3 px-4">{client?.name || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    Bs. {project.budget.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      style={{
                        color: finances ? '#10b981' : '#666',
                      }}
                    >
                      {finances
                        ? `Bs. ${finances.utilidad.toLocaleString('es-BO')} (${finances.utilidadPercentage.toFixed(1)}%)`
                        : 'N/A'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
