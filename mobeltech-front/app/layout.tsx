import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { RoleProvider } from '@/lib/contexts/RoleContext'
import { SidebarProvider } from '@/lib/contexts/SidebarContext'
import { ThemeProvider } from '@/components/theme-provider'
import AuthGate from '@/components/auth/AuthGate'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'MobelTech - Sistema Administrativo',
  description: 'Sistema de gestión administrativo para MobelTech',
  icons: {
    icon: [
      {
        url: '/mobeltech-light.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/mobeltech-dark.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/mobeltech-dark.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <RoleProvider>
            <SidebarProvider>
              <AuthGate>
                {children}
              </AuthGate>
            </SidebarProvider>
          </RoleProvider>
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
