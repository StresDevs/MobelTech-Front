'use client';

import { useEffect, useState, useRef } from 'react';
import { Prequotation, PrequotationStatus, PrequotationVersion, PrequotationLog } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  History,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useLocalData } from '@/lib/contexts/LocalDataContext';

const SYSTEM_RECIPIENTS = {
  admin: '11111111-1111-1111-1111-111111111111',
  architect: '33333333-3333-3333-3333-333333333333',
} as const;

const STATUS_CONFIG: Record<
  PrequotationStatus,
  { label: string; color: string; dotColor: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Borrador',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    dotColor: '#a1a1aa',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  'in-review': {
    label: 'En revisión',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    dotColor: '#60a5fa',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  adjustment: {
    label: 'En ajuste',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dotColor: '#fbbf24',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dotColor: '#34d399',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: 'Rechazado',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dotColor: '#f87171',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const LOG_ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  created: { label: 'Creado', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-purple-500' },
  file_uploaded: { label: 'Archivo subido', icon: <Upload className="w-3.5 h-3.5" />, color: 'text-blue-500' },
  file_downloaded: { label: 'Archivo descargado', icon: <Download className="w-3.5 h-3.5" />, color: 'text-cyan-500' },
  status_changed: { label: 'Estado cambiado', icon: <RotateCcw className="w-3.5 h-3.5" />, color: 'text-amber-500' },
  comment_added: { label: 'Comentario', icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-zinc-500' },
  converted_to_quotation: { label: 'Convertido a cotización', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
};

// Status flow transitions
const STATUS_TRANSITIONS: Record<PrequotationStatus, PrequotationStatus[]> = {
  draft: ['in-review'],
  'in-review': ['adjustment', 'confirmed', 'rejected'],
  adjustment: ['in-review', 'confirmed', 'rejected'],
  confirmed: [],
  rejected: ['draft'],
};

const NEXT_STATUS_LABEL: Partial<Record<PrequotationStatus, string>> = {
  'in-review': 'Enviar a revisión',
  adjustment: 'Solicitar ajuste',
  confirmed: 'Confirmar',
  rejected: 'Rechazar',
  draft: 'Volver a borrador',
};

function formatDateTime(d: Date) {
  const value = d instanceof Date ? d : new Date(d as any);
  if (Number.isNaN(value.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(value);
}

function formatDate(d: Date) {
  const value = d instanceof Date ? d : new Date(d as any);
  if (Number.isNaN(value.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function toSafeDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface Props {
  prequotation: Prequotation;
  clientName: string;
  onBack: () => void;
  onUpdate: (updated: Prequotation) => void;
}

export function PrequotationDetail({ prequotation, clientName, onBack, onUpdate }: Props) {
  const [p, setP] = useState<Prequotation>(prequotation);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'versions' | 'history'>('versions');
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[p.status];
  const transitions = STATUS_TRANSITIONS[p.status];
  const { addQuotation, addProductionOrder, addNotification, contractors, updatePrequotation } = useLocalData();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [apiContractors, setApiContractors] = useState<typeof contractors>([]);
  const [newContractor, setNewContractor] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
  });
  const [showNewContractor, setShowNewContractor] = useState(false);
  const availableContractors = apiContractors.length > 0 ? apiContractors : contractors;

  useEffect(() => setP(prequotation), [prequotation]);

  useEffect(() => {
    if (!apiBase) return;
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json();
        setApiContractors(json);
      } catch {}
    })();
  }, [apiBase]);

  useEffect(() => {
    setP((current) => ({
      ...current,
      createdAt: toSafeDate(current.createdAt) ?? new Date(),
      updatedAt: toSafeDate(current.updatedAt) ?? new Date(),
      versions: (current.versions ?? []).map((version) => ({
        ...version,
        uploadedAt: toSafeDate(version.uploadedAt) ?? new Date(),
      })),
      logs: (current.logs ?? []).map((log) => ({
        ...log,
        performedAt: toSafeDate(log.performedAt) ?? new Date(),
      })),
    }));
  }, [prequotation]);

  async function persist(next: Prequotation) {
    if (!apiBase) return next;
    const response = await fetch(`${apiBase}/api/prequotations/${next.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!response.ok) return next;
    const saved = await response.json();
    return saved as Prequotation;
  }

  const [selectedContractorId, setSelectedContractorId] = useState<string | undefined>(undefined);
  const defaultEst = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(defaultEst.toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  function applyUpdate(updated: Prequotation) {
    setP(updated);
    onUpdate(updated);
  }

  async function createContractorQuick() {
    if (!apiBase || !newContractor.name.trim() || !newContractor.phone.trim()) return;
    const response = await fetch(`${apiBase}/api/contractors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newContractor.name.trim(),
        phone: newContractor.phone.trim(),
        email: newContractor.email.trim() || null,
        specialization: newContractor.specialization.trim() || null,
        status: 'active',
      }),
    });
    if (!response.ok) return;
    const created = await response.json();
    setApiContractors((prev) => [created, ...prev]);
    setSelectedContractorId(created.id);
    setShowNewContractor(false);
    setNewContractor({ name: '', phone: '', email: '', specialization: '' });
  }

  function notifyStateChange(previousStatus: PrequotationStatus, nextStatus: PrequotationStatus) {
    const message = `Precotización "${p.title}" cambió de ${STATUS_CONFIG[previousStatus].label} a ${STATUS_CONFIG[nextStatus].label}.`;
    const recipients = [SYSTEM_RECIPIENTS.admin, SYSTEM_RECIPIENTS.architect];

    recipients.forEach((recipientId) => {
      addNotification({
        id: `noti-${Date.now()}-${recipientId}`,
        recipientId,
        message,
        createdAt: new Date(),
        relatedJobId: p.id,
      });
    });

    try {
      window.dispatchEvent(new Event('mobeltech_notifications_change'));
    } catch {}
  }

  function changeStatus(newStatus: PrequotationStatus) {
    const previousStatus = p.status;
    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'status_changed',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: `Estado cambiado de ${STATUS_CONFIG[p.status].label} → ${STATUS_CONFIG[newStatus].label}.`,
    };
    void (async () => {
      const next = await persist({ ...p, status: newStatus, updatedAt: new Date(), logs: [...p.logs, log] });
      applyUpdate(next);
      notifyStateChange(previousStatus, newStatus);
    })();
  }

  function addComment() {
    if (!comment.trim()) return;
    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'comment_added',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: `Comentario: "${comment.trim()}"`,
    };
    void (async () => {
      const next = await persist({ ...p, updatedAt: new Date(), logs: [...p.logs, log] });
      applyUpdate(next);
    })();
    setComment('');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel =
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const fileUrl = String(reader.result ?? '');
      const newVersion: PrequotationVersion & { fileUrl: string } = {
        id: `ver-${Date.now()}`,
        version: p.currentVersion + 1,
        fileName: file.name,
        fileType: isExcel ? 'excel' : 'pdf',
        fileSize: `${Math.round(file.size / 1024)} KB`,
        uploadedBy: 'Juan Pérez',
        uploadedAt: new Date(),
        fileUrl,
      };
      const log: PrequotationLog = {
        id: `log-${Date.now()}`,
        action: 'file_uploaded',
        performedBy: 'Juan Pérez',
        performedAt: new Date(),
        description: `Archivo subido: ${file.name} (v${newVersion.version})`,
      };
      void (async () => {
        const next = await persist({
          ...p,
          currentVersion: newVersion.version,
          versions: [...p.versions, newVersion as PrequotationVersion],
          logs: [...p.logs, log],
          updatedAt: new Date(),
        });
        applyUpdate(next);
      })();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function simulateDownload(version: PrequotationVersion & { fileUrl?: string }) {
    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'file_downloaded',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: `Archivo descargado: ${version.fileName}`,
    };
    void (async () => {
      const next = await persist({ ...p, logs: [...p.logs, log] });
      applyUpdate(next);
    })();

    if (!version.fileUrl) return;

    const link = document.createElement('a');
    link.href = version.fileUrl;
    link.download = version.fileName || 'prequotation-file';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      document.body.removeChild(link);
    });
  }

  function convertToQuotation() {
    // noop - kept for compatibility; use handleConvertAndAssign from modal
  }

  function handleConvertAndAssign() {
    if (!selectedContractorId) return;
    if (apiContractors.length > 0 && !apiContractors.some((c) => c.id === selectedContractorId)) {
      setActionError('Selecciona un contratista creado en la base de datos antes de confirmar.');
      return;
    }
    setActionError(null);
    const quotationId = `quot-${Date.now()}`;

    const qItem = {
      id: `qitem-${Date.now()}`,
      description: p.title,
      quantity: 1,
      unitPrice: 0,
      dimensions: '',
    };

    const quotation = {
      id: quotationId,
      clientId: p.clientId,
      items: [qItem],
      status: 'draft',
      createdDate: new Date(),
      totalAmount: p.totalAmount ?? 0,
    } as any;

    addQuotation(quotation);

    const poId = `po-${Date.now()}`;
    const poItem = {
      id: `pitem-${Date.now()}`,
      description: qItem.description,
      quantity: qItem.quantity,
      phases: [
        { name: 'cortado', completed: false },
        { name: 'canteado', completed: false },
        { name: 'ensamblado', completed: false },
        { name: 'instalacion', completed: false },
        { name: 'entregado', completed: false },
      ],
      progress: 0,
    } as any;

    const contractorObj = availableContractors.find((c) => c.id === selectedContractorId);
    const recipientId = contractorObj?.userId ?? selectedContractorId;

    const po = {
      id: poId,
      projectId: undefined,
      quotationId: quotationId,
      items: [poItem],
      startDate: new Date(),
      estimatedDeliveryDate: estimatedDelivery ? new Date(estimatedDelivery) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      status: 'pending',
      assignedContractorId: recipientId,
    } as any;

    addProductionOrder(po);

    const noti = {
      id: `noti-${Date.now()}`,
      recipientId: recipientId,
      message: `Tienes una orden de trabajo asignada: ${po.id} (cotización ${quotationId})`,
      createdAt: new Date(),
      read: false,
      relatedJobId: po.id,
    };
    addNotification(noti);

    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'converted_to_quotation',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: `Precotización convertida a Cotización #${quotationId} y asignada a contratista ${contractorObj?.name ?? selectedContractorId}.`,
    };

    const updated: Prequotation = {
      ...p,
      status: 'confirmed',
      assignedContractorId: selectedContractorId,
      startDate: new Date(startDate),
      estimatedDeliveryDate: new Date(estimatedDelivery),
      convertedToQuotationId: quotationId,
      updatedAt: new Date(),
      logs: [...p.logs, log],
    };

    void (async () => {
      const apiResp = await fetch(`${apiBase}/api/prequotations/${p.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedContractorId: selectedContractorId,
          startDate,
          estimatedDeliveryDate: estimatedDelivery,
        }),
      });
      if (!apiResp.ok) {
        const body = await apiResp.json().catch(() => null);
        throw new Error(body?.message || body?.error || 'No se pudo confirmar la precotización');
      }
      const saved = (await apiResp.json()) as Prequotation;
      updatePrequotation(p.id, saved);
      applyUpdate(saved);
      notifyStateChange(p.status, 'confirmed');
    })();
    setShowConvertConfirm(false);
  }

  const sortedLogs = [...p.logs].sort((a, b) => {
    const left = a.performedAt instanceof Date ? a.performedAt : new Date(a.performedAt as any);
    const right = b.performedAt instanceof Date ? b.performedAt : new Date(b.performedAt as any);
    return right.getTime() - left.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-0.5 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{p.title}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
              {cfg.icon}
              {cfg.label}
            </span>
            {p.convertedToQuotationId && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cotización generada
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientName} · Creado por {p.createdBy} el {formatDate(p.createdAt)} · v{p.currentVersion} activa
          </p>
          {typeof p.totalAmount === 'number' && (
            <p className="text-sm font-medium mt-1">Monto total: Bs {p.totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status flow stepper */}
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Flujo de estado</p>
            <div className="flex items-center gap-1 flex-wrap">
              {(['draft', 'in-review', 'adjustment', 'confirmed'] as PrequotationStatus[]).map((s, i, arr) => {
                const isCurrent = p.status === s;
                const isPast =
                  ['draft', 'in-review', 'adjustment', 'confirmed'].indexOf(p.status) > i &&
                  p.status !== 'rejected';
                const sCfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isCurrent
                          ? sCfg.color
                          : isPast
                          ? 'bg-muted text-muted-foreground line-through'
                          : 'bg-muted/50 text-muted-foreground/50'
                      }`}
                    >
                      {sCfg.icon}
                      {sCfg.label}
                    </div>
                    {i < arr.length - 1 && (
                      <ChevronRight className={`w-3.5 h-3.5 ${isPast ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
                    )}
                  </div>
                );
              })}
              {p.status === 'rejected' && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_CONFIG.rejected.color}`}>
                  {STATUS_CONFIG.rejected.icon}
                  Rechazado
                </div>
              )}
            </div>

            {/* Transition actions */}
            {transitions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground w-full">Acciones disponibles:</p>
                {transitions.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'confirmed' ? 'default' : 'outline'}
                    onClick={() => (s === 'confirmed' ? setShowConvertConfirm(true) : changeStatus(s))}
                    className={`gap-1.5 text-xs ${s === 'confirmed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''} ${s === 'rejected' ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
                  >
                    {STATUS_CONFIG[s].icon}
                    {NEXT_STATUS_LABEL[s]}
                  </Button>
                ))}
                {p.status === 'confirmed' && !p.convertedToQuotationId && (
                  <Button
                    size="sm"
                    onClick={() => setShowConvertConfirm(true)}
                    className="gap-1.5 text-xs"
                    style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Convertir a Cotización
                  </Button>
                )}
              </div>
            )}
            {p.status === 'confirmed' && !p.convertedToQuotationId && transitions.length === 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => setShowConvertConfirm(true)}
                  className="gap-1.5 text-xs"
                  style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Convertir a Cotización
                </Button>
              </div>
            )}
          </Card>

          {/* Tabs: versions / history */}
          <Card className="overflow-hidden">
            <div className="flex border-b border-border">
              {(['versions', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={activeTab === tab ? { borderBottomColor: '#eab676' } : undefined}
                >
                  {tab === 'versions' ? <FileText className="w-4 h-4" /> : <History className="w-4 h-4" />}
                  {tab === 'versions' ? `Versiones (${p.versions.length})` : `Historial (${p.logs.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'versions' && (
              <div className="p-5 space-y-3">
                {/* Upload area */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-foreground/30 hover:bg-muted/30 transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: '#eab676' + '33' }}
                  >
                    <Upload className="w-5 h-5" style={{ color: '#eab676' }} />
                  </div>
                  <p className="text-sm font-medium">Subir nueva versión</p>
                  <p className="text-xs text-muted-foreground">PDF, Excel · Máx. 20 MB</p>
                </button>

                {/* Version list (newest first) */}
                <div className="space-y-2">
                  {[...p.versions].reverse().map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        v.version === p.currentVersion
                          ? 'border-foreground/20 bg-muted/30'
                          : 'border-border'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted shrink-0">
                        {v.fileType === 'excel' ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{v.fileName}</p>
                          {v.version === p.currentVersion && (
                            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                              Actual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          v{v.version} · {v.fileSize} · {v.uploadedBy} · {formatDate(v.uploadedAt)}
                        </p>
                        {v.notes && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{v.notes}</p>}
                      </div>
                      <button
                      onClick={() => simulateDownload(v as PrequotationVersion & { fileUrl?: string })}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Descargar"
                    >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-5">
                <div className="relative space-y-0">
                  {sortedLogs.map((log, i) => {
                    const actionCfg = LOG_ACTION_CONFIG[log.action] ?? {
                      label: log.action,
                      icon: <Clock className="w-3.5 h-3.5" />,
                      color: 'text-muted-foreground',
                    };
                    return (
                      <div key={log.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-muted ${actionCfg.color} z-10`}>
                            {actionCfg.icon}
                          </div>
                          {i < sortedLogs.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1 mb-1" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="pb-5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{log.performedBy}</span>
                            <span className="text-xs text-muted-foreground/60">{formatDateTime(log.performedAt)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{log.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Comment box */}
          <Card className="p-5 space-y-3">
            <p className="text-sm font-semibold">Agregar comentario</p>
            <Textarea
              placeholder="Escribe un comentario o nota sobre esta precotización…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={addComment}
                disabled={!comment.trim()}
                className="gap-1.5"
                style={comment.trim() ? { backgroundColor: '#eab676', color: '#1f1f1f' } : undefined}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Comentar
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: summary card */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-sm font-medium mt-0.5">{clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creado por</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                  >
                    {getInitials(p.createdBy)}
                  </div>
                  <p className="text-sm font-medium">{p.createdBy}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de creación</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(p.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última actualización</p>
                <p className="text-sm font-medium mt-0.5">{formatDateTime(p.updatedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Versión activa</p>
                <p className="text-sm font-medium mt-0.5">v{p.currentVersion}</p>
              </div>
              {p.convertedToQuotationId && (
                <div>
                  <p className="text-xs text-muted-foreground">Cotización generada</p>
                  <p className="text-sm font-medium mt-0.5 text-purple-600">#{p.convertedToQuotationId}</p>
                </div>
              )}
              {p.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="text-sm text-muted-foreground mt-0.5 italic">{p.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Facturación</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm font-medium">{p.billingRequested ? 'Solicita factura' : 'No solicita factura'}</p>
                  <Button
                    size="sm"
                    variant={p.billingRequested ? 'default' : 'outline'}
                    onClick={() => applyUpdate({ ...p, billingRequested: !p.billingRequested, updatedAt: new Date() })}
                    className="ml-2"
                  >
                    {p.billingRequested ? 'Quitar' : 'Marcar'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participantes</p>
            <div className="space-y-2">
              {[...new Set(p.logs.map((l) => l.performedBy))].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
                  >
                    {getInitials(name)}
                  </div>
                  <p className="text-sm">{name}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Convert to quotation confirm */}
      {showConvertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eab676' + '33' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#eab676' }} />
              </div>
              <div>
                <p className="font-semibold">Convertir a Cotización</p>
                <p className="text-sm text-muted-foreground">Al convertir, podrás asignar un contratista y generar la orden de trabajo.</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">La precotización <strong>{p.title}</strong> se marcará como <strong>Confirmada</strong> y se generará una cotización formal.</p>

            <div className="space-y-3">
              {actionError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <label className="text-sm font-medium">Asignar contratista</label>
              <select
                value={selectedContractorId}
                onChange={(e) => setSelectedContractorId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccionar contratista…</option>
                {availableContractors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.specialization}</option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewContractor((v) => !v)}
              >
                {showNewContractor ? 'Cancelar alta rápida' : 'Crear contratista'}
              </Button>

              {showNewContractor && (
                <div className="grid gap-2 rounded-lg border border-border p-3">
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Nombre" value={newContractor.name} onChange={(e) => setNewContractor({ ...newContractor, name: e.target.value })} />
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Teléfono" value={newContractor.phone} onChange={(e) => setNewContractor({ ...newContractor, phone: e.target.value })} />
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Email (opcional)" value={newContractor.email} onChange={(e) => setNewContractor({ ...newContractor, email: e.target.value })} />
                  <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Especialización" value={newContractor.specialization} onChange={(e) => setNewContractor({ ...newContractor, specialization: e.target.value })} />
                  <Button type="button" size="sm" onClick={createContractorQuick} style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                    Guardar contratista
                  </Button>
                </div>
              )}

              <label className="text-sm font-medium">Fecha estimada de entrega</label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              />

              <label className="text-sm font-medium">Fecha estimada de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConvertConfirm(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConvertAndAssign}
                disabled={!selectedContractorId}
                style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
              >
                Confirmar y asignar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
