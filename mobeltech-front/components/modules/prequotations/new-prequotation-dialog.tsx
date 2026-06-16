'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Prequotation, PrequotationVersion, PrequotationLog } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreate: (p: Prequotation) => void;
  initialClientId?: string;
  initialMeasurementId?: string;
}

export function NewPrequotationDialog({ onClose, onCreate, initialClientId = '', initialMeasurementId }: Props) {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '', []);
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(initialClientId);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [billingRequested, setBillingRequested] = useState(false);
  const [totalAmount, setTotalAmount] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!apiBase) return;
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/api/clients`, { cache: 'no-store' });
        if (!response.ok) return;
        setClients(await response.json());
      } catch {
        // ignore; the select will just stay empty
      }
    })();
  }, [apiBase]);

  async function fileToDataUrl(nextFile: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(nextFile);
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit() {
    if (isSubmitting || !title.trim() || !clientId || !file) return;
    setError(null);
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isExcel =
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

      const fileUrl = await fileToDataUrl(file);

      const version: PrequotationVersion & { fileUrl: string } = {
        id: `ver-${Date.now()}`,
        version: 1,
        fileName: file.name,
        fileType: isExcel ? 'excel' : 'pdf',
        fileSize: `${Math.round(file.size / 1024)} KB`,
        uploadedBy: 'Juan Pérez',
        uploadedAt: new Date(),
        notes: notes.trim() || undefined,
        fileUrl,
      };

      const logs: PrequotationLog[] = [
        {
          id: `log-${Date.now()}-1`,
          action: 'created',
          performedBy: 'Juan Pérez',
          performedAt: new Date(),
          description: 'Precotización creada.',
        },
        {
          id: `log-${Date.now()}-2`,
          action: 'file_uploaded',
          performedBy: 'Juan Pérez',
          performedAt: new Date(),
          description: `Archivo subido: ${file.name} (v1)`,
        },
      ];

      const newPreq: Prequotation = {
        id: `preq-${Date.now()}`,
        clientId,
        measurementId: initialMeasurementId,
        title: title.trim(),
        status: 'draft',
        currentVersion: 1,
        versions: [version],
        logs,
        createdBy: 'Juan Pérez',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: notes.trim() || undefined,
        billingRequested: billingRequested || undefined,
        totalAmount: Number(parseFloat(totalAmount) || 0),
      };

      await onCreate(newPreq);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la precotización');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid = Boolean(title.trim() && clientId && file && !Number.isNaN(Number(parseFloat(totalAmount))));
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        {error && <Card className="p-3 border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nueva Precotización</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {initialMeasurementId
                ? 'Esta precotización quedará anclada a la medición seleccionada.'
                : 'Completa los datos y sube el archivo inicial.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Título <span className="text-red-500">*</span></label>
          <Input
            placeholder="Ej: Muebles oficina – Empresa García"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Client */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cliente <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!initialClientId || isSubmitting}
              className="w-full h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              <option value="">Seleccionar cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {initialMeasurementId && (
            <p className="text-xs text-muted-foreground rounded-md border border-[#eab676]/40 bg-[#eab676]/10 px-3 py-2">
              Anclada a la medición seleccionada. Al crearla, el icono Doc del calendario abrirá esta precotización directamente.
            </p>
          )}
        </div>

        {/* File upload */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Archivo (PDF o Excel) <span className="text-red-500">*</span></label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted shrink-0">
                {file.name.endsWith('.pdf') ? (
                  <FileText className="w-4 h-4 text-red-500" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                disabled={isSubmitting}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              disabled={isSubmitting}
              className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-foreground/30 hover:bg-muted/30 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ backgroundColor: '#eab67633' }}
              >
                <Upload className="w-5 h-5" style={{ color: '#eab676' }} />
              </div>
              <p className="text-sm font-medium">Haz clic o arrastra tu archivo</p>
              <p className="text-xs text-muted-foreground">PDF, Excel · Máx. 20 MB</p>
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notas <span className="text-xs text-muted-foreground font-normal">(opcional)</span></label>
          <Textarea
            placeholder="Observaciones iniciales…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {/* Billing request */}
        <div className="flex items-center gap-3">
          <input
            id="billingRequested"
            type="checkbox"
            checked={billingRequested}
            onChange={(e) => setBillingRequested(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4"
          />
          <label htmlFor="billingRequested" className="text-sm">
            Cliente solicita factura / facturación
          </label>
        </div>

        {/* Total amount */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Monto total (Bs) <span className="text-red-500">*</span></label>
          <Input
            placeholder="0.00"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            type="number"
            min={0}
            step="0.01"
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="gap-1.5"
            style={isValid ? { backgroundColor: '#eab676', color: '#1f1f1f' } : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Crear precotización
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
