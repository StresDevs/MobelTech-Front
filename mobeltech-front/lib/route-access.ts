import type { UserRole } from './types'

const DEFAULT_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard',
  architect: '/dashboard',
  partner: '/dashboard',
  contractor: '/assigned-jobs',
}

const ROUTE_ACCESS: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/dashboard', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/clients', roles: ['admin', 'architect'] },
  { prefix: '/prequotations', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/quotations', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/furniture', roles: ['admin', 'architect', 'contractor', 'partner'] },
  { prefix: '/production', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/schedule', roles: ['admin', 'architect', 'contractor', 'partner'] },
  { prefix: '/inventory', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/warehouse', roles: ['admin', 'architect'] },
  { prefix: '/finance', roles: ['admin', 'architect', 'partner'] },
  { prefix: '/users', roles: ['admin'] },
  { prefix: '/assigned-jobs', roles: ['contractor'] },
  { prefix: '/contractor-requests', roles: ['admin', 'architect', 'contractor'] },
  { prefix: '/contractor-payment-requests', roles: ['admin', 'architect'] },
  { prefix: '/my-materials', roles: ['contractor'] },
  { prefix: '/my-finance', roles: ['contractor'] },
]

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function getDefaultRouteForRole(role: UserRole) {
  return DEFAULT_ROUTES[role] ?? '/dashboard'
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (!pathname || pathname === '/' || pathname === '/login') return true

  const rule = ROUTE_ACCESS
    .filter((entry) => matchesPath(pathname, entry.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  return rule ? rule.roles.includes(role) : false
}
