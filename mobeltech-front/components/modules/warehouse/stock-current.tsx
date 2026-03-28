'use client';

import { Card } from '@/components/ui/card';
import { MATERIALS, STOCK_MOVEMENTS } from '@/lib/mock-data';

export function StockCurrent() {
  const calculateStock = (materialId: string) => {
    const material = MATERIALS.find(m => m.id === materialId);
    if (!material) return { available: 0, reserved: 0, realAvailable: 0 };

    // Calculate current stock from movements
    const movements = STOCK_MOVEMENTS.filter(m => m.materialId === materialId);
    let stock = material.stock;

    movements.forEach((movement) => {
      if (movement.type === 'entry') {
        stock += movement.quantity;
      } else if (movement.type === 'exit' || movement.type === 'damage') {
        stock -= movement.quantity;
      }
    });

    const reserved = Math.random() * 10; // Simulated reserved stock
    const realAvailable = Math.max(stock - reserved, 0);

    return {
      available: Math.round(stock),
      reserved: Math.round(reserved),
      realAvailable: Math.round(realAvailable),
    };
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Stock Actual</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Material</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Unidad</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Disponible</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Reservado</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Real Disponible</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">% Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            {MATERIALS.map((material) => {
              const stock = calculateStock(material.id);
              const percentage = stock.available > 0 ? (stock.realAvailable / stock.available) * 100 : 0;
              const color = percentage > 50 ? '#10b981' : percentage > 25 ? '#f59e0b' : '#ef4444';

              return (
                <tr key={material.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-sm">{material.name}</p>
                  </td>
                  <td className="py-3 px-4 text-xs">{material.unit}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm">{stock.available}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: '#f59e0b' }}>
                    {stock.reserved}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm" style={{ color, fontWeight: 'bold' }}>
                    {stock.realAvailable}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-xs">{Math.round(percentage)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card className="p-4 border border-border bg-muted">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{MATERIALS.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stock Bajo</p>
            <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
              {MATERIALS.filter(m => m.stock < 30).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Movimientos</p>
            <p className="text-2xl font-bold">{STOCK_MOVEMENTS.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
