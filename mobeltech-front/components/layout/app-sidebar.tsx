'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/use-role-context';
import { useSidebar } from '@/hooks/use-sidebar';
import { MODULES } from '@/lib/constants';
import {
  BarChart3,
  Users,
  Factory,
  Package,
  Warehouse,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  FileText,
  ShoppingCart,
  Calendar,
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
};

export function AppSidebar() {
  const { currentRole } = useRole();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const availableModules = MODULES.filter((module) => module.roles.includes(currentRole));

  return (
    <aside className={`border-r border-border bg-background h-full flex flex-col gap-6 overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } p-4`}>
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
          const isActive = pathname.includes(module.path);

          return (
            <Link
              key={module.id}
              href={module.path}
              title={isCollapsed ? module.label : ''}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all justify-center md:justify-start ${
                isCollapsed ? 'justify-center' : 'justify-start'
              } ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-foreground hover:bg-muted'
              }`}
              style={isActive ? { backgroundColor: '#d6a85a', color: '#ffffff' } : {}}
            >
              {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0" />}
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{module.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Info Section */}
      {!isCollapsed && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground px-4 mb-3">INFORMACIÓN</p>
          <div className="space-y-2 text-xs">
            <div className="px-4 py-2 bg-muted rounded-lg">
              <p className="font-medium text-foreground">Versión</p>
              <p className="text-muted-foreground">1.0.0</p>
            </div>
            <div className="px-4 py-2 bg-muted rounded-lg">
              <p className="font-medium text-foreground">Estado</p>
              <p className="text-green-600">Conectado</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
