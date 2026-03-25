'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MEASUREMENTS, CLIENTS } from '@/lib/mock-data';
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ClientDetailsModal } from './client-details-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SLOTS_PER_DAY = 4;

export function MeasurementCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date('2024-05-01'));
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<{ day: number; slotIndex: number } | null>(null);
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  });

  // Group measurements by date
  const measurementsByDay = useMemo(() => {
    return MEASUREMENTS.reduce((acc, m) => {
      const dateKey = m.date.toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(m);
      return acc;
    }, {} as Record<string, typeof MEASUREMENTS>);
  }, []);

  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const getDayString = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toDateString();
  };

  const getMeasurementsForDay = (day: number) => {
    return measurementsByDay[getDayString(day)] || [];
  };

  const getSlots = (day: number) => {
    const measurements = getMeasurementsForDay(day);
    const slots = Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
      return measurements[i] || null;
    });
    return slots;
  };

  const handleEmptySlotClick = (day: number, slotIndex: number) => {
    setSelectedEmptySlot({ day, slotIndex });
    setNewClientData({ name: '', phone: '', address: '', email: '' });
  };

  const handleAddMeasurement = () => {
    if (!newClientData.name.trim() || !newClientData.phone.trim() || !newClientData.address.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    console.log('Medición agendada para:', {
      day: selectedEmptySlot?.day,
      slotIndex: selectedEmptySlot?.slotIndex,
      clientData: newClientData,
    });
    setSelectedEmptySlot(null);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {/* Day headers */}
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center font-semibold text-sm py-2">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-auto" />
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const slots = getSlots(day);
          const hasAnyMeasurement = slots.some(slot => slot !== null);

          return (
            <div key={day} className="flex flex-col">
              <Card className={`flex flex-col flex-1 p-3 ${
                hasAnyMeasurement ? 'bg-amber-50 border-amber-200' : ''
              }`}>
                {/* Day number */}
                <div className="text-lg font-bold text-foreground mb-3 pb-2 border-b">{day}</div>

                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-semibold text-foreground">
                  <div className="text-center">Cliente</div>
                  <div className="text-center">Fecha Entrega</div>
                  <div className="text-center">Precotización</div>
                </div>

                {/* Slots table */}
                <div className="flex flex-col gap-2 flex-1">
                  {slots.map((measurement, slotIndex) => (
                    <div
                      key={`slot-${slotIndex}`}
                      className={`border rounded p-2 grid grid-cols-3 gap-2 items-center min-h-14 transition-colors ${
                        measurement
                          ? 'bg-white border-amber-300'
                          : 'bg-muted/50 border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => !measurement && handleEmptySlotClick(day, slotIndex)}
                    >
                      {measurement ? (
                        <>
                          {/* Column 1: Client Button */}
                          <div className="flex items-center justify-center">
                            <ClientDetailsModal clientId={measurement.clientId} />
                          </div>

                          {/* Column 2: Delivery Date */}
                          <div className="text-center">
                            <span className="text-xs font-medium text-foreground bg-blue-50 rounded px-2 py-1 block">
                              {measurement.quotationDeliveryDate
                                ? new Date(measurement.quotationDeliveryDate).toLocaleDateString('es-ES', {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '-'}
                            </span>
                          </div>

                          {/* Column 3: PDF/Precotización Button */}
                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 gap-1"
                              onClick={() => {
                                if (measurement.prequotationLink) {
                                  window.location.href = measurement.prequotationLink;
                                }
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                              PDF
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-3 w-full text-center text-muted-foreground text-xs flex items-center justify-center gap-1">
                          <Plus className="w-3 h-3" />
                          Click para agendar
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Modal for new measurement */}
      <Dialog open={!!selectedEmptySlot} onOpenChange={(open) => !open && setSelectedEmptySlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Agendar Medición - {selectedEmptySlot && 
                `${selectedEmptySlot.day} de ${monthName}`
              }
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Cliente Existente</TabsTrigger>
              <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
            </TabsList>

            {/* Existing Client */}
            <TabsContent value="existing" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Selecciona un cliente de la lista</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {CLIENTS.map((client) => (
                  <Button
                    key={client.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-2 text-left"
                    onClick={() => {
                      console.log('Cliente seleccionado:', client.id);
                      setSelectedEmptySlot(null);
                    }}
                  >
                    <div>
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.contactPhone}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* New Client */}
            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Nombre del cliente"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs">Teléfono *</Label>
                <Input
                  id="phone"
                  placeholder="+591-2-1234567"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs">Dirección *</Label>
                <Input
                  id="address"
                  placeholder="Dirección"
                  value={newClientData.address}
                  onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  placeholder="email@example.com"
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <Button
                className="w-full text-xs h-8"
                style={{ backgroundColor: '#d6a85a', color: '#ffffff' }}
                onClick={handleAddMeasurement}
              >
                Agendar Medición
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded" />
          <span>Día con mediciones</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted/50 border border-dashed border-muted-foreground/30 rounded" />
          <span>Slot disponible</span>
        </div>
      </div>
    </div>
  );
}
