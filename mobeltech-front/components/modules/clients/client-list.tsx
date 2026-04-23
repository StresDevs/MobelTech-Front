'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CLIENTS } from '@/lib/mock-data';
import { Phone, Mail, MapPin, Plus } from 'lucide-react';

export function ClientList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes Registrados</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {CLIENTS.map((client) => (
          <Card key={client.id} className="p-4 border border-border hover:border-accent transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{client.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Registrado: {client.registrationDate.toLocaleDateString('es-BO')}
                </p>
              </div>
              <Badge
                className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
              >
                {client.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{client.address}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Editar
              </Button>
              <Button variant="ghost" size="sm" className="flex-1">
                Ver Proyectos
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
