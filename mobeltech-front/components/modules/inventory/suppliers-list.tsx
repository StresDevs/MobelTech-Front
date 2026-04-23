'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SUPPLIERS } from '@/lib/mock-data';
import { Phone, Mail, MapPin, Plus, Edit } from 'lucide-react';

export function SuppliersList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Proveedores</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPLIERS.map((supplier) => (
          <Card key={supplier.id} className="p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold">{supplier.name}</h3>
                <p className="text-xs text-muted-foreground">ID: {supplier.id}</p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{supplier.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{supplier.address}</span>
              </div>
            </div>

            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Productos que proporciona:</p>
              <div className="flex flex-wrap gap-1">
                {supplier.productsProvided.map((product) => (
                  <Badge key={product} variant="outline" className="text-xs">
                    {product}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" className="flex-1">
                Ver Productos
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
