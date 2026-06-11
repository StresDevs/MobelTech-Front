import { UserRole } from './types';

// MobelTech Color Scheme
export const COLORS = {
  primary: '#2e2e2e',    // Dark gray
  accent: '#d6a85a',     // Gold
  background: '#ffffff', // White
  border: '#e5e5e5',     // Light gray
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Amber
  danger: '#ef4444',     // Red
  muted: '#9ca3af',      // Gray
};

// Module definitions with permissions
export const MODULES = [
  {
    id: 'dashboard',
    label: 'Panel Ejecutivo',
    path: '/dashboard',
    icon: 'BarChart3',
    roles: ['admin', 'architect'],
  },
  {
    id: 'clients',
    label: 'Mediciones y Clientes',
    path: '/clients',
    icon: 'Users',
    roles: ['admin', 'architect', 'contractor'],
  },
  {
    id: 'prequotations',
    label: 'Precotización',
    path: '/prequotations',
    icon: 'FileText',
    roles: ['admin', 'architect'],
  },
  {
    id: 'quotations',
    label: 'Cotización',
    path: '/quotations',
    icon: 'ClipboardList',
    roles: ['admin', 'architect'],
  },
  {
    id: 'production',
    label: 'Producción',
    path: '/production',
    icon: 'Factory',
    roles: ['admin', 'architect', 'contractor'],
  },
  {
    id: 'inventory',
    label: 'Inventario y Compras',
    path: '/inventory',
    icon: 'Package',
    roles: ['admin', 'architect', 'contractor'],
  },
  {
    id: 'warehouse',
    label: 'Almacén',
    path: '/warehouse',
    icon: 'Warehouse',
    roles: ['admin', 'architect', 'contractor'],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    path: '/finance',
    icon: 'DollarSign',
    roles: ['admin', 'architect'],
  },
  {
    id: 'users',
    label: 'Gestión de Usuarios',
    path: '/users',
    icon: 'UserCog',
    roles: ['admin'],
  },
  {
    id: 'my-materials',
    label: 'Mi Almacén',
    path: '/my-materials',
    icon: 'ShoppingCart',
    roles: ['contractor'],
  },
  {
    id: 'my-finance',
    label: 'Mis Finanzas',
    path: '/my-finance',
    icon: 'DollarSign',
    roles: ['contractor'],
  },
  {
    id: 'assigned-jobs',
    label: 'Trabajos Asignados',
    path: '/assigned-jobs',
    icon: 'Factory',
    roles: ['contractor'],
  },
];

// Role definitions and permissions
export const ROLE_PERMISSIONS = {
  admin: {
    label: 'Administrador',
    description: 'Acceso total a todos los módulos',
    modules: ['dashboard', 'clients', 'production', 'inventory', 'warehouse', 'finance'],
  },
  architect: {
    label: 'Arquitecta',
    description: 'Acceso ejecutivo y comercial',
    modules: ['dashboard', 'clients', 'prequotations', 'quotations', 'production', 'inventory', 'warehouse', 'finance'],
  },
  contractor: {
    label: 'Contratista',
    description: 'Acceso operativo a trabajos y solicitudes',
    modules: ['assigned-jobs', 'schedule', 'contractor-requests'],
  },
} as Record<UserRole, { label: string; description: string; modules: string[] }>;

// Production phases
export const PRODUCTION_PHASES = [
  { id: 'cortado', label: 'Cortado', order: 1 },
  { id: 'canteado', label: 'Canteado', order: 2 },
  { id: 'ensamblado', label: 'Ensamblado', order: 3 },
  { id: 'instalacion', label: 'Instalación', order: 4 },
  { id: 'entregado', label: 'Entregado', order: 5 },
];

// Status labels in Spanish
export const STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  draft: 'Borrador',
  adjustment: 'Ajuste',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending: 'Pendiente',
  'in-progress': 'En Progreso',
  delayed: 'Retrasado',
  completed: 'Completado',
  scheduled: 'Programado',
  cancelled: 'Cancelado',
  received: 'Recibido',
  partial: 'Parcial',
  defective: 'Defectuoso',
  quotation: 'Cotización',
  production: 'Producción',
  delivered: 'Entregado',
  facturado: 'Facturado',
  'sin-factura': 'Sin Factura',
};

// Quotation status flow
export const QUOTATION_STATUS_FLOW = {
  draft: ['adjustment', 'rejected'],
  adjustment: ['approved', 'rejected', 'draft'],
  approved: ['production'],
  rejected: [],
};

// Purchase order tracking
export const PO_STATUS_FLOW = {
  pending: ['received', 'partial'],
  received: [],
  partial: ['received'],
  defective: ['pending'],
};

// Common categories
export const MEASUREMENT_HOURS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
export const MAX_MEASUREMENTS_PER_DAY = 4;

// Currency format
export const CURRENCY_FORMAT = 'Bs. ';
export const CURRENCY_SYMBOL = 'Bs.';

// Date formats
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
