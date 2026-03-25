'use client';

import { useRole } from '@/hooks/use-role-context';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import { UserRole } from '@/lib/types';
import { useState } from 'react';

export function AppHeader() {
  const { currentRole, setCurrentRole, userName } = useRole();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: '#2e2e2e' }}
          >
            🛋️
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#2e2e2e' }}>
              MobelTech
            </h1>
            <p className="text-xs text-muted-foreground">Sistema Administrativo</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <div className="relative">
          <Button variant="ghost" size="sm" className="relative h-10 w-10 p-0" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0" style={{ backgroundColor: '#d6a85a' }}>
              3
            </Badge>
          </Button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Notificaciones</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-border hover:bg-muted/50 cursor-pointer">
                  <p className="text-sm font-medium">Nueva solicitud de material</p>
                  <p className="text-xs text-muted-foreground">Carlos Mamani solicitó materiales</p>
                  <p className="text-xs text-muted-foreground mt-1">Hace 2 horas</p>
                </div>
                <div className="p-3 border-b border-border hover:bg-muted/50 cursor-pointer">
                  <p className="text-sm font-medium">Orden de producción completada</p>
                  <p className="text-xs text-muted-foreground">Proyecto García - Mueblería</p>
                  <p className="text-xs text-muted-foreground mt-1">Hace 4 horas</p>
                </div>
                <div className="p-3 hover:bg-muted/50 cursor-pointer">
                  <p className="text-sm font-medium">Medición agendada</p>
                  <p className="text-xs text-muted-foreground">Empresa García - Mañana 09:00</p>
                  <p className="text-xs text-muted-foreground mt-1">Hace 6 horas</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_PERMISSIONS[currentRole].label}</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-base"
            style={{ backgroundColor: '#d6a85a' }}
          >
            👤
          </div>
        </div>

        <div className="w-40">
          <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="manager">Gerente</SelectItem>
              <SelectItem value="operator">Contratista</SelectItem>
              <SelectItem value="viewer">Visualizador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
