'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Box, ChevronRight, Download, FileArchive, Inbox, Loader2, Search, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useRole } from '@/hooks/use-role-context';
import { useAuth } from '@/lib/contexts/AuthContext';

type FurnitureFile = {
  id: string;
  quotationId?: string | null;
  projectEnvironmentId?: string | null;
  assignedContractorId?: string | null;
  version: number;
  fileName: string;
  fileSize?: string | null;
  fileKind?: 'initial' | 'contractor_final' | string;
  uploadedBy: string;
  notes?: string | null;
  createdAt: string;
  quotationUid?: string | null;
  clientName?: string | null;
  ambience?: string | null;
  logs?: Array<{
    id: string;
    action: 'file_uploaded' | 'file_downloaded';
    performedBy: string;
    description: string;
    performedAt: string;
  }>;
};

type EnvironmentProject = {
  id: string;
  ambience: string;
  description?: string | null;
  assignedContractorId?: string | null;
  contractorName?: string | null;
};

type QuotationOption = {
  id: string;
  uid?: string | null;
  clientId: string;
  clientName?: string | null;
  totalAmount?: number;
  createdDate: string | Date;
  items?: Array<{ description: string }>;
  environmentProjects?: EnvironmentProject[];
};

type ContractorRecord = {
  id: string;
  userId?: string | null;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function downloadBase64File(fileName: string, data: string, mimeType?: string | null) {
  const byteCharacters = atob(data);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) bytes[i] = byteCharacters.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType || 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FurnitureModule() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const { currentRole, userName } = useRole();
  const { user } = useAuth();
  const canUpload = currentRole !== 'partner';
  const isContractor = currentRole === 'contractor';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FurnitureFile[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  async function resolveContractorId() {
    if (!isContractor || !apiBase || !user) return null;
    const response = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
    if (!response.ok) return null;
    const rows = (await response.json()) as ContractorRecord[];
    return rows.find((row) => row.userId === user.id || row.id === user.id)?.id ?? null;
  }

  async function loadData() {
    if (!apiBase) return;
    setLoading(true);
    setError(null);
    try {
      const activeContractorId = contractorId ?? await resolveContractorId();
      if (activeContractorId) setContractorId(activeContractorId);
      const query = activeContractorId ? `?contractorId=${encodeURIComponent(activeContractorId)}` : '';
      const [filesResponse, quotationsResponse] = await Promise.all([
        fetch(`${apiBase}/api/furniture-files${query}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
      ]);
      if (!filesResponse.ok) throw new Error('No se pudieron cargar los archivos de muebles.');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones.');
      setFiles(await filesResponse.json());
      setQuotations(await quotationsResponse.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando muebles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [apiBase, user?.id, currentRole]);

  const visibleQuotations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations
      .filter((quotation) => {
        if (isContractor && contractorId) {
          return (quotation.environmentProjects ?? []).some((environment) => environment.assignedContractorId === contractorId);
        }
        return true;
      })
      .filter((quotation) => {
        if (!term) return true;
        const text = [
          quotation.uid,
          quotation.id,
          quotation.clientName,
          quotation.items?.[0]?.description,
          ...(quotation.environmentProjects ?? []).map((environment) => environment.ambience),
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(term);
      });
  }, [contractorId, isContractor, quotations, search]);

  const selectedQuotation = visibleQuotations.find((quotation) => quotation.id === selectedQuotationId) ?? null;
  const selectedFiles = files.filter((file) => file.quotationId === selectedQuotation?.id);
  const selectedReceivedFiles = selectedFiles.filter((file) => isReceivedFile(file));
  const selectedSentFiles = selectedFiles.filter((file) => isSentFile(file));
  const environmentOptions = useMemo(() => {
    const environments = selectedQuotation?.environmentProjects ?? [];
    if (!isContractor || !contractorId) return environments;
    return environments.filter((environment) => environment.assignedContractorId === contractorId);
  }, [contractorId, isContractor, selectedQuotation]);
  const selectedEnvironment = environmentOptions.find((environment) => environment.id === selectedEnvironmentId) ?? environmentOptions[0] ?? null;

  function isReceivedFile(file: FurnitureFile) {
    return isContractor ? file.fileKind !== 'contractor_final' : file.fileKind === 'contractor_final';
  }

  function isSentFile(file: FurnitureFile) {
    return !isReceivedFile(file);
  }

  function getLatestFile(rows: FurnitureFile[]) {
    return [...rows].sort((left, right) => {
      if (right.version !== left.version) return right.version - left.version;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })[0] ?? null;
  }

  async function uploadFile() {
    if (!selectedFile || !selectedQuotation || !apiBase || !canUpload) return;
    setSaving(true);
    setError(null);
    try {
      const fileData = await readFileAsBase64(selectedFile);
      const response = await fetch(`${apiBase}/api/furniture-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: selectedQuotation.id,
          projectEnvironmentId: selectedEnvironment?.id ?? null,
          clientId: selectedQuotation.clientId,
          assignedContractorId: selectedEnvironment?.assignedContractorId ?? contractorId ?? null,
          fileName: selectedFile.name,
          fileSize: formatFileSize(selectedFile.size),
          mimeType: selectedFile.type || 'application/octet-stream',
          fileData,
          uploadedBy: userName,
          notes: notes.trim() || selectedEnvironment?.ambience || null,
        }),
      });
      if (!response.ok) throw new Error('No se pudo subir el archivo SketchUp.');
      setSelectedFile(null);
      setNotes('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo SketchUp.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadFile(file: FurnitureFile) {
    const response = await fetch(`${apiBase}/api/furniture-files/${file.id}/download?performedBy=${encodeURIComponent(userName)}`);
    if (!response.ok) {
      setError('No se pudo descargar el archivo.');
      return;
    }
    const payload = await response.json() as { fileName: string; mimeType?: string | null; fileData: string };
    downloadBase64File(payload.fileName, payload.fileData, payload.mimeType);
    await loadData();
  }

  if (loading) {
    return <PageLoadingState title="Cargando muebles" description="Sincronizando cotizaciones, ambientes y archivos SketchUp." />;
  }

  if (selectedQuotation) {
    const quotationCode = selectedQuotation.uid ?? selectedQuotation.id;
    const title = selectedQuotation.items?.[0]?.description ?? `Cotización #${quotationCode}`;

    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <button onClick={() => setSelectedQuotationId(null)} className="mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{title}</h1>
              <Badge variant="outline">UID {quotationCode}</Badge>
              {selectedEnvironment ? <Badge className="bg-emerald-100 text-emerald-700">{selectedEnvironment.ambience}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedQuotation.clientName ?? 'Cliente'} · {selectedReceivedFiles.length} recibido{selectedReceivedFiles.length === 1 ? '' : 's'} · {selectedSentFiles.length} enviado{selectedSentFiles.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <FileDirectionCard
                icon="received"
                title="Recibidos"
                description={isContractor ? 'Archivos enviados por administración para este mueble.' : 'Archivos recibidos desde contratistas.'}
                files={selectedReceivedFiles}
                latestFile={getLatestFile(selectedReceivedFiles)}
              />
              <FileDirectionCard
                icon="sent"
                title="Enviados"
                description={isContractor ? 'Archivos enviados por ti al equipo.' : 'Versiones enviadas al contratista.'}
                files={selectedSentFiles}
                latestFile={getLatestFile(selectedSentFiles)}
              />
            </div>

            <Card className="overflow-hidden">
              <div className="grid grid-cols-2 border-b border-border">
                <div className="border-b-2 px-5 py-4 text-center text-sm font-medium" style={{ borderColor: '#eab676' }}>
                  <FileArchive className="mr-2 inline h-4 w-4" />
                  Versiones ({selectedFiles.length})
                </div>
                
              </div>

              <div className="space-y-4 p-5">
                {canUpload ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
                      <select value={selectedEnvironmentId} onChange={(event) => setSelectedEnvironmentId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">Ambiente general</option>
                        {environmentOptions.map((environment) => (
                          <option key={environment.id} value={environment.id}>{environment.ambience}</option>
                        ))}
                      </select>
                      <Input type="file" accept=".skp,.skb,application/octet-stream" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                      <Button onClick={uploadFile} disabled={saving || !selectedFile} className="gap-2" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Subir versión
                      </Button>
                    </div>
                    <Input className="mt-3" placeholder="Nota opcional para esta versión" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </div>
                ) : null}

                {selectedFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    Todavía no hay archivos SketchUp para esta cotización.
                  </div>
                ) : selectedFiles.map((file) => (
                  <div key={file.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileArchive className="h-4 w-4 text-red-500" />
                          <p className="truncate font-semibold">{file.fileName}</p>
                          <Badge className="bg-amber-100 text-amber-700">v{file.version}</Badge>
                          {file.fileSize ? <Badge variant="secondary">{file.fileSize}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {file.ambience ?? 'General'} · {file.uploadedBy} · {formatDateTime(file.createdAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadFile(file)}>
                        <Download className="h-4 w-4" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Historial de actividad</p>
              <div className="space-y-2">
                {selectedFiles.flatMap((file) => file.logs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividad registrada todavía.</p>
                ) : selectedFiles.flatMap((file) => file.logs ?? []).map((log) => (
                  <div key={log.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <p className="font-medium">{log.performedBy}</p>
                    <p className="text-muted-foreground">{log.description} · {formatDateTime(log.performedAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen</p>
              <div className="mt-4 space-y-4 text-sm">
                <SummaryRow label="Cliente" value={selectedQuotation.clientName ?? 'Cliente'} />
                <SummaryRow label="Cotización" value={`#${quotationCode}`} />
                <SummaryRow label="Proyecto / ambiente" value={selectedEnvironment?.ambience ?? 'General'} />
                <SummaryRow label="Creada" value={formatDate(selectedQuotation.createdDate)} />
                <SummaryRow label="Última versión" value={selectedFiles[0] ? `v${selectedFiles[0].version}` : 'Sin archivo'} />
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permisos</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {canUpload ? 'Puedes subir nuevas versiones y descargar archivos SketchUp.' : 'Tu rol puede ver y descargar archivos SketchUp.'}
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Muebles</h2>
          <p className="text-sm text-muted-foreground">
            {isContractor ? 'Cotizaciones y ambientes asignados a tu perfil.' : 'Selecciona una cotización y administra sus archivos SketchUp.'}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cotización o cliente..." className="pl-9" />
        </div>
      </div>

      {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

      <div className="space-y-3">
        {visibleQuotations.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No hay cotizaciones disponibles para Muebles.</Card>
        ) : visibleQuotations.map((quotation) => {
          const quotationFiles = files.filter((file) => file.quotationId === quotation.id);
          const receivedFiles = quotationFiles.filter((file) => isReceivedFile(file));
          const sentFiles = quotationFiles.filter((file) => isSentFile(file));
          const latestReceivedFile = getLatestFile(receivedFiles);
          const latestSentFile = getLatestFile(sentFiles);
          const environments = isContractor && contractorId
            ? (quotation.environmentProjects ?? []).filter((environment) => environment.assignedContractorId === contractorId)
            : quotation.environmentProjects ?? [];
          const title = quotation.items?.[0]?.description ?? `Cotización #${quotation.uid ?? quotation.id}`;
          return (
            <Card key={quotation.id} onClick={() => {
              setSelectedQuotationId(quotation.id);
              setSelectedEnvironmentId(environments[0]?.id ?? '');
            }} className="cursor-pointer p-4 transition-all hover:border-foreground/20 hover:shadow-md">
              <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.2fr)_minmax(190px,0.75fr)_minmax(190px,0.75fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Box className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{title}</p>
                    <Badge variant="outline">UID {quotation.uid ?? quotation.id.slice(0, 8)}</Badge>
                    <Badge className="bg-blue-100 text-blue-700">{quotationFiles.length} archivo{quotationFiles.length === 1 ? '' : 's'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quotation.clientName ?? 'Cliente'} · {environments.length || 1} ambiente{(environments.length || 1) === 1 ? '' : 's'} · {formatDate(quotation.createdDate)}
                  </p>
                </div>
                </div>
                <DirectionColumn icon="received" title="Recibidos" count={receivedFiles.length} latestFile={latestReceivedFile} />
                <DirectionColumn icon="sent" title="Enviados" count={sentFiles.length} latestFile={latestSentFile} />
                <ChevronRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DirectionColumn({
  icon,
  title,
  count,
  latestFile,
}: {
  icon: 'received' | 'sent';
  title: string;
  count: number;
  latestFile: FurnitureFile | null;
}) {
  const Icon = icon === 'received' ? Inbox : Send;
  return (
    <div className="rounded-lg border border-border bg-muted/15 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${icon === 'received' ? 'text-sky-600' : 'text-emerald-600'}`} />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        </div>
        <Badge variant="outline">{count}</Badge>
      </div>
      <p className="mt-1 truncate text-sm font-medium">{latestFile ? latestFile.fileName : 'Sin archivos'}</p>
      <p className="text-xs text-muted-foreground">{latestFile ? `v${latestFile.version} · ${formatDateTime(latestFile.createdAt)}` : 'Pendiente'}</p>
    </div>
  );
}

function FileDirectionCard({
  icon,
  title,
  description,
  files,
  latestFile,
}: {
  icon: 'received' | 'sent';
  title: string;
  description: string;
  files: FurnitureFile[];
  latestFile: FurnitureFile | null;
}) {
  const Icon = icon === 'received' ? Inbox : Send;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${icon === 'received' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant="outline">{files.length}</Badge>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted/15 p-3">
        <p className="truncate text-sm font-medium">{latestFile ? latestFile.fileName : 'Sin archivos registrados'}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {latestFile ? `Último: v${latestFile.version} · ${latestFile.uploadedBy} · ${formatDateTime(latestFile.createdAt)}` : 'Aún no hay movimiento en esta bandeja.'}
        </p>
      </div>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
