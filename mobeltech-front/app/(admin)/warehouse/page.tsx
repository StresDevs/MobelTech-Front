'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Pencil, Plus, Trash2, Warehouse } from 'lucide-react';

type WarehouseLocation = {
  id: string;
  name: string;
  code: string;
  status: string;
};

function readError(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const payload = data as { error?: string; message?: string };
    return payload.error || payload.message || fallback;
  }
  return fallback;
}

export default function WarehousePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLocations() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/inventory/warehouses`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudieron cargar las ubicaciones.'));
      setLocations(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las ubicaciones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, [apiBase]);

  async function createLocation() {
    if (!name.trim()) {
      setError('Escribe el nombre de la ubicación.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo crear la ubicación.'));
      setName('');
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  async function updateLocation() {
    if (!editingId || !editingName.trim()) {
      setError('Escribe el nombre de la ubicación.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/inventory/warehouses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo actualizar la ubicación.'));
      setEditingId(null);
      setEditingName('');
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(locationId: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/inventory/warehouses/${locationId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo eliminar la ubicación.'));
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <main className="space-y-5 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ubicaciones</h1>
          <p className="text-sm text-muted-foreground">Crea ubicaciones internas para asignarlas a los ítems de inventario.</p>
        </div>

        {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Nueva ubicación</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Estantería 2 lado izquierdo" />
            <Button onClick={() => void createLocation()} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Ubicación</TableHead>
                <TableHead>Código interno</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : locations.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No hay ubicaciones creadas.</TableCell></TableRow>
              ) : locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    {editingId === location.id ? (
                      <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                    ) : (
                      <span className="font-medium">{location.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{location.code}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {editingId === location.id ? (
                        <>
                          <Button size="sm" onClick={() => void updateLocation()} disabled={saving}>Guardar</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingName(''); }} disabled={saving}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingId(location.id); setEditingName(location.name); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => void deleteLocation(location.id)} disabled={saving}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </AppLayout>
  );
}
