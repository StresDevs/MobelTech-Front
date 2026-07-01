'use client';

import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/hooks/use-sidebar';
import { Bell, Moon, Sun, LogOut, Menu } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { getNotificationTarget } from '@/lib/notification-routing';

type HeaderNotification = {
  id: string;
  recipientUserId: string;
  message: string;
  relatedJobId?: string | null;
  read: boolean;
  createdAt: string;
};

export function AppHeader() {
  const { currentRole, userName } = useRole();
  const { logout, user } = useAuth();
  const { toggleMobileOpen } = useSidebar();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const roleInfo = ROLE_PERMISSIONS[currentRole] ?? ROLE_PERMISSIONS.admin;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !apiBase) return;

    let active = true;

    async function loadNotifications() {
      try {
        const response = await fetch(`${apiBase}/api/notifications?recipientUserId=${user?.id}`, { cache: 'no-store' });
        if (!response.ok) return;
        const rows = await response.json();
        if (active) {
          setNotifications(rows);
        }
      } catch {}
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [apiBase, user]);

  async function markNotificationAsRead(notificationId: string) {
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? { ...item, read: true } : item
      )));
    } catch {
      // The notification can still navigate even if the read flag fails.
    }
  }

  async function handleNotificationClick(notification: HeaderNotification) {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    setShowNotifications(false);

    const target = getNotificationTarget(notification, currentRole);
    if (target) {
      router.push(target);
    }
  }

  const myNotifications = user ? notifications.filter((notification) => notification.recipientUserId === user.id) : [];
  const unreadCount = myNotifications.filter((notification) => !notification.read).length;

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 h-14 flex items-center justify-between">
      {/* Left: mobile menu */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={toggleMobileOpen}
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
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-[1.15rem] w-[1.15rem]" />
              {unreadCount > 0 ? (
                <span
                  className="absolute top-1 right-1 h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                >
                  {unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="z-[120] w-[min(92vw,24rem)] rounded-xl border border-border/80 bg-background p-0 shadow-2xl"
          >
            <div className="border-b border-border/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Notificaciones</h3>
                {unreadCount > 0 ? <span className="text-xs text-muted-foreground">{unreadCount} sin leer</span> : null}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {myNotifications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No tienes notificaciones</div>
              ) : (
                myNotifications
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((notification) => {
                    const target = getNotificationTarget(notification, currentRole);
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        className={`w-full border-b border-border/70 px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/60 ${
                          !notification.read ? 'bg-muted/20' : ''
                        }`}
                        onClick={() => void handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-medium' : 'font-normal'}`}>{notification.message}</p>
                            <p className="mt-1 text-xs text-muted-foreground/80">
                              {new Date(notification.createdAt).toLocaleString('es-VE')}
                            </p>
                          </div>
                          {target ? <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-primary">Abrir</span> : null}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
                <p className="text-[11px] text-muted-foreground leading-tight">{roleInfo.label}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{roleInfo.label}</p>
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
