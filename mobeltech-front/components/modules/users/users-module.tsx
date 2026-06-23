'use client';

import { useEffect, useMemo, useState } from 'react';
import { AtSign, Check, Clock, Copy, Loader2, Pencil, RefreshCw, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ApiUserRole = 'admin' | 'contractor' | 'architect' | 'partner';
type ApiUserStatus = 'active' | 'inactive';

interface ApiUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  mustChangePassword: boolean;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserCredentials {
  username: string;
  password: string;
}

interface CredentialsDialogState {
  title: string;
  description: string;
  username: string;
  password: string;
}

interface ApiResponse<T> {
  error?: string;
  detail?: string;
  message?: string;
  user?: T;
  credentials?: UserCredentials;
}

type UserStatusLabel = 'Activo' | 'Inactivo';
type PasswordStatusLabel = 'Temporal' | 'Actualizada';

interface UserFormState {
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  username: string;
  role: ApiUserRole | '';
  status: ApiUserStatus;
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  firstLastName: '',
  secondLastName: '',
  username: '',
  role: '',
  status: 'active',
};

const ROLE_OPTIONS: Array<{ value: ApiUserRole; label: string; tone: string }> = [
  { value: 'admin', label: 'Administrador', tone: 'violet' },
  { value: 'architect', label: 'Arquitecta / Gerente', tone: 'sky' },
  { value: 'contractor', label: 'Contratista', tone: 'amber' },
  { value: 'partner', label: 'Socio', tone: 'slate' },
];

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    firstLastName: parts[1] ?? '',
    secondLastName: parts.slice(2).join(' '),
  };
}

function composeName(form: Pick<UserFormState, 'firstName' | 'firstLastName' | 'secondLastName'>) {
  return [form.firstName, form.firstLastName, form.secondLastName].filter(Boolean).join(' ').trim();
}

function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40) || 'usuario';
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '');
}

function displayUsername(value: string) {
  const normalized = normalizeUsername(value);
  return normalized.startsWith('@') ? normalized : `@${normalized}`;
}

function buildUsername(form: Pick<UserFormState, 'firstName' | 'firstLastName' | 'secondLastName'>) {
  return `@${slugifyUsername(composeName(form))}`;
}

