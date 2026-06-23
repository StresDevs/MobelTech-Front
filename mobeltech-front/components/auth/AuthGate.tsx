'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import type { User } from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''

function redirectForRole(role: User['role']) {
  return role === 'contractor' ? '/assigned-jobs' : '/dashboard'
}

async function apiLogin(identifier: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo iniciar sesión')
  }
  return data as { user: User; token: string }
}

async function apiChangePassword(newPassword: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mobeltech_token') : null
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ newPassword }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || data?.detail || 'No se pudo cambiar la contraseña')
  }
  return data as { user: User }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mobeltech_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !user) {
      return
    }

    const destination = redirectForRole(user.role)
    if (pathname === '/' || pathname === '/login') {
      setIsRedirecting(true)
      router.replace(destination)
      return
    }

    setIsRedirecting(false)
  }, [mounted, pathname, router, user])

  function persistSession(u: User, token: string) {
    localStorage.setItem('mobeltech_user', JSON.stringify(u))
    localStorage.setItem('mobeltech_token', token)
    try { window.dispatchEvent(new Event('mobeltech_auth_change')) } catch {}
    setIsRedirecting(true)
    setUser(u)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { user: authenticatedUser, token } = await apiLogin(email.trim().toLowerCase(), password)
      persistSession(authenticatedUser, token)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChangeError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas')
      setIsRedirecting(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('mobeltech_user')
    localStorage.removeItem('mobeltech_token')
    try { window.dispatchEvent(new Event('mobeltech_auth_change')) } catch {}
    setIsRedirecting(false)
    setUser(null)
    router.replace('/')
  }

  function handleLoginDirect(u: User) {
    persistSession(u, localStorage.getItem('mobeltech_token') ?? '')
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordChangeError('')

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordChangeError('Completa ambos campos.')
      return
    }

    if (newPassword.trim().length < 8) {
      setPasswordChangeError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Las contraseñas no coinciden.')
      return
    }

    setIsChangingPassword(true)
    try {
      const { user: updatedUser } = await apiChangePassword(newPassword.trim())
      persistSession(updatedUser, localStorage.getItem('mobeltech_token') ?? '')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChangeError('')
      setError('')
    } catch (err) {
      setPasswordChangeError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally {
      setIsChangingPassword(false)
    }
  }

  function renderLoadingState(message: string) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative flex flex-col items-center gap-5 rounded-3xl border border-border/70 bg-card/90 px-10 py-9 shadow-2xl shadow-black/10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#eab676] via-[#f4d19f] to-[#d4a263]" />
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#eab676]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#eab676] animate-spin" />
            <div className="absolute inset-4 rounded-full bg-[#eab676]/15" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{message}</p>
            <p className="mt-1 text-xs text-muted-foreground">Preparando tu espacio de trabajo</p>
          </div>
        </div>
      </div>
    )
  }

  function renderPasswordChangeState() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[440px] rounded-3xl border border-border/70 bg-card/95 p-6 shadow-2xl shadow-black/10">
          <div className="mb-5 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Cambio obligatorio
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Actualiza tu contraseña</h2>
            <p className="text-sm text-muted-foreground">
              Tu contraseña es temporal. Debes crear una nueva antes de continuar.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.username ?? user?.email}</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Crea una contraseña nueva"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[#eab676] focus:outline-none focus:ring-2 focus:ring-[#eab676]/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[#eab676] focus:outline-none focus:ring-2 focus:ring-[#eab676]/40"
              />
            </div>

            {passwordChangeError ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                {passwordChangeError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: isChangingPassword ? (isDark ? '#44474e' : '#d4d4d8') : 'linear-gradient(135deg, #eab676 0%, #d4a263 100%)',
                color: isChangingPassword ? (isDark ? '#9a9da3' : '#71717a') : '#1f1f1f',
              }}
            >
              {isChangingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const authContent = !mounted
    ? renderLoadingState('Cargando sesión...')
    : user?.mustChangePassword
      ? renderPasswordChangeState()
      : user && isRedirecting
      ? renderLoadingState('Entrando a MöbelTech...')
      : user
        ? children
        : (
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
              <label className="text-sm font-medium text-foreground" htmlFor="login-email">Username o correo</label>
              <input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mobeltech.com o @contratista.demo"
                type="text"
                required
                autoComplete="username"
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

  return (
    <AuthProvider user={user} onLogin={handleLoginDirect} onLogout={handleLogout}>
      {authContent}
    </AuthProvider>
  )
}
