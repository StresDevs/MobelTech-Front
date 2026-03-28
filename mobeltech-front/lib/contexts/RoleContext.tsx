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

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, userName: DEMO_USER.name }}>
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
