'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { INVOICES, PROJECTS, CLIENTS } from '@/lib/mock-data';
import { Plus, Download, Eye } from 'lucide-react';

export function InvoiceList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Facturas</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Factura
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Número</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Monto</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((invoice) => {
              const project = PROJECTS.find(p => p.id === invoice.projectId);
              const client = CLIENTS.find(c => c.id === invoice.clientId);

              return (
                <tr key={invoice.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono font-semibold text-sm">{invoice.number}</td>
                  <td className="py-3 px-4">{project?.name}</td>
                  <td className="py-3 px-4 text-sm">{client?.name}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    Bs. {invoice.amount.toLocaleString('es-BO')}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {invoice.issueDate.toLocaleDateString('es-BO')}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        invoice.status === 'facturado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {invoice.status === 'facturado' ? 'Facturado' : 'Sin Factura'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
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
            <p className="text-xs text-muted-foreground">Total Facturas</p>
            <p className="text-2xl font-bold">{INVOICES.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Facturadas</p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
              {INVOICES.filter(i => i.status === 'facturado').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sin Factura</p>
            <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
              {INVOICES.filter(i => i.status === 'sin-factura').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Facturado</p>
            <p className="text-2xl font-bold">
              Bs. {INVOICES.reduce((sum, i) => sum + i.amount, 0).toLocaleString('es-BO')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
