'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MATERIALS, CONTRACTORS } from '@/lib/mock-data';
import { CURRENCY_FORMAT } from '@/lib/constants';
import { ShoppingCart, X, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CartItem {
  materialId: string;
  quantity: number;
  notes: string;
}

export function ContractorWarehouse({ contractorId }: { contractorId: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const contractor = CONTRACTORS.find(c => c.id === contractorId);

  const handleAddToCart = (materialId: string) => {
    const qty = quantities[materialId] || 0;
    if (qty <= 0) {
      alert('Por favor ingresa una cantidad válida');
      return;
    }

    const existingItem = cart.find(item => item.materialId === materialId);
    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.notes = notes[materialId] || existingItem.notes;
    } else {
      cart.push({
        materialId,
        quantity: qty,
        notes: notes[materialId] || '',
      });
    }
    
    setCart([...cart]);
    setQuantities({ ...quantities, [materialId]: 0 });
    setNotes({ ...notes, [materialId]: '' });
  };

  const handleRemoveFromCart = (materialId: string) => {
    setCart(cart.filter(item => item.materialId !== materialId));
  };

  const handleSubmitRequest = () => {
    if (cart.length === 0) {
      alert('Por favor agrega al menos un material');
      return;
    }

    // Simular envío de solicitud
    console.log('Solicitud enviada:', {
      contractorId,
      items: cart,
      date: new Date(),
    });

    setSuccessMessage(`Solicitud enviada exitosamente por ${contractor?.name}`);
    setCart([]);
    setTimeout(() => {
      setShowDialog(false);
      setSuccessMessage('');
    }, 2000);
  };

  const cartTotal = cart.reduce((sum, item) => {
    const material = MATERIALS.find(m => m.id === item.materialId);
    return sum + (material?.unitPrice || 0) * item.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Almacén de Materiales</h2>
          <p className="text-muted-foreground mt-1">Solicita materiales para tu proyecto</p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="gap-2"
          style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}
        >
          <ShoppingCart className="w-4 h-4" />
          Mi Carrito ({cart.length})
        </Button>
      </div>

      {/* Materiales Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MATERIALS.map((material) => {
          const cartItem = cart.find(item => item.materialId === material.id);
          
          return (
            <Card key={material.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{material.name}</h3>
                  <p className="text-sm text-muted-foreground">{material.unit}</p>
                </div>
                {cartItem && (
                  <Badge style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}>
                    {cartItem.quantity} en carrito
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{CURRENCY_FORMAT}{material.unitPrice}</span>
                <span className="text-xs text-muted-foreground">por {material.unit}</span>
              </div>

              <div className="flex items-center gap-1 bg-muted/50 p-2 rounded">
                <span className="text-xs text-muted-foreground">Stock:</span>
                <span className="text-sm font-medium">{material.stock}</span>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Cantidad"
                    value={quantities[material.id] || ''}
                    onChange={(e) => setQuantities({ ...quantities, [material.id]: parseInt(e.target.value) || 0 })}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(material.id)}
                    style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}
                  >
                    Agregar
                  </Button>
                </div>
                
                <Input
                  placeholder="Notas (opcional)"
                  value={notes[material.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [material.id]: e.target.value })}
                  className="text-sm"
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal del Carrito */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mi Solicitud de Materiales</DialogTitle>
          </DialogHeader>

          {successMessage ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-lg font-semibold">{successMessage}</p>
              <p className="text-sm text-muted-foreground">La solicitud ha sido enviada al administrador</p>
            </div>
          ) : (
            <>
              {cart.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map((item) => {
                    const material = MATERIALS.find(m => m.id === item.materialId);
                    if (!material) return null;
                    
                    const subtotal = material.unitPrice * item.quantity;
                    
                    return (
                      <div key={item.materialId} className="flex gap-4 p-3 border border-border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold">{material.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {material.unit} × {CURRENCY_FORMAT}{material.unitPrice}
                          </p>
                          {item.notes && (
                            <p className="text-xs italic text-muted-foreground">Notas: {item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{CURRENCY_FORMAT}{subtotal}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.materialId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{CURRENCY_FORMAT}{cartTotal}</span>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmitRequest}
                      style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}
                    >
                      Solicitar Material
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
