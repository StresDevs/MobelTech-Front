'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MATERIALS, SUPPLIERS } from '@/lib/mock-data';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';

export function MaterialsCatalog() {
  const getStockStatus = (stock: number) => {
    if (stock > 100) return { color: '#10b981', label: 'Abundante' };
    if (stock > 30) return { color: '#f59e0b', label: 'Normal' };
    return { color: '#ef4444', label: 'Bajo' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Catálogo de Materiales</h2>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Material
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MATERIALS.map((material) => {
          const supplier = SUPPLIERS.find(s => s.id === material.supplierId);
          const stockStatus = getStockStatus(material.stock);
          const Icon = material.stock > 50 ? TrendingUp : TrendingDown;

          return (
            <Card key={material.id} className="p-4 border border-border hover:border-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{material.name}</h3>
                  <p className="text-xs text-muted-foreground">{supplier?.name}</p>
                </div>
                <Badge className="whitespace-nowrap" style={{ backgroundColor: `${stockStatus.color}20`, color: stockStatus.color }}>
                  {stockStatus.label}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio Unitario</p>
                    <p className="font-semibold text-sm">
                      Bs. {material.unitPrice.toLocaleString('es-BO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unidad</p>
                    <p className="font-semibold text-sm">{material.unit}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Stock</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((material.stock / 200) * 100, 100)}%`,
                          backgroundColor: stockStatus.color,
                        }}
                      />
                    </div>
                    <p className="font-semibold text-sm w-16 text-right">{material.stock}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Última compra</p>
                  <p className="text-xs font-mono">
                    {material.lastPurchaseDate.toLocaleDateString('es-BO')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Editar
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  Solicitar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
