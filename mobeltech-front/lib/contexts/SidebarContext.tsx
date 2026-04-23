'use client';

import React, { createContext, useState, useCallback } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobileOpen: () => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileOpen = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, isMobileOpen, toggleCollapse, toggleMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