function formatRole(role: ApiUserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function roleTone(role: ApiUserRole) {
  switch (role) {
    case 'admin':
      return { bg: '#7c3aed22', color: '#7c3aed', borderColor: '#7c3aed44' };
    case 'architect':
      return { bg: '#0ea5e922', color: '#0ea5e9', borderColor: '#0ea5e944' };
    case 'contractor':
      return { bg: '#d9770622', color: '#d97706', borderColor: '#d9770644' };
    case 'partner':
      return { bg: '#47556922', color: '#475569', borderColor: '#47556944' };
    default:
      return { bg: '#6b728022', color: '#9ca3af', borderColor: '#6b728044' };
  }
}

function avatarColor(id: string) {
  const palette = [
    { bg: '#7c3aed', text: '#fff' },
    { bg: '#0ea5e9', text: '#fff' },
    { bg: '#16a34a', text: '#fff' },
    { bg: '#dc2626', text: '#fff' },
    { bg: '#d97706', text: '#fff' },
    { bg: '#db2777', text: '#fff' },
  ];

  const hash = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function buildTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = 'mt';
  for (let index = 0; index < 8; index += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
  return data?.detail || data?.error || data?.message || fallback;
}

export function UsersModule() {
  const apiBase = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL?.trim();
    return value ? value.replace(/\/$/, '') : '';
  }, []);

  const { toast } = useToast();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<CredentialsDialogState | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});

  async function loadUsers() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/users`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'No se pudieron cargar los usuarios'));
      }

      const data = (await response.json()) as ApiUser[];
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando usuarios';
      setError(message);
      toast({
        title: 'No se pudieron cargar los usuarios',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [apiBase]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setUsernameTouched(false);
    setFormErrors({});
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(user: ApiUser) {
    const parts = splitName(user.name);
    setEditingId(user.id);
    setForm({
      firstName: parts.firstName,
      firstLastName: parts.firstLastName,
      secondLastName: parts.secondLastName,
      username: normalizeUsername(user.username),
      role: user.role,
      status: user.status,
    });
    setUsernameTouched(false);
    setFormErrors({});
    setDialogOpen(true);
  }

  async function copyText(value: string, field: 'username' | 'password') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast({
        title: 'Copiado',
        description: field === 'username' ? 'El username se copió al portapapeles.' : 'La contraseña se copió al portapapeles.',
      });
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1800);
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'El navegador bloqueó el acceso al portapapeles.',
        variant: 'destructive',
      });
    }
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof UserFormState, string>> = {};

    if (!form.firstName.trim()) nextErrors.firstName = 'Requerido';
    if (!form.firstLastName.trim()) nextErrors.firstLastName = 'Requerido';
    if (!form.username.trim()) nextErrors.username = 'Requerido';
    else if (!/^@?[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(form.username.trim())) {
      nextErrors.username = 'Username inválido';
    }
    if (!form.role) nextErrors.role = 'Requerido';
    if (!form.status) nextErrors.status = 'Requerido';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNameFieldChange(field: 'firstName' | 'firstLastName' | 'secondLastName', value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (!usernameTouched) {
        next.username = buildUsername(next);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: composeName(form),
      username: normalizeUsername(form.username),
      role: form.role,
      status: form.status,
    };

    try {
      const response = await fetch(
        editingId ? `${apiBase}/api/users/${editingId}` : `${apiBase}/api/users`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json().catch(() => null)) as ApiResponse<ApiUser> | null;

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'No se pudo guardar el usuario');
      }

      await loadUsers();
      resetForm();
      setDialogOpen(false);

      if (editingId) {
        toast({
          title: 'Usuario actualizado',
          description: `Se guardaron los cambios de ${displayUsername(payload.username)}.`,
        });
      } else {
        const credentials = data?.credentials;
        const generatedPassword = credentials?.password ?? buildTemporaryPassword();
        setCredentialsDialog({
          title: 'Credenciales generadas',
          description: 'Comparte estas credenciales de forma segura. La contraseña debe cambiarse al iniciar sesión por primera vez.',
          username: displayUsername(credentials?.username ?? payload.username),
          password: generatedPassword,
        });
        toast({
          title: 'Usuario creado',
          description: 'Se generaron credenciales listas para compartir.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el usuario';
      setError(message);
      toast({
        title: 'Error al guardar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(user: ApiUser) {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    const confirmed = window.confirm(`¿Restablecer la contraseña temporal de ${user.name}?`);
    if (!confirmed) return;

    setResettingId(user.id);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/users/${user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json().catch(() => null)) as ApiResponse<ApiUser> | null;

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'No se pudo restablecer la contraseña');
      }

      await loadUsers();
      setCredentialsDialog({
        title: 'Nueva contraseña temporal',
        description: 'Comparte estas credenciales de forma segura. El usuario deberá cambiar la contraseña al entrar.',
        username: displayUsername(data?.credentials?.username ?? user.username),
        password: data?.credentials?.password ?? '********',
      });
      toast({
        title: 'Contraseña restablecida',
        description: 'Se generaron credenciales nuevas.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo restablecer la contraseña';
      setError(message);
      toast({
        title: 'Error al restablecer',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setResettingId(null);
    }
  }

  async function handleDelete(user: ApiUser) {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    const confirmed = window.confirm(`¿Eliminar definitivamente a ${user.name}?`);
    if (!confirmed) return;

    setDeletingId(user.id);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'No se pudo eliminar el usuario');
      }

      await loadUsers();
      toast({
        title: 'Usuario eliminado',
        description: `${user.name} fue eliminado correctamente.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el usuario';
      setError(message);
      toast({
        title: 'Error al eliminar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) resetForm();
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((user) => {
      const roleLabel = formatRole(user.role).toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        roleLabel.includes(q)
      );
    });
  }, [search, users]);

  const currentUsernamePreview = form.username
    ? displayUsername(form.username)
    : buildUsername(form);

  return (
    <div className="relative flex w-full flex-col gap-5 p-4 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_top,rgba(234,182,118,0.22),transparent_62%)]" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">Administra accesos, roles, estado y contraseñas temporales.</p>
        </div>

        <Button onClick={openCreateDialog} className="gap-2 bg-[#eab676] text-[#1f1f1f] hover:bg-[#dfaa61]">
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, username o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} de {users.length} usuarios visibles
        </p>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300">
          {error}
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-muted/45">
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contraseña</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-sm space-y-3">
                      <p className="font-medium text-foreground">
                        {search.trim() ? 'No se encontraron usuarios' : 'Aún no hay usuarios registrados'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {search.trim()
                          ? 'Prueba con otro término de búsqueda o limpia el filtro.'
                          : 'Crea el primer usuario para empezar a administrar accesos.'}
                      </p>
                      {!search.trim() ? (
                        <Button
                          onClick={openCreateDialog}
                          className="gap-2 bg-[#eab676] text-[#1f1f1f] hover:bg-[#dfaa61]"
                        >
                          <UserPlus className="h-4 w-4" />
                          Nuevo Usuario
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading
                ? filteredUsers.map((user) => {
                    const avatar = avatarColor(user.id);
                    const statusLabel: UserStatusLabel = user.status === 'active' ? 'Activo' : 'Inactivo';
                    const passwordStatus: PasswordStatusLabel = user.mustChangePassword ? 'Temporal' : 'Actualizada';

                    return (
                      <tr key={user.id} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/25">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm"
                              style={{ backgroundColor: avatar.bg, color: avatar.text }}
                            >
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">Usuario del sistema</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AtSign className="h-4 w-4 shrink-0" />
                            <span className="truncate">{displayUsername(user.username)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                            style={roleTone(user.role)}
                          >
                            {formatRole(user.role)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: user.status === 'active' ? '#16a34a' : '#ef4444' }}
                            />
                            <span
                              className="font-medium"
                              style={{ color: user.status === 'active' ? '#16a34a' : '#ef4444' }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.mustChangePassword ? (
                              <>
                                <Clock className="h-4 w-4 text-amber-500" />
                                <span className="font-medium text-amber-500">Temporal</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="font-medium text-emerald-500">Actualizada</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                              title="Editar usuario"
                              onClick={() => openEditDialog(user)}
                              disabled={submitting || resettingId === user.id || deletingId === user.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-50"
                              title="Restablecer contraseña"
                              onClick={() => void handleResetPassword(user)}
                              disabled={submitting || resettingId === user.id || deletingId === user.id}
                            >
                              {resettingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </button>
                            <button
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                              title="Eliminar usuario"
                              onClick={() => void handleDelete(user)}
                              disabled={submitting || resettingId === user.id || deletingId === user.id}
                            >
                              {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[min(92vw,720px)] max-h-[88vh] overflow-y-auto rounded-2xl p-0">
          <div className="border-b border-border/60 bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-4">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-amber-600" />
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Ajusta nombre, username, rol o estado del usuario.'
                  : 'Crea un acceso nuevo con username y contraseña temporal.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-border/60 bg-muted/25 p-3 shadow-none">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {getInitials(composeName(form) || 'Usuario')}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{composeName(form) || 'Nuevo usuario'}</p>
                  <p className="text-xs text-muted-foreground">{currentUsernamePreview}</p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    {form.status === 'active' ? 'Acceso activo' : 'Acceso inactivo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">
                  Nombres <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="Ej. Juan Carlos"
                  value={form.firstName}
                  onChange={(e) => handleNameFieldChange('firstName', e.target.value)}
                  className={formErrors.firstName ? 'border-red-500' : ''}
                />
                {formErrors.firstName ? <p className="text-xs text-red-500">{formErrors.firstName}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="firstLastName">
                  Primer apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstLastName"
                  placeholder="Ej. Pérez"
                  value={form.firstLastName}
                  onChange={(e) => handleNameFieldChange('firstLastName', e.target.value)}
                  className={formErrors.firstLastName ? 'border-red-500' : ''}
                />
                {formErrors.firstLastName ? <p className="text-xs text-red-500">{formErrors.firstLastName}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="secondLastName">Segundo apellido</Label>
                <Input
                  id="secondLastName"
                  placeholder="Ej. Mamani"
                  value={form.secondLastName}
                  onChange={(e) => handleNameFieldChange('secondLastName', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="@usuario"
                  value={form.username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setForm((prev) => ({ ...prev, username: e.target.value }));
                  }}
                  className={formErrors.username ? 'border-red-500' : ''}
                />
                {formErrors.username ? <p className="text-xs text-red-500">{formErrors.username}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as ApiUserRole }))}
                >
                  <SelectTrigger id="role" className={formErrors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role ? <p className="text-xs text-red-500">{formErrors.role}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">
                  Estado <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ApiUserStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccionar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.status ? <p className="text-xs text-red-500">{formErrors.status}</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Se generará o mantendrá una contraseña temporal y el usuario deberá cambiarla al iniciar sesión por primera vez.
            </div>

            <DialogFooter className="gap-2 pt-1 sm:justify-end">
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="bg-[#eab676] text-[#1f1f1f] hover:bg-[#dfaa61]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando
                  </>
                ) : editingId ? (
                  'Guardar cambios'
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(credentialsDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialsDialog(null);
            setCopiedField(null);
          }
        }}
      >
        <DialogContent className="w-[min(92vw,440px)] rounded-2xl p-0">
          <div className="border-b border-border/60 bg-gradient-to-r from-emerald-500/10 to-transparent px-5 py-4">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                {credentialsDialog?.title ?? 'Credenciales generadas'}
              </DialogTitle>
              <DialogDescription>{credentialsDialog?.description}</DialogDescription>
            </DialogHeader>
          </div>

          {credentialsDialog ? (
            <div className="space-y-4 p-5">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Username</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                    <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{credentialsDialog.username}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={() => void copyText(credentialsDialog.username, 'username')}
                    >
                      {copiedField === 'username' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'username' ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Contraseña temporal</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{credentialsDialog.password}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={() => void copyText(credentialsDialog.password, 'password')}
                    >
                      {copiedField === 'password' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'password' ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                El usuario debe cambiar su contraseña al iniciar sesión por primera vez.
              </div>

              <DialogFooter className="gap-2 pt-1 sm:justify-end">
                <Button variant="outline" onClick={() => setCredentialsDialog(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
