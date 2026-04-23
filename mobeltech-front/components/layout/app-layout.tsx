'use client';

import React from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
