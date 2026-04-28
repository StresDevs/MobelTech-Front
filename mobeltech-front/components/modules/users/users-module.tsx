'use client';

import { useState } from 'react';
import { Search, UserPlus, Pencil, RefreshCw, UserMinus, ShieldCheck, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ─── Types ─── */
type UserStatus = 'Activo' | 'Inactivo';
type PasswordStatus = 'Temporal' | 'Actualizada';

interface SystemUser {
  id: string;
  name: string;
  credential: string; // email or @username
  role: string;
  status: UserStatus;
  passwordStatus: PasswordStatus;
}

/* ─── Mock data (matches screenshot) ─── */
const MOCK_USERS: SystemUser[] = [
  {
    id: '1',
    name: 'Prueba2 p',
    credential: 'vultines@icloud.com',
    role: 'Solo Lectura',
    status: 'Activo',
    passwordStatus: 'Temporal',
  },
  {
    id: '2',
    name: 'Luna Maldonado',
    credential: '@l.maldonado',
    role: 'Solo Lectura',
    status: 'Inactivo',
    passwordStatus: 'Actualizada',
  },
  {
    id: '3',
    name: 'Adrian Rodrigo Terrazas Sarmiento',
    credential: 'rodrigosarmiento405@gmail.com',
    role: 'Supervisor de Almacén',
    status: 'Activo',
    passwordStatus: 'Actualizada',
  },
  {
    id: '4',
    name: 'Juan Carlos Gonzales',
    credential: 'carlos06111@gmail.com',
    role: 'Supervisor de Almacén',
    status: 'Activo',
    passwordStatus: 'Actualizada',
  },
  {
    id: '5',
    name: 'Rodrigo Mac Lean',
    credential: 'rodrigomaclean93@gmail.com',
    role: 'Administrador',
    status: 'Activo',
    passwordStatus: 'Actualizada',
  },
  {
    id: '6',
    name: 'prueba1 prueba1',
    credential: '@p.prueba',
    role: 'Solo Lectura',
    status: 'Activo',
    passwordStatus: 'Temporal',
  },
];

/* ─── Helpers ─── */
function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#7c3aed', text: '#fff' }, // violet
  { bg: '#0ea5e9', text: '#fff' }, // sky
  { bg: '#16a34a', text: '#fff' }, // green
  { bg: '#dc2626', text: '#fff' }, // red
  { bg: '#d97706', text: '#fff' }, // amber
  { bg: '#db2777', text: '#fff' }, // pink
];

function avatarColor(id: string) {
  const idx = parseInt(id, 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function roleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case 'Administrador':
      return { backgroundColor: '#7c3aed22', color: '#7c3aed', borderColor: '#7c3aed44' };
    case 'Supervisor de Almacén':
      return { backgroundColor: '#0ea5e922', color: '#0ea5e9', borderColor: '#0ea5e944' };
    default:
      return { backgroundColor: '#6b728022', color: '#9ca3af', borderColor: '#6b728044' };
  }
}

const ROLES = [
  'Administrador',
  'Supervisor de Almacén',
  'Solo Lectura',
];

const EMPTY_FORM = {
  firstName: '',
  firstLastName: '',
  secondLastName: '',
  email: '',
  phone: '',
  role: '',
};

/* ─── Component ─── */
export function UsersModule() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<SystemUser[]>(MOCK_USERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.firstName.trim()) e.firstName = 'Requerido';
    if (!form.firstLastName.trim()) e.firstLastName = 'Requerido';
    if (!form.email.trim()) e.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.role) e.role = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const fullName = [form.firstName, form.firstLastName, form.secondLastName]
      .filter(Boolean)
      .join(' ');
    const newUser: SystemUser = {
      id: String(Date.now()),
      name: fullName,
      credential: form.email,
      role: form.role,
      status: 'Activo',
      passwordStatus: 'Temporal',
    };
    setUsers((prev) => [newUser, ...prev]);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(false);
  }

  function handleOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.credential.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Administra los usuarios del sistema</p>
        </div>
        <Button
          className="flex items-center gap-2"
          style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
          onClick={() => setDialogOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, usuario o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credenciales</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contraseña</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => {
              const color = avatarColor(user.id);
              const isLast = idx === filtered.length - 1;
              return (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-muted/30 ${!isLast ? 'border-b border-border' : ''}`}
                >
                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium text-foreground truncate max-w-[220px]">{user.name}</span>
                    </div>
                  </td>

                  {/* Credential */}
                  <td className="px-4 py-3 text-muted-foreground">{user.credential}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      style={roleBadgeStyle(user.role)}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: user.status === 'Activo' ? '#16a34a' : '#ef4444' }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: user.status === 'Activo' ? '#16a34a' : '#ef4444' }}
                      >
                        {user.status}
                      </span>
                    </div>
                  </td>

                  {/* Password status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {user.passwordStatus === 'Temporal' ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-amber-500 font-medium">Temporal</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500 font-medium">Actualizada</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Editar usuario"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        title="Restablecer contraseña"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Eliminar usuario"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No se encontraron usuarios con ese criterio de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── New User Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" style={{ color: '#eab676' }} />
              Nuevo Usuario
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2">
            {/* Nombres */}
            <div className="space-y-1.5">
              <Label htmlFor="firstName">
                Nombres <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Ej. Juan Carlos"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>

            {/* Primer apellido */}
            <div className="space-y-1.5">
              <Label htmlFor="firstLastName">
                Primer Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstLastName"
                placeholder="Ej. González"
                value={form.firstLastName}
                onChange={(e) => setForm({ ...form, firstLastName: e.target.value })}
                className={errors.firstLastName ? 'border-red-500' : ''}
              />
              {errors.firstLastName && <p className="text-xs text-red-500">{errors.firstLastName}</p>}
            </div>

            {/* Segundo apellido */}
            <div className="space-y-1.5">
              <Label htmlFor="secondLastName">Segundo Apellido</Label>
              <Input
                id="secondLastName"
                placeholder="Ej. Mamani"
                value={form.secondLastName}
                onChange={(e) => setForm({ ...form, secondLastName: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ej. +591 70012345"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label htmlFor="role">
                Rol <span className="text-red-500">*</span>
              </Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger id="role" className={`w-full ${errors.role ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
            >
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
