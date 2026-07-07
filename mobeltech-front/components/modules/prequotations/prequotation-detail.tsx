'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Loader2,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  PrequotationStatus,
  { label: string; color: string; dotColor: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Elaboración',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    dotColor: '#a1a1aa',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  'in-review': {
    label: 'Enviado a Cliente',
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
  'in-review': 'Enviar a cliente',
  adjustment: 'Cliente solicitó ajuste',
  confirmed: 'Confirmar con Anticipo',
  rejected: 'Rechazar',
  draft: 'Volver a elaboración',
};

const CLIENT_CONFIRMED_DESCRIPTION = 'Cliente confirmó la precotización para avanzar a cotización.';
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv'];

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

function sortVersionsByNumber(versions: PrequotationVersion[]) {
  return [...versions].sort((a, b) => a.version - b.version);
}

function getNextVersionNumber(versions: PrequotationVersion[], currentVersion: number) {
  return Math.max(currentVersion, 0, ...versions.map((version) => version.version || 0)) + 1;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function getFileType(fileName: string): PrequotationVersion['fileType'] {
  return ['.xlsx', '.xls', '.csv'].includes(getFileExtension(fileName)) ? 'excel' : 'pdf';
}

function validateUploadFile(file: File) {
  const extension = getFileExtension(file.name);
  if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
    return 'Solo se permiten archivos PDF, Excel o CSV.';
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return 'El archivo no puede superar los 20 MB.';
  }
  return null;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

function eventHasFiles(event: DragEvent | React.DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function normalizePrequotationState(raw: any): Prequotation {
  return {
    ...raw,
    createdAt: toSafeDate(raw.createdAt) ?? new Date(),
    updatedAt: toSafeDate(raw.updatedAt) ?? new Date(),
    uidAssignedAt: toSafeDate(raw.uidAssignedAt),
    totalAmount: raw.totalAmount != null ? Number(raw.totalAmount) : undefined,
    advanceAmount: raw.advanceAmount != null ? Number(raw.advanceAmount) : undefined,
    versions: sortVersionsByNumber(
      (raw.versions ?? []).map((version: any) => ({
        ...version,
        uploadedAt: toSafeDate(version.uploadedAt) ?? new Date(),
      })),
    ),
    logs: (raw.logs ?? []).map((log: any) => ({
      ...log,
      performedAt: toSafeDate(log.performedAt) ?? new Date(),
    })),
  };
}

interface Props {
  prequotation: Prequotation;
  clientName: string;
  onBack: () => void;
  onUpdate: (updated: Prequotation) => void;
}

export function PrequotationDetail({ prequotation, clientName, onBack, onUpdate }: Props) {
  const router = useRouter();
  const [p, setP] = useState<Prequotation>(prequotation);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'versions' | 'history'>('versions');
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<PrequotationStatus | 'client-confirmed' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[p.status];
  const transitions = STATUS_TRANSITIONS[p.status];
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [confirmAdvanceAmount, setConfirmAdvanceAmount] = useState<string>(
    String(prequotation.advanceAmount ?? prequotation.totalAmount ?? ''),
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setP(normalizePrequotationState(prequotation)), [prequotation]);
  useEffect(() => {
    setConfirmAdvanceAmount(String(prequotation.advanceAmount ?? prequotation.totalAmount ?? ''));
  }, [prequotation.advanceAmount, prequotation.totalAmount]);

  useEffect(() => {
    setP((current) => normalizePrequotationState(current));
  }, [prequotation]);

  useEffect(() => {
    let dragDepth = 0;

    function handleWindowDragEnter(event: DragEvent) {
      if (!eventHasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setIsDraggingFile(true);
    }

    function handleWindowDragOver(event: DragEvent) {
      if (!eventHasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = isUploading ? 'none' : 'copy';
    }

    function handleWindowDragLeave(event: DragEvent) {
      if (!eventHasFiles(event)) return;
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDraggingFile(false);
    }

    function handleWindowDrop(event: DragEvent) {
      if (!eventHasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setIsDraggingFile(false);
    }

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [isUploading]);

  const hasClientConfirmation = p.status === 'confirmed' || p.logs.some((log) => log.description === CLIENT_CONFIRMED_DESCRIPTION);

  function getStatusDescription(status: PrequotationStatus) {
    if (status === 'in-review') return 'Enviado a cliente';
    if (status === 'adjustment') return 'Cliente solicitó ajuste';
    if (status === 'confirmed') return p.convertedToQuotationId ? 'Convertida a cotización' : 'Confirmada por cliente';
    if (status === 'rejected') return 'Rechazada o cancelada';
    return 'Pendiente de enviar al cliente';
  }

  async function persist(next: Prequotation) {
    if (!apiBase) return next;
    const response = await fetch(`${apiBase}/api/prequotations/${next.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!response.ok) return next;
    const saved = await response.json();
    return normalizePrequotationState(saved);
  }

  function applyUpdate(updated: Prequotation) {
    setP(updated);
    onUpdate(updated);
  }

  function getStatusChangeDescription(newStatus: PrequotationStatus) {
    if (newStatus === 'in-review') return 'Precotización mandada a cliente para revisión.';
    if (newStatus === 'adjustment') return 'Cliente solicitó ajuste en la precotización.';
    if (newStatus === 'rejected') return 'Precotización rechazada.';
    if (newStatus === 'draft') return 'Precotización devuelta a elaboración.';
    return `Estado cambiado de ${STATUS_CONFIG[p.status].label} → ${STATUS_CONFIG[newStatus].label}.`;
  }

  function changeStatus(newStatus: PrequotationStatus) {
    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'status_changed',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: getStatusChangeDescription(newStatus),
    };
    void (async () => {
      setStatusAction(newStatus);
      try {
        const next = await persist({ ...p, status: newStatus, updatedAt: new Date(), logs: [...p.logs, log] });
        applyUpdate(next);
        if (newStatus === 'adjustment') setActiveTab('versions');
        else if (newStatus === 'in-review') setActiveTab('history');
      } finally {
        setStatusAction(null);
      }
    })();
  }

  function markClientConfirmed() {
    if (hasClientConfirmation) {
      setShowConvertConfirm(true);
      return;
    }

    const log: PrequotationLog = {
      id: `log-${Date.now()}`,
      action: 'status_changed',
      performedBy: 'Juan Pérez',
      performedAt: new Date(),
      description: CLIENT_CONFIRMED_DESCRIPTION,
    };

    void (async () => {
      setStatusAction('client-confirmed');
      try {
        const next = await persist({ ...p, updatedAt: new Date(), logs: [...p.logs, log] });
        applyUpdate(next);
        setActiveTab('history');
      } finally {
        setStatusAction(null);
      }
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

  async function processUploadFile(file: File) {
    if (isUploading) return;
    const validationError = validateUploadFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileUrl = await fileToDataUrl(file);
      const nextVersionNumber = getNextVersionNumber(p.versions, p.currentVersion);
      const newVersion: PrequotationVersion & { fileUrl: string } = {
        id: `ver-${Date.now()}`,
        version: nextVersionNumber,
        fileName: file.name,
        fileType: getFileType(file.name),
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
      const versions = sortVersionsByNumber([...p.versions, newVersion as PrequotationVersion]);
      const next = await persist({
        ...p,
        currentVersion: newVersion.version,
        versions,
        logs: [...p.logs, log],
        updatedAt: new Date(),
      });
      applyUpdate(next);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'No se pudo subir el archivo.');
    } finally {
      setIsUploading(false);
      setIsDraggingFile(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void processUploadFile(file);
    e.target.value = '';
  }

  function handleUploadDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void processUploadFile(file);
  }

  function handleUploadDragOver(e: React.DragEvent<HTMLElement>) {
    if (!eventHasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isUploading ? 'none' : 'copy';
    setIsDraggingFile(true);
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
    const normalizedAdvance = Number(confirmAdvanceAmount);
    if (!Number.isFinite(normalizedAdvance) || normalizedAdvance <= 0) {
      setActionError('Debes registrar un monto de anticipo válido antes de confirmar.');
      return;
    }
    setActionError(null);
    void (async () => {
      setConfirming(true);
      try {
        const apiResp = await fetch(`${apiBase}/api/prequotations/${p.id}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advanceAmount: normalizedAdvance,
          }),
        });
        if (!apiResp.ok) {
          const body = await apiResp.json().catch(() => null);
          throw new Error(body?.message || body?.error || 'No se pudo confirmar la precotización');
        }
        const body = await apiResp.json();
        const saved = (body.prequotation ?? body) as Prequotation;
        const normalized = normalizePrequotationState(saved);
        applyUpdate(normalized);
        setShowConvertConfirm(false);
        if (normalized.convertedToQuotationId) {
          router.push(`/quotations?quotationId=${normalized.convertedToQuotationId}`);
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'No se pudo confirmar la precotización');
      } finally {
        setConfirming(false);
      }
    })();
  }

  const sortedLogs = [...p.logs].sort((a, b) => {
    const left = a.performedAt instanceof Date ? a.performedAt : new Date(a.performedAt as any);
    const right = b.performedAt instanceof Date ? b.performedAt : new Date(b.performedAt as any);
    return right.getTime() - left.getTime();
  });

  return (
    <div
      className="space-y-6"
      onDragOver={handleUploadDragOver}
      onDrop={handleUploadDrop}
    >
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
          <p className="text-sm text-muted-foreground mt-0.5">
            UID {p.uid ?? 'pendiente'}{p.uidAssignedAt ? ` · Asignado el ${formatDate(p.uidAssignedAt)}` : ''}
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
                {transitions
                  .filter((s) => s !== 'confirmed')
                  .map((s) => {
                    const isLoading = statusAction === s;
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={!!statusAction || confirming}
                        onClick={() => changeStatus(s)}
                        className={`gap-1.5 text-xs ${s === 'rejected' ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : STATUS_CONFIG[s].icon}
                        {isLoading ? 'Actualizando...' : NEXT_STATUS_LABEL[s]}
                      </Button>
                    );
                  })}
                {(p.status === 'in-review' || p.status === 'adjustment') && !p.convertedToQuotationId && (
                  <Button
                    size="sm"
                    variant={hasClientConfirmation ? 'default' : 'outline'}
                    disabled={!!statusAction || confirming}
                    onClick={markClientConfirmed}
                    className={`gap-1.5 text-xs ${hasClientConfirmation ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    {statusAction === 'client-confirmed' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {statusAction === 'client-confirmed'
                      ? 'Registrando...'
                      : hasClientConfirmation
                      ? 'Confirmar con Anticipo'
                      : 'Confirmado por cliente'}
                  </Button>
                )}
                {p.status === 'confirmed' && !p.convertedToQuotationId && (
                  <Button
                    size="sm"
                    onClick={() => setShowConvertConfirm(true)}
                    disabled={!hasClientConfirmation || confirming}
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
                  disabled={isUploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleUploadDragOver}
                  onDrop={handleUploadDrop}
                  disabled={isUploading}
                  aria-busy={isUploading}
                  className={`relative w-full overflow-hidden border-2 border-dashed rounded-xl p-5 sm:p-6 flex flex-col items-center gap-2 transition-all group ${
                    isDraggingFile
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-100'
                      : 'border-border hover:border-foreground/30 hover:bg-muted/30'
                  } ${isUploading ? 'cursor-wait opacity-90' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                      isUploading ? '' : 'group-hover:scale-110'
                    }`}
                    style={{ backgroundColor: isDraggingFile ? '#10b98122' : '#eab676' + '33' }}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#eab676' }} />
                    ) : isDraggingFile ? (
                      <FileText className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Upload className="w-5 h-5" style={{ color: '#eab676' }} />
                    )}
                  </div>
                  <p className="text-sm font-medium text-center">
                    {isUploading
                      ? 'Cargando archivo...'
                      : isDraggingFile
                      ? 'Suelta el archivo para agregarlo'
                      : 'Subir nueva versión'}
                  </p>
                  <p className={`text-xs text-center ${isDraggingFile ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                    {isUploading ? 'Espera un momento antes de subir otro documento' : 'Haz clic o arrastra aquí un PDF, Excel o CSV · Máx. 20 MB'}
                  </p>
                  {isUploading && (
                    <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-muted">
                      <div className="h-full w-1/2 animate-pulse rounded-r-full" style={{ backgroundColor: '#eab676' }} />
                    </div>
                  )}
                </button>
                {uploadError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {uploadError}
                  </div>
                )}

                {/* Version list (newest first) */}
                <div className="space-y-2">
                  {sortVersionsByNumber(p.versions).reverse().map((v) => (
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
              <div>
                <p className="text-xs text-muted-foreground">UID</p>
                <p className="text-sm font-medium mt-0.5">{p.uid ?? 'Pendiente de asignación'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado del cliente</p>
                <p className="text-sm font-medium mt-0.5">{getStatusDescription(p.status)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto de la precotización</p>
                <p className="text-sm font-medium mt-0.5">
                  Bs {Number(p.totalAmount ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Anticipo registrado</p>
                <p className="text-sm font-medium mt-0.5">
                  {p.advanceAmount
                    ? `Bs ${Number(p.advanceAmount).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
                    : 'Pendiente de confirmar'}
                </p>
              </div>
              {p.convertedToQuotationId && (
                <div>
                  <p className="text-xs text-muted-foreground">Cotización generada</p>
                  <p className="text-sm font-medium mt-0.5 text-purple-600">#{p.uid ?? p.convertedToQuotationId}</p>
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
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eab676' + '33' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#eab676' }} />
              </div>
              <div>
                <p className="font-semibold">Convertir a Cotización</p>
                <p className="text-sm text-muted-foreground">Se generará la cotización formal y quedará lista para organizar proyectos por ambiente.</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">La precotización <strong>{p.title}</strong> se marcará como <strong>Confirmada</strong> y se generará una cotización formal.</p>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
              <div className="space-y-4">
                {actionError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {actionError}
                  </div>
                )}
                {!hasClientConfirmation && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Primero registra que el cliente confirmó la precotización.
                  </div>
                )}
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                  <label className="text-sm font-medium">Anticipo requerido para confirmar</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={confirmAdvanceAmount}
                    onChange={(e) => setConfirmAdvanceAmount(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Ej: 5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este anticipo se copiará a la cotización y será obligatorio para cerrar la confirmación.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">Qué ocurrirá al confirmar</p>
                  <p className="text-xs text-muted-foreground mt-1">La asignación de contratista y fechas se hará después desde la cotización, por ambiente.</p>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-background/80 p-3 text-xs text-muted-foreground">
                  Se creará la cotización con:
                  <ul className="mt-2 list-disc pl-5">
                    <li>Monto total heredado de la precotización</li>
                    <li>Anticipo registrado</li>
                    <li>Referencia al cliente correcto</li>
                    <li>Base lista para crear proyectos por ambiente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConvertConfirm(false)} disabled={confirming}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConvertAndAssign}
                disabled={confirming || !hasClientConfirmation}
                style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}
              >
                {confirming ? 'Confirmando...' : 'Confirmar precotización'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
