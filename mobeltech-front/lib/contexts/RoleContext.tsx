'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '../types';
import { DEMO_USER } from '../mock-data';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  userName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [userName, setUserName] = useState<string>(DEMO_USER.name);

  // Read initial user from localStorage and update when auth changes.
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mobeltech_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role) setCurrentRole(u.role);
        if (u?.name) setUserName(u.name);
      }
    } catch {
      // ignore
    }

    const handler = () => {
      try {
        const stored = localStorage.getItem('mobeltech_user');
        if (stored) {
          const u = JSON.parse(stored);
          setCurrentRole(u?.role || 'admin');
          setUserName(u?.name || DEMO_USER.name);
        } else {
          setCurrentRole('admin');
          setUserName(DEMO_USER.name);
        }
      } catch {
        setCurrentRole('admin');
        setUserName(DEMO_USER.name);
      }
    };

    window.addEventListener('mobeltech_auth_change', handler as EventListener);
    return () => window.removeEventListener('mobeltech_auth_change', handler as EventListener);
  }, []);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, userName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
