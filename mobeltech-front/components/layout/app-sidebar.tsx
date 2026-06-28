'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSidebar } from '@/hooks/use-sidebar';
import { MODULES, ROLE_PERMISSIONS } from '@/lib/constants';
import { useTheme } from 'next-themes';
import {
  BarChart3,
  Users,
  Factory,
  Package,
  Warehouse,
  Truck,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  ShoppingCart,
  Calendar,
  ClipboardList,
  LogOut,
  X,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ICON_MAP = {
  BarChart3,
  Users,
  Factory,
  Package,
  Warehouse,
  DollarSign,
  FileText,
  ShoppingCart,
  Calendar,
  ClipboardList,
  UserCog,
};

/* ─── Shared sidebar inner content (reused for desktop + mobile) ─── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentRole, userName } = useRole();
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openFinance, setOpenFinance] = useState(false);
  const [openProduction, setOpenProduction] = useState(false);
  const [openLogistics, setOpenLogistics] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-open Producción group when a child route is active
  useEffect(() => {
    if (
      pathname?.startsWith('/production') ||
      pathname?.startsWith('/schedule') ||
      pathname?.startsWith('/contractor-requests') ||
      pathname?.startsWith('/contractor-payment-requests')
    ) {
      setOpenProduction(true);
    }
    if (pathname?.startsWith('/finance')) {
      setOpenFinance(true);
    }
    if (pathname?.startsWith('/inventory') || pathname?.startsWith('/warehouse')) {
      setOpenLogistics(true);
    }
  }, [pathname]);

  const isDark = mounted && resolvedTheme === 'dark';
  let availableModules = MODULES.filter((m) => m.roles.includes(currentRole));

  // Contractor (contratista) role: show only assigned jobs, cronograma and solicitud de material
  if (currentRole === 'contractor') {
    availableModules = [
      { id: 'assigned-jobs', label: 'Trabajos Asignados', path: '/assigned-jobs', icon: 'Factory', roles: ['contractor'] },
      { id: 'furniture', label: 'Muebles', path: '/furniture', icon: 'Package', roles: ['contractor'] },
      { id: 'schedule', label: 'Cronograma', path: '/schedule', icon: 'Calendar', roles: ['contractor'] },
      { id: 'contractor-requests', label: 'Solicitud de Material', path: '/contractor-requests', icon: 'ShoppingCart', roles: ['contractor'] },
    ];
  }

  const financeSubItems = [
    { label: 'Clientes', href: '/finance/clients' },
    { label: 'Contratistas', href: '/finance/contractors' },
    { label: 'Pedidos', href: '/finance/orders' },
    { label: 'Estado Proyectos', href: '/finance/project-status' },
  ].filter((item) => currentRole !== 'partner' || ['/finance/clients', '/finance/contractors'].includes(item.href));

  const productionSubItems = [
    { label: 'Cronograma', href: '/schedule' },
    { label: 'Solicitud de Material', href: '/contractor-requests' },
    { label: 'Solicitud de Pago Contratistas', href: '/contractor-payment-requests' },
  ].filter((item) => {
    if (currentRole === 'partner') return item.href === '/schedule';
    if (currentRole === 'contractor') return item.href !== '/contractor-payment-requests';
    return true;
  });

  const logisticsSubItems = [
    { label: 'Inventario y Compras', href: '/inventory' },
    { label: 'Almacén', href: '/warehouse' },
  ].filter((item) => currentRole !== 'partner' || item.href === '/inventory');

  return (
    <aside className={`border-r border-border bg-background h-full flex flex-col gap-6 overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } p-4`}>
      {/* Brand header */}
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        {mounted && (
          <Image
            src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'}
            alt="MobelTech"
            width={36}
            height={36}
            style={{ height: 'auto' }}
            className="shrink-0 rounded"
          />
        )}
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground tracking-wide truncate">MöbelTech</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Muebles a medida</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {availableModules.map((module) => {
          const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP];
          const isActive = module.id === 'finance'
            ? pathname === '/finance'
            : pathname.startsWith(module.path) && module.id !== 'finance';

          /* Finance collapsible */
          if (module.id === 'finance') {
            const financeActive = pathname?.includes('/finance');

            return (
              <div key={module.id} className="space-y-0.5">
                <button
                  onClick={() => setOpenFinance((v) => !v)}
                  title={isCollapsed ? module.label : undefined}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    financeActive
                      ? 'text-[#1f1f1f]'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  style={financeActive ? { backgroundColor: '#eab676' } : undefined}
                >
                  {IconComponent && (
                    <IconComponent
                      className={`w-[18px] h-[18px] shrink-0 ${financeActive ? 'text-[#1f1f1f]' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                  )}
                  {!isCollapsed && <span className="flex-1 text-left truncate">{module.label}</span>}
                  {!isCollapsed && (
                    openFinance
                      ? <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                </button>

                {openFinance && !isCollapsed && (
                  <div className="ml-4 pl-3 border-l-2 space-y-0.5" style={{ borderColor: '#eab676' }}>
                    {financeSubItems.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          className={`block text-sm px-3 py-2 rounded-md transition-colors ${
                            subActive
                              ? 'font-medium text-[#1f1f1f]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                          style={subActive ? { backgroundColor: '#eab676' } : undefined}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* Producción collapsible */
          if (module.id === 'production') {
            const productionActive =
              pathname?.startsWith('/production') ||
              pathname?.startsWith('/schedule') ||
              pathname?.startsWith('/contractor-requests') ||
              pathname?.startsWith('/contractor-payment-requests');

            return (
              <div key={module.id} className="space-y-0.5">
                <button
                  onClick={() => setOpenProduction((v) => !v)}
                  title={isCollapsed ? module.label : undefined}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    productionActive
                      ? 'text-[#1f1f1f]'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  style={productionActive ? { backgroundColor: '#eab676' } : undefined}
                >
                  {IconComponent && (
                    <IconComponent
                      className={`w-[18px] h-[18px] shrink-0 ${productionActive ? 'text-[#1f1f1f]' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                  )}
                  {!isCollapsed && <span className="flex-1 text-left truncate">{module.label}</span>}
                  {!isCollapsed && (
                    openProduction
                      ? <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                </button>

                {openProduction && !isCollapsed && (
                  <div className="ml-4 pl-3 border-l-2 space-y-0.5" style={{ borderColor: '#eab676' }}>
                    {productionSubItems.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          className={`block text-sm px-3 py-2 rounded-md transition-colors ${
                            subActive
                              ? 'font-medium text-[#1f1f1f]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                          style={subActive ? { backgroundColor: '#eab676' } : undefined}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* Logística (group: Inventario y Compras + Almacén) — render at 'inventory' slot, skip 'warehouse' */
          if (module.id === 'warehouse') {
            return null;
          }
          if (module.id === 'inventory') {
            const logisticsActive =
              pathname?.startsWith('/inventory') || pathname?.startsWith('/warehouse');

            return (
              <div key="logistics" className="space-y-0.5">
                <button
                  onClick={() => setOpenLogistics((v) => !v)}
                  title={isCollapsed ? 'Logística' : undefined}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    logisticsActive
                      ? 'text-[#1f1f1f]'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  style={logisticsActive ? { backgroundColor: '#eab676' } : undefined}
                >
                  <Truck
                    className={`w-[18px] h-[18px] shrink-0 ${logisticsActive ? 'text-[#1f1f1f]' : 'text-muted-foreground group-hover:text-foreground'}`}
                  />
                  {!isCollapsed && <span className="flex-1 text-left truncate">Logística</span>}
                  {!isCollapsed && (
                    openLogistics
                      ? <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                </button>

                {openLogistics && !isCollapsed && (
                  <div className="ml-4 pl-3 border-l-2 space-y-0.5" style={{ borderColor: '#eab676' }}>
                    {logisticsSubItems.map((sub) => {
                      const subActive = pathname === sub.href || pathname?.startsWith(sub.href + '/');
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          className={`block text-sm px-3 py-2 rounded-md transition-colors ${
                            subActive
                              ? 'font-medium text-[#1f1f1f]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                          style={subActive ? { backgroundColor: '#eab676' } : undefined}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* Regular module link */
          return (
            <Link
              key={module.id}
              href={module.path}
              title={isCollapsed ? module.label : ''}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all justify-center md:justify-start ${
                isCollapsed ? 'justify-center' : 'justify-start'
              } ${
                isActive
                  ? 'text-[#1f1f1f]'
                  : 'text-foreground hover:bg-muted'
              }`}
              style={isActive ? { backgroundColor: '#eab676' } : undefined}
            >
              {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0" />}
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{module.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User card + logout */}
        <div
          className={`flex items-center gap-3 rounded-lg p-2.5 ${isCollapsed ? 'justify-center' : ''}`}
          style={{ backgroundColor: 'var(--muted)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
          >
            {(user?.name || userName || 'U').charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{ROLE_PERMISSIONS[currentRole]?.label}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
    </aside>
  );
}

/* ─── Mobile sidebar (overlay drawer) ─── */
function MobileSidebar() {
  const { isMobileOpen, toggleMobileOpen } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={toggleMobileOpen}
      />
      {/* Drawer */}
      <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Close button */}
        <button
          onClick={toggleMobileOpen}
          className="absolute top-4 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent onNavigate={toggleMobileOpen} />
      </aside>
    </>
  );
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar() {
  return (
    <div className="hidden md:block">
      <div className="fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </div>
    </div>
  );
}

/* ─── Public export (renders both) ─── */
export function AppSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
