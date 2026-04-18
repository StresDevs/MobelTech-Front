'use client';

import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/hooks/use-sidebar';
import { Bell, Moon, Sun, LogOut, Menu, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function AppHeader() {
  const { currentRole, userName } = useRole();
  const { logout } = useAuth();
  const { openMobile } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notifications]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showNotifications]);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 h-14 flex items-center justify-between">
      {/* Left: mobile menu */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={openMobile}
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar modo claro/oscuro"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-[1.15rem] w-[1.15rem]" />
          ) : (
            <Moon className="h-[1.15rem] w-[1.15rem]" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative" data-notifications>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full relative"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notificaciones"
          >
            <Bell className="h-[1.15rem] w-[1.15rem]" />
            <span
              className="absolute top-1 right-1 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
            >
              3
            </span>
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Nueva solicitud de material</p>
                  <p className="text-xs text-muted-foreground">Carlos Mamani solicitó materiales</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Hace 2 horas</p>
                </div>
                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Orden de producción completada</p>
                  <p className="text-xs text-muted-foreground">Proyecto García - Mueblería</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Hace 4 horas</p>
                </div>
                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Medición agendada</p>
                  <p className="text-xs text-muted-foreground">Empresa García - Mañana 09:00</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Hace 6 horas</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
              >
                {(userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-tight">{userName}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{ROLE_PERMISSIONS[currentRole].label}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_PERMISSIONS[currentRole].label}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500 cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
