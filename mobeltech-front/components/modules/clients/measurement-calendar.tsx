'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MEASUREMENTS, CLIENTS } from '@/lib/mock-data';
import { Measurement } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileDown,
  Phone,
  MapPin,
  Mail,
  Clock,
  Search,
  UserPlus,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SLOTS_PER_DAY = 4;
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* ────────────────────── helpers ────────────────────── */

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}
function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/* ══════════════════════  MAIN COMPONENT  ══════════════════════ */

export function MeasurementCalendar() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  /* modal state */
  const [newMeasurementSlot, setNewMeasurementSlot] = useState<{
    day: number;
    slotIndex: number;
  } | null>(null);
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);

  /* form state */
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

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  /* group measurements by day number */
  const measurementsByDay = useMemo(() => {
    const map: Record<number, Measurement[]> = {};
    MEASUREMENTS.forEach((m) => {
      if (
        m.date.getFullYear() === currentDate.getFullYear() &&
        m.date.getMonth() === currentDate.getMonth()
      ) {
        const day = m.date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(m);
      }
    });
    return map;
  }, [currentDate]);

  const getSlots = (day: number) => {
    const ms = measurementsByDay[day] || [];
    return Array.from({ length: SLOTS_PER_DAY }, (_, i) => ms[i] ?? null);
  };

  /* navigation */
  const goMonth = (delta: number) =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  /* open new-measurement modal */
  const openNewMeasurement = (day: number, slotIndex: number) => {
    setNewMeasurementSlot({ day, slotIndex });
    setFormData({ clientId: '', name: '', phone: '', address: '', email: '', time: '09:00', furnitureItems: '', notes: '' });
    setClientSearchQuery('');
  };
  const closeNewMeasurement = () => setNewMeasurementSlot(null);

  const handleSelectExistingClient = (clientId: string) => {
    const c = CLIENTS.find((cl) => cl.id === clientId);
    if (!c) return;
    setFormData((prev) => ({ ...prev, clientId: c.id, name: c.name, phone: c.phone, address: c.address, email: c.email }));
  };

  const handleSubmitMeasurement = () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) return;
    console.log('Medición agendada:', { day: newMeasurementSlot?.day, slotIndex: newMeasurementSlot?.slotIndex, ...formData });
    closeNewMeasurement();
  };

  const filteredClients = CLIENTS.filter(
    (c) => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery),
  );

  const detailClient = clientDetailId ? CLIENTS.find((c) => c.id === clientDetailId) : null;

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="space-y-5">
      {/* ── Month nav ── */}
      <div className="flex items-center justify-between">
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

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab676' }} />
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
          Disponible
        </span>
      </div>

      {/* ═══ DESKTOP grid (md+) ═══ */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5 min-w-[900px]">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 min-w-[900px]">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}

          {days.map((day) => {
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const today = isToday(dateObj);
            const slots = getSlots(day);

            return (
              <Card key={day} className={`flex flex-col p-0 overflow-hidden ${today ? 'ring-2 ring-[#eab676]' : ''}`}>
                {/* day header */}
                <div className={`px-2 py-1 text-xs font-bold flex items-center justify-between ${today ? 'bg-[#eab676] text-[#1f1f1f]' : 'bg-muted/50 text-foreground'}`}>
                  <span>{day}</span>
                </div>

                {/* col headers + slots share same container */}
                <div className="flex flex-col gap-0.5 px-1 pt-1 pb-1 flex-1">
                  {/* col headers */}
                  <div className="grid grid-cols-[1fr_48px_32px] gap-px px-1 pb-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Cliente</span>
                    <span className="text-center">Fecha</span>
                    <span className="text-center">Doc</span>
                  </div>

                  {/* slots */}
                  {slots.map((m, idx) => (
                    <DesktopSlot
                      key={idx}
                      measurement={m}
                      onClickAvailable={() => openNewMeasurement(day, idx)}
                      onClickClient={(id) => setClientDetailId(id)}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ MOBILE list (<md) ═══ */}
      <div className="md:hidden space-y-2">
        {days.map((day) => {
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const today = isToday(dateObj);
          const slots = getSlots(day);
          const hasAny = slots.some((s) => s !== null);
          const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });

          return (
            <Card key={day} className={`overflow-hidden ${today ? 'ring-2 ring-[#eab676]' : ''}`}>
              <div className={`px-4 py-2 flex items-center justify-between ${today ? 'bg-[#eab676] text-[#1f1f1f]' : 'bg-muted/40 text-foreground'}`}>
                <span className="font-bold text-sm capitalize">{dayName} {day}</span>
                {hasAny && (
                  <Badge className="text-[10px] px-1.5 h-5" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                    {slots.filter((s) => s).length}/{SLOTS_PER_DAY}
                  </Badge>
                )}
              </div>
              <div className="divide-y divide-border">
                {slots.map((m, idx) => (
                  <MobileSlot
                    key={idx}
                    slotIndex={idx}
                    measurement={m}
                    onClickAvailable={() => openNewMeasurement(day, idx)}
                    onClickClient={(id) => setClientDetailId(id)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ══════════ NEW MEASUREMENT MODAL ══════════ */}
      <Dialog open={!!newMeasurementSlot} onOpenChange={(o) => !o && closeNewMeasurement()}>
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

          <Tabs defaultValue={formData.clientId ? 'details' : 'existing'} className="w-full">
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

            {/* existing client picker */}
            <TabsContent value="existing" className="mt-0 px-6 py-4 space-y-3">
              <Input placeholder="Buscar por nombre o teléfono…" value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} className="h-9" />
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {filteredClients.map((c) => {
                  const selected = formData.clientId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectExistingClient(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selected ? 'border-[#eab676] bg-[#eab676]/10' : 'border-border hover:border-[#eab676]/50 hover:bg-muted/50'}`}
                    >
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} · {c.address}</p>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6">No se encontraron clientes</p>
                )}
              </div>
            </TabsContent>

            {/* new client form */}
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

          {/* common fields */}
          <div className="border-t border-border px-6 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hora de la medición *</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mueble(s) a realizar *</Label>
              <Textarea placeholder="Ej: Escritorio ejecutivo, 2 estanterías…" value={formData.furnitureItems} onChange={(e) => setFormData({ ...formData, furnitureItems: e.target.value })} rows={2} className="resize-none text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas adicionales</Label>
              <Textarea placeholder="Referencias, indicaciones de acceso…" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="resize-none text-sm" />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 gap-2">
            <Button variant="outline" onClick={closeNewMeasurement} className="h-9">Cancelar</Button>
            <Button
              className="h-9"
              style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
              disabled={!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.furnitureItems.trim()}
              onClick={handleSubmitMeasurement}
            >
              Agendar Medición
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ CLIENT DETAIL MODAL ══════════ */}
      <Dialog open={!!detailClient} onOpenChange={(o) => !o && setClientDetailId(null)}>
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
                <InfoRow icon={Mail} label="Email" value={detailClient.email} />
                <InfoRow icon={Clock} label="Registrado" value={detailClient.registrationDate.toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>

              <div className="px-6 pb-5">
                <Button variant="outline" className="w-full h-9" onClick={() => setClientDetailId(null)}>Cerrar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════  SUB-COMPONENTS  ═══════════════════════ */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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

/* ─── Desktop slot ─── */

function DesktopSlot({
  measurement,
  onClickAvailable,
  onClickClient,
}: {
  measurement: Measurement | null;
  onClickAvailable: () => void;
  onClickClient: (id: string) => void;
}) {
  if (!measurement) {
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

  const client = CLIENTS.find((c) => c.id === measurement.clientId);
  const clientName = client?.name ?? 'Cliente';
  const shortName = clientName.length > 14 ? clientName.slice(0, 13) + '…' : clientName;

  return (
    <div
      className="grid grid-cols-[1fr_48px_32px] items-center gap-px rounded min-h-[28px] px-1"
      style={{ backgroundColor: 'rgba(234,182,118,0.15)', border: '1px solid rgba(234,182,118,0.35)' }}
    >
      <button onClick={() => onClickClient(measurement.clientId)} className="text-left text-[10px] font-medium truncate hover:underline text-foreground" title={clientName}>
        {shortName}
      </button>
      <span className="text-center text-[10px] text-muted-foreground">
        {measurement.quotationDeliveryDate
          ? measurement.quotationDeliveryDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
          : '—'}
      </span>
      <div className="flex justify-center">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (measurement.prequotationLink) window.location.href = measurement.prequotationLink; }} title="Ver precotización">
          <FileDown className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Mobile slot ─── */

function MobileSlot({
  slotIndex,
  measurement,
  onClickAvailable,
  onClickClient,
}: {
  slotIndex: number;
  measurement: Measurement | null;
  onClickAvailable: () => void;
  onClickClient: (id: string) => void;
}) {
  if (!measurement) {
    return (
      <button onClick={onClickAvailable} className="flex items-center gap-2 px-4 py-2.5 w-full text-left hover:bg-emerald-500/5 transition-colors">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400">Slot {slotIndex + 1} — Disponible</span>
        <Plus className="w-3.5 h-3.5 ml-auto text-emerald-500" />
      </button>
    );
  }

  const client = CLIENTS.find((c) => c.id === measurement.clientId);

  return (
    <div className="px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'rgba(234,182,118,0.08)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#eab676' }} />
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <button onClick={() => onClickClient(measurement.clientId)} className="text-xs font-medium text-foreground hover:underline truncate max-w-[140px]">
          {client?.name ?? 'Cliente'}
        </button>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {measurement.quotationDeliveryDate
            ? measurement.quotationDeliveryDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            : '—'}
        </span>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 shrink-0" onClick={() => { if (measurement.prequotationLink) window.location.href = measurement.prequotationLink; }}>
        <FileDown className="w-3 h-3 mr-1" />
        PDF
      </Button>
    </div>
  );
}
