'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useMemo, useState } from 'react';

export function ClientList() {
  type ClientItem = {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address: string;
    status: 'active' | 'inactive';
    createdAt: string | Date;
    updatedAt: string | Date;
  };

  const apiBase = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL?.trim();
    return value ? value.replace(/\/$/, '') : '';
  }, []);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '' });

  async function loadClients() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/clients`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudieron cargar los clientes');
      const data = await response.json();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  function resetForm() {
    setForm({ name: '', phone: '', address: '', email: '' });
    setEditingId(null);
  }

  function openCreateDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(client: ClientItem) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone,
      address: client.address,
      email: client.email ?? '',
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) return;

    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      email: form.email.trim() || null,
    };

    try {
      const response = await fetch(
        editingId ? `${apiBase}/api/clients/${editingId}` : `${apiBase}/api/clients`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error(editingId ? 'No se pudo actualizar el cliente' : 'No se pudo crear el cliente');

      await loadClients();
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cliente');
    }
  }

  async function handleDelete(clientId: string) {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/clients/${clientId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar el cliente');
      await loadClients();
      if (editingId === clientId) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando cliente');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes Registrados</h2>
        <Dialog open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección *</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit} style={{ backgroundColor: '#d6a85a', color: '#fff' }}>
                {editingId ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Card className="p-3 border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}

      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Cargando clientes...</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="p-4 border border-border hover:border-accent transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Registrado: {new Date(client.createdAt).toLocaleDateString('es-BO')}
                  </p>
                </div>
                <Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
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
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(client)}>Editar</Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => void handleDelete(client.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
