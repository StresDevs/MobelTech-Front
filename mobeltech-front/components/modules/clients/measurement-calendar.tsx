'use client';

import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Plus, FileDown, Phone, MapPin, Mail, Clock, Search, UserPlus } from 'lucide-react';

const SLOTS_PER_DAY = 4;
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SLOT_START_TIMES = ['09:00', '11:00', '14:00', '16:00'];

type ApiClient = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

type ApiMeasurement = {
  id: string;
  clientId: string;
  date: string;
  time: string;
  address: string;
  phone: string;
  referenceNotes?: string | null;
  furnitureItems: string[];
  quotationDeliveryDate?: string | null;
  prequotationLink?: string | null;
  notes?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  linkedPrequotation?: {
    id: string;
    title: string;
    status: string;
  } | null;
};

function getUsablePrequotationLink(link?: string | null) {
  const trimmed = link?.trim();
  const normalized = trimmed?.replace(/\/$/, '');
  if (!normalized || normalized === '/prequotations') return null;
  return trimmed;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < today;
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number.parseInt(yearRaw ?? '', 10);
  const month = Number.parseInt(monthRaw ?? '', 10);
  const day = Number.parseInt(dayRaw ?? '', 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return new Date(year, month - 1, day);
}

function getSlotDefaultTime(slotIndex: number) {
  return SLOT_START_TIMES[slotIndex] ?? SLOT_START_TIMES[SLOT_START_TIMES.length - 1];
}

function bumpTimeIfPast(date: Date, time: string) {
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Number.parseInt(hourRaw ?? '0', 10);
  const minute = Number.parseInt(minuteRaw ?? '0', 10);
  const candidate = new Date(date);
  candidate.setHours(Number.isNaN(hour) ? 0 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);

  const now = new Date();
  if (candidate.getTime() <= now.getTime()) {
    candidate.setHours(now.getHours() + 1, 0, 0, 0);
    return `${String(candidate.getHours()).padStart(2, '0')}:${String(candidate.getMinutes()).padStart(2, '0')}`;
  }

  return time;
}

export function MeasurementCalendar() {
  const router = useRouter();
  const apiBase = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL?.trim();
    return value ? value.replace(/\/$/, '') : '';
  }, []);

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [measurements, setMeasurements] = useState<ApiMeasurement[]>([]);
  const [newMeasurementSlot, setNewMeasurementSlot] = useState<{ day: number; slotIndex: number } | null>(null);
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const [missingPrequotationMeasurement, setMissingPrequotationMeasurement] = useState<ApiMeasurement | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    phone: '',
    address: '',
    email: '',
    time: '09:00',
    furnitureItems: '',
    notes: '',
  });

  async function loadData() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [clientsRes, measurementsRes] = await Promise.all([
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/measurements`, { cache: 'no-store' }),
      ]);

      if (!clientsRes.ok) throw new Error('No se pudieron cargar los clientes');
      if (!measurementsRes.ok) throw new Error('No se pudieron cargar las mediciones');

      const clientsJson = (await clientsRes.json()) as ApiClient[];
      const measurementsJson = (await measurementsRes.json()) as ApiMeasurement[];
      setClients(clientsJson);
      setMeasurements(measurementsJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const measurementsByDay = useMemo(() => {
    const map: Record<number, ApiMeasurement[]> = {};
    measurements.forEach((measurement) => {
      const date = parseLocalDate(measurement.date);
      if (!date) return;
      if (date.getFullYear() !== currentDate.getFullYear() || date.getMonth() !== currentDate.getMonth()) return;
      const day = date.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(measurement);
    });
    Object.keys(map).forEach((key) => {
      map[Number(key)] = map[Number(key)].slice().sort((a, b) => a.time.localeCompare(b.time));
    });
    return map;
  }, [currentDate, measurements]);

  const getSlots = (day: number) => {
    const ms = measurementsByDay[day] || [];
    return Array.from({ length: SLOTS_PER_DAY }, (_, i) => ms[i] ?? null);
  };

  const goMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const openNewMeasurement = (day: number, slotIndex: number) => {
    const appointmentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (isPastDate(appointmentDate)) return;
    const suggestedTime = bumpTimeIfPast(appointmentDate, getSlotDefaultTime(slotIndex));

    setNewMeasurementSlot({ day, slotIndex });
    setFormData({
      clientId: '',
      name: '',
      phone: '',
      address: '',
      email: '',
      time: suggestedTime,
      furnitureItems: '',
      notes: '',
    });
    setClientSearchQuery('');
  };

  const closeNewMeasurement = () => setNewMeasurementSlot(null);

  const handleSelectExistingClient = (clientId: string) => {
    const client = clients.find((cl) => cl.id === clientId);
    if (!client) return;
    setFormData((prev) => ({
      ...prev,
      clientId: client.id,
      name: client.name,
      phone: client.phone,
      address: client.address,
      email: client.email ?? '',
    }));
  };

  const handleCreateClient = async () => {
    if (!apiBase) throw new Error('Falta configurar NEXT_PUBLIC_API_URL en el front.');
    const response = await fetch(`${apiBase}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: formData.email.trim() || null,
      }),
    });
    if (!response.ok) throw new Error('No se pudo crear el cliente');
    return (await response.json()) as ApiClient;
  };

  const handleSubmitMeasurement = async () => {
    if (!newMeasurementSlot || saving) return;
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.furnitureItems.trim()) return;

    const appointmentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), newMeasurementSlot.day);
    if (isPastDate(appointmentDate)) {
      setError('No puedes agendar una medición en una fecha pasada.');
      return;
    }

    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let clientId = formData.clientId;
      if (!clientId) {
        const createdClient = await handleCreateClient();
        clientId = createdClient.id;
      }

      const payload = {
        clientId,
        date: toLocalDateString(appointmentDate),
        time: formData.time,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        referenceNotes: formData.notes.trim() || null,
        furnitureItems: formData.furnitureItems
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        quotationDeliveryDate: null,
        prequotationLink: null,
        notes: formData.notes.trim() || null,
        status: 'scheduled',
      };

      const response = await fetch(`${apiBase}/api/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const details = body?.details ? JSON.stringify(body.details) : '';
        throw new Error(details || body?.error || 'No se pudo agendar la medición');
      }

      await loadData();
      closeNewMeasurement();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando la medición');
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || client.phone.includes(clientSearchQuery),
  );

  const detailClient = clientDetailId ? clients.find((client) => client.id === clientDetailId) ?? null : null;

  const handleDocClick = (measurement: ApiMeasurement) => {
    if (measurement.linkedPrequotation) {
      router.push(`/prequotations?prequotationId=${measurement.linkedPrequotation.id}`);
      return;
    }

    const prequotationLink = getUsablePrequotationLink(measurement.prequotationLink);
    if (prequotationLink) {
      router.push(prequotationLink);
      return;
    }

    setMissingPrequotationMeasurement(measurement);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold capitalize">{monthName}</h2>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToday}>
            Hoy
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && <Card className="p-3 border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}
      {loading && <CalendarLoadingState />}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#eab676]" />
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
          No disponible
        </span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5 min-w-[900px]">
          {DAY_NAMES.map((dayName) => (
            <div key={dayName} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 min-w-[900px]">
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`e-${index}`} />
          ))}

          {days.map((day) => {
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const today = isToday(dateObj);
            const past = isPastDate(dateObj);
            const slots = getSlots(day);

            return (
              <Card
                key={day}
                className={`flex flex-col p-0 overflow-hidden ${today ? 'ring-2 ring-[#eab676]' : ''} ${past ? 'opacity-70' : ''}`}
              >
                <div
                  className={`px-2 py-1 text-xs font-bold flex items-center justify-between ${
                    past ? 'bg-red-100 text-red-700' : today ? 'bg-[#eab676] text-[#1f1f1f]' : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <span>{day}</span>
                  {past && <span className="text-[9px] uppercase tracking-wider">No disponible</span>}
                </div>

                <div className="flex flex-col gap-0.5 px-1 pt-1 pb-1 flex-1">
                  <div className="grid grid-cols-[1fr_48px_32px] gap-px px-1 pb-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Cliente</span>
                    <span className="text-center">Hora</span>
                    <span className="text-center">Doc</span>
                  </div>

                  {slots.map((measurement, index) => (
                    <DesktopSlot
                      key={index}
                      measurement={measurement}
                      clients={clients}
                      disabled={past && !measurement}
                      onClickDoc={handleDocClick}
                      onClickAvailable={() => openNewMeasurement(day, index)}
                      onClickClient={(id) => setClientDetailId(id)}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {days.map((day) => {
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const today = isToday(dateObj);
          const past = isPastDate(dateObj);
          const slots = getSlots(day);
          const hasAny = slots.some((slot) => slot !== null);
          const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });

          return (
            <Card key={day} className={`overflow-hidden ${today ? 'ring-2 ring-[#eab676]' : ''} ${past ? 'opacity-70' : ''}`}>
              <div
                className={`px-4 py-2 flex items-center justify-between ${
                  past ? 'bg-red-100 text-red-700' : today ? 'bg-[#eab676] text-[#1f1f1f]' : 'bg-muted/40 text-foreground'
                }`}
              >
                <span className="font-bold text-sm capitalize">
                  {dayName} {day}
                </span>
                {past ? (
                  <Badge className="text-[10px] px-1.5 h-5 bg-red-200 text-red-800">No disponible</Badge>
                ) : hasAny ? (
                  <Badge className="text-[10px] px-1.5 h-5" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                    {slots.filter((slot) => slot).length}/{SLOTS_PER_DAY}
                  </Badge>
                ) : (
                  <Badge className="text-[10px] px-1.5 h-5 bg-emerald-100 text-emerald-700">Disponible</Badge>
                )}
              </div>
              <div className="divide-y divide-border">
                {slots.map((measurement, index) => (
                  <MobileSlot
                    key={index}
                    slotIndex={index}
                    measurement={measurement}
                    clients={clients}
                    disabled={past && !measurement}
                    onClickDoc={handleDocClick}
                    onClickAvailable={() => openNewMeasurement(day, index)}
                    onClickClient={(id) => setClientDetailId(id)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!newMeasurementSlot} onOpenChange={(open) => !open && closeNewMeasurement()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg">
              Agendar Medición
              {newMeasurementSlot && (
                <span className="font-normal text-sm text-muted-foreground ml-2">
                  {newMeasurementSlot.day} de {monthName} · Slot {newMeasurementSlot.slotIndex + 1}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={formData.clientId ? 'existing' : 'new'} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="existing" className="text-xs">
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Cliente Existente
                </TabsTrigger>
                <TabsTrigger value="new" className="text-xs">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Nuevo Cliente
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="existing" className="mt-0 px-6 py-4 space-y-3">
              <Input placeholder="Buscar por nombre o teléfono…" value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} className="h-9" />
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {filteredClients.map((client) => {
                  const selected = formData.clientId === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => handleSelectExistingClient(client.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        selected ? 'border-[#eab676] bg-[#eab676]/10' : 'border-border hover:border-[#eab676]/50 hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.phone} · {client.address}
                      </p>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">No se encontraron clientes</p>}
              </div>
            </TabsContent>

            <TabsContent value="new" className="mt-0 px-6 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input placeholder="Nombre del cliente" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, clientId: '' })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono *</Label>
                  <Input placeholder="+591-2-1234567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dirección *</Label>
                <Input placeholder="Calle y número, ciudad" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input placeholder="email@ejemplo.com" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-9" />
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t border-border px-6 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hora de la medición *</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mueble(s) a realizar *</Label>
              <Textarea
                placeholder="Ej: Escritorio ejecutivo, 2 estanterías…"
                value={formData.furnitureItems}
                onChange={(e) => setFormData({ ...formData, furnitureItems: e.target.value })}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas adicionales</Label>
              <Textarea
                placeholder="Referencias, indicaciones de acceso…"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 gap-2">
            <Button variant="outline" onClick={closeNewMeasurement} className="h-9">
              Cancelar
            </Button>
            <Button
              className="h-9"
              style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
              disabled={saving || !formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.furnitureItems.trim()}
              onClick={handleSubmitMeasurement}
            >
              {saving ? 'Guardando...' : 'Agendar Medición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailClient} onOpenChange={(open) => !open && setClientDetailId(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogTitle className="sr-only">Detalle del cliente</DialogTitle>
          {detailClient && (
            <>
              <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-3" style={{ background: 'linear-gradient(135deg, #eab676 0%, #d6a85a 100%)' }}>
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold text-white">
                  {detailClient.name.charAt(0)}
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-[#1f1f1f]">{detailClient.name}</h3>
                  <Badge className="mt-1 text-[10px]" variant="secondary">
                    {detailClient.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <InfoRow icon={Phone} label="Teléfono" value={detailClient.phone} />
                <InfoRow icon={MapPin} label="Dirección" value={detailClient.address} />
                <InfoRow icon={Mail} label="Email" value={detailClient.email ?? '—'} />
                <InfoRow icon={Clock} label="Registrado" value={new Date(detailClient.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>

              <div className="px-6 pb-5">
                <Button variant="outline" className="w-full h-9" onClick={() => setClientDetailId(null)}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!missingPrequotationMeasurement} onOpenChange={(open) => !open && setMissingPrequotationMeasurement(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg">Sin precotización enlazada</DialogTitle>
          </DialogHeader>

          {missingPrequotationMeasurement && (
            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-5 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full bg-[#eab676]/15 flex items-center justify-center">
                  <FileDown className="h-6 w-6 text-[#d6a85a]" />
                </div>
                <p className="text-base font-semibold">No hay precotizaciones ancladas</p>
                <p className="text-sm text-muted-foreground">
                  Esta medición todavía no tiene una precotización vinculada. ¿Deseas crear una ahora?
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setMissingPrequotationMeasurement(null)}>
                  Cancelar
                </Button>
                <Button
                  style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                  onClick={() => {
                    setMissingPrequotationMeasurement(null);
                    router.push(`/prequotations?measurementId=${missingPrequotationMeasurement.id}&clientId=${missingPrequotationMeasurement.clientId}`);
                  }}
                >
                  Sí, crear una
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarLoadingState() {
  return (
    <PageLoadingState
      title="Cargando calendario de mediciones"
      description="Recuperando clientes, horarios y precotizaciones ancladas..."
      preview={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/60 bg-background/80 p-3">
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              <div className="mt-3 space-y-2">
                <div className="h-8 animate-pulse rounded-xl bg-[#eab676]/18" />
                <div className="h-8 animate-pulse rounded-xl bg-muted/80" />
                <div className="h-8 animate-pulse rounded-xl bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

function DesktopSlot({
  measurement,
  onClickAvailable,
  onClickClient,
  onClickDoc,
  clients,
  disabled,
}: {
  measurement: ApiMeasurement | null;
  onClickAvailable: () => void;
  onClickClient: (id: string) => void;
  onClickDoc: (measurement: ApiMeasurement) => void;
  clients: ApiClient[];
  disabled: boolean;
}) {
  if (!measurement) {
    if (disabled) {
      return (
        <div className="grid grid-cols-[1fr_48px_32px] items-center gap-px rounded border border-dashed border-red-400/60 bg-red-500/10 min-h-[28px] px-1 opacity-80">
          <span className="text-[10px] text-red-700 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
            No disponible
          </span>
          <span />
          <span />
        </div>
      );
    }

    return (
      <button
        onClick={onClickAvailable}
        className="grid grid-cols-[1fr_48px_32px] items-center gap-px rounded border border-dashed border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-400 transition-colors min-h-[28px] px-1 group"
      >
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:font-medium">
          <Plus className="w-3 h-3" />
          Agendar
        </span>
        <span />
        <span />
      </button>
    );
  }

  const client = clients.find((item) => item.id === measurement.clientId);
  const clientName = client?.name ?? 'Cliente';
  const shortName = clientName.length > 14 ? `${clientName.slice(0, 13)}…` : clientName;

  return (
    <div
      className="grid grid-cols-[1fr_48px_32px] items-center gap-px rounded min-h-[28px] px-1"
      style={{ backgroundColor: 'rgba(234,182,118,0.15)', border: '1px solid rgba(234,182,118,0.35)' }}
    >
      <button onClick={() => onClickClient(measurement.clientId)} className="text-left text-[10px] font-medium truncate hover:underline text-foreground" title={clientName}>
        {shortName}
      </button>
      <span className="text-center text-[10px] text-muted-foreground">{measurement.time}</span>
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onClickDoc(measurement)}
          title="Ver documento de precotización"
        >
          <FileDown className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function MobileSlot({
  slotIndex,
  measurement,
  onClickAvailable,
  onClickClient,
  onClickDoc,
  clients,
  disabled,
}: {
  slotIndex: number;
  measurement: ApiMeasurement | null;
  onClickAvailable: () => void;
  onClickClient: (id: string) => void;
  onClickDoc: (measurement: ApiMeasurement) => void;
  clients: ApiClient[];
  disabled: boolean;
}) {
  if (!measurement) {
    if (disabled) {
      return (
        <div className="flex items-center gap-2 px-4 py-2.5 w-full text-left bg-red-500/10 opacity-80">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="text-xs text-red-700">Slot {slotIndex + 1} — No disponible</span>
        </div>
      );
    }

    return (
      <button onClick={onClickAvailable} className="flex items-center gap-2 px-4 py-2.5 w-full text-left hover:bg-emerald-500/5 transition-colors">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400">Slot {slotIndex + 1} — Disponible</span>
        <Plus className="w-3.5 h-3.5 ml-auto text-emerald-500" />
      </button>
    );
  }

  const client = clients.find((item) => item.id === measurement.clientId);

  return (
    <div className="px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'rgba(234,182,118,0.08)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#eab676' }} />
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <button onClick={() => onClickClient(measurement.clientId)} className="text-xs font-medium text-foreground hover:underline truncate max-w-[140px]">
          {client?.name ?? 'Cliente'}
        </button>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{measurement.time}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[10px] px-2 shrink-0"
        onClick={() => onClickDoc(measurement)}
      >
        <FileDown className="w-3 h-3 mr-1" />
        PDF
      </Button>
    </div>
  );
}
