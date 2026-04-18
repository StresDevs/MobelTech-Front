'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { DEMO_USER } from '@/lib/mock-data'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import type { User } from '@/lib/types'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mobeltech_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Simulated delay for UX
    await new Promise((r) => setTimeout(r, 600))

    if (email.trim().toLowerCase() === DEMO_USER.email.toLowerCase()) {
      const u: User = { ...DEMO_USER }
      localStorage.setItem('mobeltech_user', JSON.stringify(u))
      setUser(u)
    } else {
      setError('Credenciales incorrectas. Verifica tu email.')
    }
    setIsSubmitting(false)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background" />
    )
  }

  function handleLogout() {
    localStorage.removeItem('mobeltech_user')
    setUser(null)
  }

  function handleLoginDirect(u: User) {
    localStorage.setItem('mobeltech_user', JSON.stringify(u))
    setUser(u)
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
      {/* ── Left brand panel (hidden on mobile) ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, #1a1b1e 0%, #2f3136 50%, #383b41 100%)'
            : 'linear-gradient(160deg, #eab676 0%, #d4a263 50%, #c89450 100%)',
        }}
      >
        {/* Decorative shapes */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-10"
          style={{ background: isDark ? '#eab676' : '#ffffff' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: isDark ? '#eab676' : '#ffffff' }}
        />
        <div
          className="absolute top-1/4 right-8 w-20 h-20 rounded-full opacity-5"
          style={{ background: isDark ? '#eab676' : '#ffffff' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8">
            <Image
              src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'}
              alt="MobelTech"
              width={120}
              height={120}
              className="drop-shadow-2xl"
              priority
            />
          </div>

          <h1
            className="text-3xl font-bold tracking-wide mb-2"
            style={{ color: isDark ? '#f5f6f7' : '#ffffff' }}
          >
            MöbelTech
          </h1>
          <p
            className="text-sm tracking-[0.3em] uppercase font-medium mb-8"
            style={{ color: isDark ? '#cfd2d7' : 'rgba(255,255,255,0.85)' }}
          >
            Muebles a medida
          </p>

          {/* Accent bar */}
          <div className="flex items-center gap-1">
            <div
              className="h-[2px] w-12 rounded-full"
              style={{ background: isDark ? '#eab676' : 'rgba(255,255,255,0.6)' }}
            />
            <div
              className="h-[2px] w-6 rounded-full"
              style={{ background: isDark ? '#eab676' : 'rgba(255,255,255,0.9)' }}
            />
            <div
              className="h-[2px] w-3 rounded-full"
              style={{ background: isDark ? '#d4a263' : 'rgba(255,255,255,0.4)' }}
            />
          </div>

          <p
            className="mt-10 text-center max-w-[280px] text-sm leading-relaxed"
            style={{ color: isDark ? '#9a9da3' : 'rgba(255,255,255,0.75)' }}
          >
            Sistema administrativo integral para gestión de proyectos, producción e inventario.
          </p>
        </div>
      </div>

      {/* ── Right login form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <Image
              src={isDark ? '/mobeltech-dark.png' : '/mobeltech-light.png'}
              alt="MobelTech"
              width={72}
              height={72}
              className="mb-4"
              priority
            />
            <h1 className="text-xl font-bold text-foreground tracking-wide">MöbelTech</h1>
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mt-1">
              Muebles a medida
            </p>
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-email">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <input
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={DEMO_USER.email}
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eab676]/40 focus:border-[#eab676] text-sm"
                />
              </div>
            </div>

            {/* Password (mock) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="login-password">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#eab676' }}
                  tabIndex={-1}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <input
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eab676]/40 focus:border-[#eab676] text-sm"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm text-red-500">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting
                  ? isDark ? '#44474e' : '#d4d4d8'
                  : 'linear-gradient(135deg, #eab676 0%, #d4a263 100%)',
                color: isSubmitting
                  ? isDark ? '#9a9da3' : '#71717a'
                  : '#1f1f1f',
                boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(234,182,118,0.3)',
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 p-3 rounded-lg border border-border bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium" style={{ color: '#eab676' }}>Demo:</span>{' '}
              usa <span className="font-mono text-foreground">{DEMO_USER.email}</span> con cualquier contraseña
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            © {new Date().getFullYear()} MöbelTech · Muebles a Medida
          </p>
        </div>
      </div>
    </div>
  )
}
