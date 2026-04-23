'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MEASUREMENTS, CLIENTS } from '@/lib/mock-data';
import { Download, Eye, Clock, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';

export function PrequotationList() {
  const prequotations = useMemo(() => {
    return MEASUREMENTS.map((measurement) => {
      const client = CLIENTS.find(c => c.id === measurement.clientId);
      return {
        ...measurement,
        clientName: client?.name || 'Desconocido',
        status: measurement.quotationDeliveryDate && 
                new Date(measurement.quotationDeliveryDate) > new Date()
                ? 'pending'
                : 'completed',
      };
    });
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />En Progreso</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completada</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {prequotations.map((prequote) => (
          <Card key={prequote.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{prequote.clientName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Muebles: {prequote.furnitureItems.join(', ')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Dirección: {prequote.address}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Medición</p>
                    <p className="font-medium text-foreground">
                      {new Date(prequote.date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entrega Estimada</p>
                    <p className="font-medium text-foreground">
                      {prequote.quotationDeliveryDate
                        ? new Date(prequote.quotationDeliveryDate).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                {getStatusBadge(prequote.status)}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (prequote.prequotationLink) {
                        window.location.href = prequote.prequotationLink;
                      }
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (prequote.prequotationLink) {
                        const link = document.createElement('a');
                        link.href = prequote.prequotationLink;
                        link.download = `precotizacion_${prequote.clientName}.pdf`;
                        link.click();
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {prequotations.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay precotizaciones registradas</p>
        </Card>
      )}
    </div>
  );
}
