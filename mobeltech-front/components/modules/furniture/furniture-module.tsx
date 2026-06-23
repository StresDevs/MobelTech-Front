'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, History, Loader2, Upload } from 'lucide-react';
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

type QuotationOption = {
  id: string;
  uid?: string | null;
  clientId: string;
  clientName?: string | null;
  environmentProjects?: Array<{
    id: string;
    ambience: string;
    assignedContractorId?: string | null;
  }>;
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

export function FurnitureModule() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const { currentRole, userName } = useRole();
  const { user } = useAuth();
  const canUpload = currentRole !== 'partner';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FurnitureFile[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  async function resolveContractorId() {
    if (currentRole !== 'contractor' || !apiBase || !user) return null;
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

  const selectedQuotation = quotations.find((quotation) => quotation.id === selectedQuotationId);
  const environmentOptions = selectedQuotation?.environmentProjects ?? [];
  const selectedEnvironment = environmentOptions.find((environment) => environment.id === selectedEnvironmentId);

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
          notes: notes.trim() || null,
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
    return <PageLoadingState title="Cargando muebles" description="Sincronizando archivos SketchUp y trazabilidad." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Muebles</h2>
        <p className="text-sm text-muted-foreground">Archivos SketchUp por cliente, cotización y ambiente.</p>
      </div>

      {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

      {canUpload ? (
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1.2fr_1fr_auto]">
            <select value={selectedQuotationId} onChange={(event) => {
              setSelectedQuotationId(event.target.value);
              setSelectedEnvironmentId('');
            }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Seleccionar cotización</option>
              {quotations.map((quotation) => (
                <option key={quotation.id} value={quotation.id}>
                  #{quotation.uid ?? quotation.id} · {quotation.clientName ?? 'Cliente'}
                </option>
              ))}
            </select>
            <select value={selectedEnvironmentId} onChange={(event) => setSelectedEnvironmentId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={!selectedQuotationId}>
              <option value="">Ambiente general</option>
              {environmentOptions.map((environment) => (
                <option key={environment.id} value={environment.id}>{environment.ambience}</option>
              ))}
            </select>
            <Input type="file" accept=".skp,.skb,application/octet-stream" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            <Input placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button onClick={uploadFile} disabled={saving || !selectedQuotationId || !selectedFile} className="gap-2" style={{ backgroundColor: '#eab676', color: '#1f1f1f' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Subir
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {files.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Todavía no hay archivos SketchUp registrados.</Card>
        ) : files.map((file) => (
          <Card key={file.id} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{file.fileName}</p>
                  <Badge variant="outline">v{file.version}</Badge>
                  {file.fileSize ? <Badge variant="secondary">{file.fileSize}</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {file.clientName ?? 'Cliente'} · Cotización #{file.quotationUid ?? file.quotationId ?? 'N/A'} · {file.ambience ?? 'General'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Subido por {file.uploadedBy} · {new Date(file.createdAt).toLocaleString('es-BO')}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadFile(file)}>
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>
            {file.logs && file.logs.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Historial
                </div>
                <div className="space-y-1.5">
                  {file.logs.map((log) => (
                    <p key={log.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{log.performedBy}</span> · {log.description} · {new Date(log.performedAt).toLocaleString('es-BO')}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
