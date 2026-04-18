'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/use-role-context';
import { useSidebar } from '@/hooks/use-sidebar';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { MODULES, ROLE_PERMISSIONS } from '@/lib/constants';
import {
  BarChart3,
  Users,
  Factory,
  Package,
  Warehouse,
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
} from 'lucide-react';

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
};

/* ─── Shared sidebar inner content (reused for desktop + mobile) ─── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentRole, userName } = useRole();
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openFinance, setOpenFinance] = useState(pathname?.includes('/finance'));

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const availableModules = MODULES.filter((m) => m.roles.includes(currentRole));

  const financeSubItems = [
    { label: 'Clientes', href: '/finance/clients' },
    { label: 'Contratistas', href: '/finance/contractors' },
    { label: 'Pedidos', href: '/finance/orders' },
    { label: 'Estado Proyectos', href: '/finance/project-status' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Brand header ── */}
      <div className={`flex items-center gap-3 px-4 pt-5 pb-4 ${isCollapsed ? 'justify-center' : ''}`}>
        {mounted && (
          <Image
            src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'}
            alt="MobelTech"
            width={36}
            height={36}
            className="shrink-0"
          />
        )}
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground tracking-wide truncate">MöbelTech</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Muebles a medida</p>
          </div>
        )}
      </div>

      {/* Accent line */}
      <div className="mx-4 mb-4">
        <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, #eab676 0%, transparent 100%)' }} />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Navegación
          </p>
        )}

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

          /* Regular module link */
          return (
            <Link
              key={module.id}
              href={module.path}
              onClick={onNavigate}
              title={isCollapsed ? module.label : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isCollapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'text-[#1f1f1f]'
                  : 'text-foreground hover:bg-muted'
              }`}
              style={isActive ? { backgroundColor: '#eab676' } : undefined}
            >
              {IconComponent && (
                <IconComponent
                  className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#1f1f1f]' : 'text-muted-foreground group-hover:text-foreground'}`}
                />
              )}
              {!isCollapsed && <span className="truncate">{module.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="mt-auto px-3 pb-4 space-y-3">
        {/* Divider */}
        <div className="mx-1">
          <div className="h-[1px] bg-border" />
        </div>

        {/* Status badge */}
        {!isCollapsed && (
          <div className="px-3 py-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-muted-foreground">Sistema conectado</span>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar() {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <aside
      className={`hidden md:flex flex-col h-full border-r border-border bg-sidebar transition-all duration-300 relative ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-7 z-10 w-6 h-6 rounded-full border border-border bg-sidebar flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <SidebarContent />
    </aside>
  );
}

/* ─── Mobile sidebar (overlay drawer) ─── */
function MobileSidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeMobile}
      />
      {/* Drawer */}
      <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Close button */}
        <button
          onClick={closeMobile}
          className="absolute top-4 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent onNavigate={closeMobile} />
      </aside>
    </>
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
