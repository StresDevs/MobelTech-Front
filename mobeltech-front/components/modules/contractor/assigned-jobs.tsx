'use client';

import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AlertCircle, BellRing, Download, Loader2, RefreshCw } from 'lucide-react';

type ContractorRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  specialization?: string | null;
  status: string;
};

type QuotationRecord = {
  id: string;
  uid?: string | null;
  clientId: string;
  totalAmount?: number;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
};

type ProductionOrderRecord = {
  id: string;
  projectId?: string | null;
  quotationId?: string | null;
  assignedContractorId?: string | null;
  startDate: string | Date;
  estimatedDeliveryDate: string | Date;
  actualDeliveryDate?: string | Date | null;
  status: 'pending' | 'in-progress' | 'delayed' | 'completed';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    progress?: number;
    phases?: Array<{
      phase: ProductionPhase;
      completed: string;
    }>;
  }>;
};

type ProductionPhase = 'cortado' | 'canteado' | 'ensamblado' | 'instalacion' | 'entregado';

const PRODUCTION_PHASE_OPTIONS: Array<{ value: ProductionPhase; label: string; progress: number }> = [
  { value: 'cortado', label: 'Corte', progress: 20 },
  { value: 'canteado', label: 'Canteado', progress: 40 },
  { value: 'ensamblado', label: 'Ensamblado', progress: 60 },
  { value: 'instalacion', label: 'Instalación', progress: 80 },
  { value: 'entregado', label: 'Entrega', progress: 100 },
];

type NotificationRecord = {
  id: string;
  recipientUserId: string;
  message: string;
  relatedJobId?: string | null;
  read: boolean;
  createdAt: string | Date;
};

type ContractorPaymentPlan = {
  id: string;
  contractorId: string;
  productionOrderId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

type FurnitureFileRecord = {
  id: string;
  quotationId?: string | null;
  projectEnvironmentId?: string | null;
  assignedContractorId?: string | null;
  fileName: string;
  fileSize?: string | null;
  version: number;
  ambience?: string | null;
};

function normalizeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) return 'N/A';
  return date.toLocaleDateString('es-BO');
}

