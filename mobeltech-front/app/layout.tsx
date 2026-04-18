import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { RoleProvider } from '@/lib/contexts/RoleContext'
import { SidebarProvider } from '@/lib/contexts/SidebarContext'
import { ThemeProvider } from '@/components/theme-provider'
import AuthGate from '@/components/auth/AuthGate'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MobelTech - Sistema Administrativo',
  description: 'Sistema de gestión administrativo para MobelTech',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
          <AuthGate>
            <RoleProvider>
              <SidebarProvider>
                {children}
              </SidebarProvider>
            </RoleProvider>
          </AuthGate>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
