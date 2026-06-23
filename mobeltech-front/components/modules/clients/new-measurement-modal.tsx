 'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useLocalData } from '@/lib/contexts/LocalDataContext';
export function NewMeasurementModal({ onMeasurementAdded }: { onMeasurementAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', address: '', email: '' });
  const { clients, addClient } = useLocalData();

  const handleSelectClient = (clientId: string) => {
    setSelectedClient(clientId);
    setOpen(false);
    onMeasurementAdded?.();
  };

  const handleAddNewClient = () => {
    if (!newClientData.name.trim() || !newClientData.phone.trim() || !newClientData.address.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    const created = addClient({ name: newClientData.name.trim(), phone: newClientData.phone.trim(), address: newClientData.address.trim(), email: newClientData.email.trim() });
    setNewClientData({ name: '', phone: '', address: '', email: '' });
    setOpen(false);
    // select the new client and notify
    setSelectedClient(created.id);
    onMeasurementAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}>
          <Plus className="w-4 h-4" />
          Nueva Solicitud de Medición
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Medición</DialogTitle>
          <DialogDescription>
            Selecciona un cliente existente o crea uno nuevo para agendar la medición.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Cliente Existente</TabsTrigger>
            <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
          </TabsList>

          {/* Tab: Existing Client */}
          <TabsContent value="existing" className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Selecciona un cliente de la lista para agendar una medición</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clients.map((client) => (
                <Card
                  key={client.id}
                  className="p-4 cursor-pointer hover:bg-accent/10 transition-colors border-2 hover:border-amber-300"
                  onClick={() => handleSelectClient(client.id)}
                >
                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.phone}</p>
                  <p className="text-sm text-muted-foreground">{client.address}</p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClient(client.id);
                      }}
                      style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}
                    >
                      Seleccionar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab: New Client */}
          <TabsContent value="new" className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Crea un nuevo cliente y agenda una medición</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Cliente *</Label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  placeholder="+591-2-1234567"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  placeholder="Calle y número"
                  value={newClientData.address}
                  onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="cliente@example.com"
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button style={{ backgroundColor: '#d6a85a', color: '#ffffff' }} onClick={handleAddNewClient}>Agregar Cliente y Agendar</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
