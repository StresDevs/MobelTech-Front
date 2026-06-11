'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import type { User } from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''

function redirectForRole(role: User['role']) {
  return role === 'contractor' ? '/assigned-jobs' : '/dashboard'
}

async function apiLogin(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo iniciar sesión')
  }
  return data as { user: User; token: string }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { resolvedTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mobeltech_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setMounted(true)
  }, [])

  function persistSession(u: User, token: string) {
    localStorage.setItem('mobeltech_user', JSON.stringify(u))
    localStorage.setItem('mobeltech_token', token)
    try { window.dispatchEvent(new Event('mobeltech_auth_change')) } catch {}
    setUser(u)
    router.replace(redirectForRole(u.role))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { user: authenticatedUser, token } = await apiLogin(email.trim().toLowerCase(), password)
      persistSession(authenticatedUser, token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return <div className="min-h-screen bg-background" />

  function handleLogout() {
    localStorage.removeItem('mobeltech_user')
    localStorage.removeItem('mobeltech_token')
    try { window.dispatchEvent(new Event('mobeltech_auth_change')) } catch {}
    setUser(null)
  }

  function handleLoginDirect(u: User) {
    persistSession(u, localStorage.getItem('mobeltech_token') ?? '')
  }

  if (user) {
    return (
      <AuthProvider user={user} onLogin={handleLoginDirect} onLogout={handleLogout}>
        {children}
      </AuthProvider>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, #1a1b1e 0%, #2f3136 50%, #383b41 100%)'
            : 'linear-gradient(160deg, #eab676 0%, #d4a263 50%, #c89450 100%)',
        }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-10" style={{ background: isDark ? '#eab676' : '#ffffff' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: isDark ? '#eab676' : '#ffffff' }} />
        <div className="absolute top-1/4 right-8 w-20 h-20 rounded-full opacity-5" style={{ background: isDark ? '#eab676' : '#ffffff' }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8">
            <Image
              src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'}
              alt="MobelTech"
              width={120}
              height={120}
              className="drop-shadow-2xl"
              style={{ height: 'auto' }}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-wide mb-2" style={{ color: isDark ? '#f5f6f7' : '#ffffff' }}>
            MöbelTech
          </h1>
          <p className="text-sm tracking-[0.3em] uppercase font-medium mb-8" style={{ color: isDark ? '#cfd2d7' : 'rgba(255,255,255,0.85)' }}>
            Muebles a medida
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <Image src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'} alt="MobelTech" width={72} height={72} className="mb-4" style={{ height: 'auto' }} priority />
            <h1 className="text-xl font-bold text-foreground tracking-wide">MöbelTech</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Bienvenido de vuelta</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Ingresa tus credenciales para acceder al panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mobeltech.com"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eab676]/40 focus:border-[#eab676] text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eab676]/40 focus:border-[#eab676] text-sm"
              />
            </div>

            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting ? (isDark ? '#44474e' : '#d4d4d8') : 'linear-gradient(135deg, #eab676 0%, #d4a263 100%)',
                color: isSubmitting ? (isDark ? '#9a9da3' : '#71717a') : '#1f1f1f',
              }}
            >
              {isSubmitting ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 p-3 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground space-y-2">
            <p><span className="font-medium" style={{ color: '#eab676' }}>Admin:</span> admin@mobeltech.com / admin123</p>
            <p><span className="font-medium" style={{ color: '#eab676' }}>Contratista:</span> contratista@mobeltech.com / contratista123</p>
            <p><span className="font-medium" style={{ color: '#eab676' }}>Arquitecta:</span> arquitecta@mobeltech.com / arquitecta123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