function formatCurrency(amount: number) {
  return `Bs. ${Number(amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: ProductionOrderRecord['status']) {
  if (status === 'pending') return 'Pendiente';
  if (status === 'in-progress') return 'En progreso';
  if (status === 'delayed') return 'Retrasado';
  return 'Completado';
}

function statusClass(status: ProductionOrderRecord['status']) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'in-progress') return 'bg-sky-100 text-sky-700';
  if (status === 'delayed') return 'bg-red-100 text-red-700';
  return 'bg-zinc-100 text-zinc-700';
}

async function loadLogoDataUrl() {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.src = '/mobeltech-logo.png';
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
  });
}

export default function AssignedJobs() {
  const { user } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ProductionOrderRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [furnitureFiles, setFurnitureFiles] = useState<FurnitureFileRecord[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<ContractorPaymentPlan[]>([]);
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);

  async function loadAssignedData(options?: { silent?: boolean }) {
    if (!apiBase || !user) {
      setLoading(false);
      return;
    }

    const silent = options?.silent === true;
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }

    try {
      let activeContractor = contractor;
      if (!activeContractor) {
        const contractorsResponse = await fetch(`${apiBase}/api/contractors`, { cache: 'no-store' });
        if (!contractorsResponse.ok) throw new Error('No se pudieron cargar los contratistas');
        const contractorRows = (await contractorsResponse.json()) as ContractorRecord[];
        activeContractor = contractorRows.find((row) => row.userId === user.id || row.id === user.id) ?? null;
        setContractor(activeContractor);
      }

      if (!activeContractor) {
        setJobs([]);
        setNotifications([]);
        setClients([]);
        setQuotations([]);
        setPaymentPlans([]);
        setFurnitureFiles([]);
        setLoading(false);
        return;
      }

      const [jobsResponse, notificationsResponse, clientsResponse, quotationsResponse, plansResponse, furnitureFilesResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/notifications?recipientUserId=${encodeURIComponent(user.id)}&unreadOnly=true`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/plans?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/furniture-files?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
      ]);

      if (!jobsResponse.ok) throw new Error('No se pudieron cargar los trabajos asignados');
      if (!notificationsResponse.ok) throw new Error('No se pudieron cargar las notificaciones');
      if (!clientsResponse.ok) throw new Error('No se pudieron cargar los clientes');
      if (!quotationsResponse.ok) throw new Error('No se pudieron cargar las cotizaciones');

      setJobs(await jobsResponse.json());
      setNotifications(await notificationsResponse.json());
      setClients(await clientsResponse.json());
      setQuotations(await quotationsResponse.json());
      setPaymentPlans(plansResponse.ok ? await plansResponse.json() : []);
      setFurnitureFiles(furnitureFilesResponse.ok ? await furnitureFilesResponse.json() : []);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Error cargando trabajos del contratista');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssignedData();
  }, [apiBase, user?.id]);

  useEffect(() => {
    if (!apiBase || !user) return;
    const interval = window.setInterval(() => {
      void loadAssignedData({ silent: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [apiBase, user?.id, contractor?.id]);

  async function markNotificationAsRead(notificationId: string) {
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) return;
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch {
      // Notification read state should not block the jobs page.
    }
  }

  const summary = useMemo(() => ({
    total: jobs.length,
    pending: jobs.filter((job) => job.status === 'pending').length,
    inProgress: jobs.filter((job) => job.status === 'in-progress').length,
    completed: jobs.filter((job) => job.status === 'completed').length,
  }), [jobs]);

  function getQuotation(job: ProductionOrderRecord) {
    return quotations.find((quotation) => quotation.id === job.quotationId);
  }

  function getClient(job: ProductionOrderRecord) {
    const quotation = getQuotation(job);
    return clients.find((client) => client.id === quotation?.clientId);
  }

  function getLeadDescription(job: ProductionOrderRecord) {
    const quotation = getQuotation(job);
    return quotation?.items?.[0]?.description || job.items[0]?.description || 'Trabajo sin descripción';
  }

  function getPayAmount(job: ProductionOrderRecord) {
    const plan = paymentPlans.find((entry) => entry.productionOrderId === job.id);
    if (plan) return plan.totalAmount;
    return getQuotation(job)?.totalAmount ?? 0;
  }

  function getSketchupFile(job: ProductionOrderRecord) {
    return furnitureFiles.find((file) => file.quotationId === job.quotationId && (!job.projectId || file.assignedContractorId === job.assignedContractorId));
  }

  function getJobProgress(job: ProductionOrderRecord) {
    return Math.round(job.items.reduce((sum, item) => sum + (item.progress || 0), 0) / (job.items.length || 1));
  }

  function getCurrentPhase(job: ProductionOrderRecord): ProductionPhase {
    const progress = getJobProgress(job);
    const matching = [...PRODUCTION_PHASE_OPTIONS].reverse().find((phase) => progress >= phase.progress);
    return matching?.value ?? 'cortado';
  }

  async function updateJobPhase(jobId: string, phase: ProductionPhase) {
    if (!apiBase) return;
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/production-orders/${jobId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar la etapa.');
      const updated = await response.json() as ProductionOrderRecord;
      setJobs((current) => current.map((job) => (job.id === jobId ? updated : job)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando etapa.');
    }
  }

  async function downloadSketchupFile(file: FurnitureFileRecord) {
    if (!apiBase || !user) return;
    const response = await fetch(`${apiBase}/api/furniture-files/${file.id}/download?performedBy=${encodeURIComponent(user.name)}`);
    if (!response.ok) {
      setError('No se pudo descargar el archivo SketchUp.');
      return;
    }

    const payload = await response.json() as { fileName: string; mimeType?: string | null; fileData: string };
    const byteCharacters = atob(payload.fileData);
    const bytes = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) bytes[i] = byteCharacters.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: payload.mimeType || 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = payload.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function generateWorkOrderPdf(job: ProductionOrderRecord) {
    const quotation = getQuotation(job);
    const client = getClient(job);
    const description = getLeadDescription(job);
    const payAmount = getPayAmount(job);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadLogoDataUrl();

    doc.setFillColor(248, 248, 248);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 10, 186, 276, 4, 4, 'F');

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 16, 15, 24, 16);
    } else {
      doc.setDrawColor(80, 80, 80);
      doc.rect(16, 15, 18, 14);
      doc.setFontSize(8);
      doc.text('MT', 22, 24);
    }

    doc.setTextColor(28, 28, 28);
    doc.setFontSize(18);
    doc.text('MOBELTECH', 44, 21);
    doc.setFontSize(12);
    doc.setTextColor(95, 95, 95);
    doc.text('Orden de trabajo', 44, 29);

    doc.setDrawColor(220, 220, 220);
    doc.line(16, 38, 194, 38);

    let y = 50;
    doc.setTextColor(28, 28, 28);
    doc.setFontSize(13);
    doc.text('Resumen del trabajo', 16, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Orden: ${job.id}`, 16, y);
    y += 6;
    doc.text(`Cotización: ${quotation?.id ?? 'N/A'}`, 16, y);
    y += 6;
    doc.text(`Fecha de creación del documento: ${new Date().toLocaleDateString('es-BO')}`, 16, y);

    y += 12;
    doc.setTextColor(28, 28, 28);
    doc.setFontSize(13);
    doc.text('Datos principales', 16, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Contratista asignado: ${contractor?.name ?? 'N/A'}`, 16, y);
    y += 6;
    doc.text(`Cliente: ${client?.name ?? 'N/A'}`, 16, y);
    y += 6;
    doc.text(`Estado: ${statusLabel(job.status)}`, 16, y);
    y += 6;
    doc.text(`Fecha inicio estimada: ${formatDate(job.startDate)}`, 16, y);
    y += 6;
    doc.text(`Fecha fin estimada: ${formatDate(job.estimatedDeliveryDate)}`, 16, y);
    y += 6;
    doc.text(`Monto a pagar al contratista: ${formatCurrency(payAmount)}`, 16, y);

    y += 12;
    doc.setTextColor(28, 28, 28);
    doc.setFontSize(13);
    doc.text('Descripción de trabajo', 16, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(description, 16, y, { maxWidth: 174 });
    y += 18;

    doc.setTextColor(28, 28, 28);
    doc.setFontSize(13);
    doc.text('Ítems / tareas', 16, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const items = job.items.length > 0 ? job.items : quotation?.items ?? [];
    items.slice(0, 12).forEach((item, index) => {
      doc.text(`${index + 1}. ${item.description} - Cantidad: ${item.quantity}`, 18, y, { maxWidth: 168 });
      y += 6;
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(16, 262, 194, 262);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Documento generado automáticamente por MobelTech.', 16, 270);
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, 16, 276);

    const safeName = description.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40) || 'trabajo';
    doc.save(`orden_trabajo_${safeName}_${job.id.slice(0, 8)}.pdf`);
  }

  if (!user) {
    return <Card className="p-4">Inicia sesión para ver tus trabajos asignados.</Card>;
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando trabajos asignados"
        description="Sincronizando órdenes de trabajo y datos del contratista."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Trabajos asignados</h2>
          <p className="text-sm text-muted-foreground">
            {contractor ? `${contractor.name} · resumen operativo de tus órdenes de trabajo.` : 'No encontramos tu perfil de contratista.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando</span> : null}
          <Button variant="outline" size="sm" onClick={() => void loadAssignedData({ silent: true })} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <SummaryPill label="Total" value={summary.total} />
        <SummaryPill label="Pendientes" value={summary.pending} />
        <SummaryPill label="En progreso" value={summary.inProgress} />
        <SummaryPill label="Completados" value={summary.completed} />
      </div>

      {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className="border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-600" />
                    <p className="truncate text-sm font-medium text-amber-900">{notification.message}</p>
                  </div>
                  <p className="mt-1 text-xs text-amber-800/80">{formatDate(notification.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void markNotificationAsRead(notification.id)}>
                  Marcar leído
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trabajo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resumen</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pago</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fin estimado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etapa</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">SketchUp</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No tienes trabajos asignados por el momento.</td>
                </tr>
              ) : jobs.map((job) => {
                const client = getClient(job);
                const description = getLeadDescription(job);
                const sketchupFile = getSketchupFile(job);
                const progress = getJobProgress(job);
                return (
                  <tr key={job.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-muted-foreground">{job.id.slice(0, 8)}</p>
                      <p className="font-medium">Orden de trabajo</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate font-medium">{description}</p>
                      <p className="text-xs text-muted-foreground">{job.items.length} tareas · avance {progress}%</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{client?.name ?? 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{client?.phone ?? 'Sin contacto'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(getPayAmount(job))}</td>
                    <td className="px-4 py-3">{formatDate(job.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(job.estimatedDeliveryDate)}</td>
                    <td className="px-4 py-3"><Badge className={statusClass(job.status)}>{statusLabel(job.status)}</Badge></td>
                    <td className="px-4 py-3">
                      <select
                        value={getCurrentPhase(job)}
                        onChange={(event) => void updateJobPhase(job.id, event.target.value as ProductionPhase)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                      >
                        {PRODUCTION_PHASE_OPTIONS.map((phase) => (
                          <option key={phase.value} value={phase.value}>{phase.label} · {phase.progress}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => sketchupFile ? void downloadSketchupFile(sketchupFile) : void generateWorkOrderPdf(job)} className="gap-2" disabled={!sketchupFile}>
                        <Download className="h-4 w-4" />
                        {sketchupFile ? 'Descargar' : 'Sin archivo'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </Card>
  );
}
