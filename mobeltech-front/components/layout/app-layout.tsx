'use client';

import React from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { useSidebar } from '@/hooks/use-sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  // On md+ we add left padding equal to the sidebar width so the fixed sidebar
  // doesn't overlap the main content. We animate the padding for smoother UX.
  const paddingClass = isCollapsed ? 'md:pl-20' : 'md:pl-64';

  return (
    <div className={`flex h-screen overflow-hidden bg-background ${paddingClass} transition-all duration-300`}>
      <AppSidebar />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
