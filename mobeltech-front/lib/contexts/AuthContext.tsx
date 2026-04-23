'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  logout: () => void
  login: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  user,
  onLogin,
  onLogout,
}: {
  children: React.ReactNode
  user: User | null
  onLogin: (user: User) => void
  onLogout: () => void
}) {
  return (
    <AuthContext.Provider value={{ user, login: onLogin, logout: onLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
