'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BellRing, CalendarRange, Download, Loader2, RefreshCw, Upload, WalletCards } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getNotificationTarget } from '@/lib/notification-routing';

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
  environmentProjects?: Array<{
    id: string;
    projectId?: string | null;
    assignedContractorId?: string | null;
    ambience: string;
    description?: string | null;
    sketchupFileName?: string | null;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
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
  reviewStatus?: 'submitted' | 'approved' | 'rejected' | string;
  reviewNotes?: string | null;
  paidAmount: number;
  remainingAmount: number;
  lines?: Array<{
    id: string;
    phaseKey: string;
    phaseLabel: string;
    plannedAmount: number;
  }>;
};

type FurnitureFileRecord = {
  id: string;
  quotationId?: string | null;
  projectEnvironmentId?: string | null;
  assignedContractorId?: string | null;
  fileName: string;
  fileSize?: string | null;
  fileKind?: 'initial' | 'contractor_final' | string;
  version: number;
  ambience?: string | null;
};

type AdvanceRequestRecord = {
  id: string;
  planId: string;
  contractorId: string;
  productionOrderId: string;
  amount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'paid' | string;
  notes?: string | null;
  reviewNotes?: string | null;
  requestedAt?: string | Date;
};

type LaborCatalogItem = {
  id: string;
  itemKey: string;
  label: string;
  defaultAmount: number;
  active: boolean;
  sortOrder: number;
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
  const router = useRouter();
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
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequestRecord[]>([]);
  const [laborItems, setLaborItems] = useState<LaborCatalogItem[]>([]);
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);
  const [editingLaborJobId, setEditingLaborJobId] = useState<string | null>(null);
  const [selectedLaborItems, setSelectedLaborItems] = useState<string[]>([]);
  const [savingLabor, setSavingLabor] = useState(false);
  const [uploadingFinalJobId, setUploadingFinalJobId] = useState<string | null>(null);
  const [advanceJobId, setAdvanceJobId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);

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
        setAdvanceRequests([]);
        setFurnitureFiles([]);
        setLoading(false);
        return;
      }

      const [jobsResponse, notificationsResponse, clientsResponse, quotationsResponse, plansResponse, furnitureFilesResponse, laborItemsResponse, advanceRequestsResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/notifications?recipientUserId=${encodeURIComponent(user.id)}&unreadOnly=true`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/plans?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/furniture-files?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/labor-items`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/advance-requests?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
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
      setLaborItems(laborItemsResponse.ok ? await laborItemsResponse.json() : []);
      setAdvanceRequests(advanceRequestsResponse.ok ? await advanceRequestsResponse.json() : []);
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

  async function handleNotificationClick(notification: NotificationRecord) {
    await markNotificationAsRead(notification.id);
    const target = getNotificationTarget(notification, 'contractor');
    if (target) {
      router.push(target);
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

  function getEnvironment(job: ProductionOrderRecord) {
    const quotation = getQuotation(job);
    return quotation?.environmentProjects?.find((environment) => (
      environment.projectId === job.projectId ||
      (environment.assignedContractorId === job.assignedContractorId && environment.id)
    )) ?? null;
  }

  function getLeadDescription(job: ProductionOrderRecord) {
    const environment = getEnvironment(job);
    if (environment?.ambience) return environment.ambience;
    const quotation = getQuotation(job);
    return quotation?.items?.[0]?.description || job.items[0]?.description || 'Trabajo sin descripción';
  }

  function getPayAmount(job: ProductionOrderRecord) {
    const plan = paymentPlans.find((entry) => entry.productionOrderId === job.id);
    if (plan) return plan.totalAmount;
    return getQuotation(job)?.totalAmount ?? 0;
  }

  function getInitialSketchupFile(job: ProductionOrderRecord) {
    const environment = getEnvironment(job);
    return furnitureFiles.find((file) => (
      file.fileKind !== 'contractor_final' &&
      ((environment?.id && file.projectEnvironmentId === environment.id) ||
      (file.quotationId === job.quotationId && file.assignedContractorId === job.assignedContractorId))
    ));
  }

  function getFinalSketchupFile(job: ProductionOrderRecord) {
    const environment = getEnvironment(job);
    return furnitureFiles.find((file) => (
      file.fileKind === 'contractor_final' &&
      ((environment?.id && file.projectEnvironmentId === environment.id) ||
      (file.quotationId === job.quotationId && file.assignedContractorId === job.assignedContractorId))
    ));
  }

  function getPaymentPlan(job: ProductionOrderRecord) {
    return paymentPlans.find((entry) => entry.productionOrderId === job.id);
  }

  function getAdvanceRequest(job: ProductionOrderRecord) {
    const plan = getPaymentPlan(job);
    if (!plan) return undefined;
    return advanceRequests.find((request) => request.planId === plan.id);
  }

  function laborStatusLabel(plan?: ContractorPaymentPlan) {
    if (!plan) return 'Pendiente presupuesto';
    if (plan.reviewStatus === 'approved') return 'Aprobado';
    if (plan.reviewStatus === 'rejected') return 'Rechazado';
    return 'En revision por admin';
  }

  function laborStatusClass(plan?: ContractorPaymentPlan) {
    if (!plan) return 'bg-zinc-100 text-zinc-700';
    if (plan.reviewStatus === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (plan.reviewStatus === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  function openLaborForm(job: ProductionOrderRecord) {
    const plan = getPaymentPlan(job);
    const availableItems = laborItems;
    setEditingLaborJobId(job.id);
    setSelectedLaborItems(
      plan?.lines?.map((line) => line.phaseKey).filter((key) => availableItems.some((option) => option.itemKey === key)) ?? [],
    );
  }

  async function saveLaborPlan(job: ProductionOrderRecord) {
    if (!apiBase || !contractor || selectedLaborItems.length === 0) return;
    setSavingLabor(true);
    setError(null);
    try {
      const availableItems = laborItems;
      const lines = availableItems
        .filter((item) => selectedLaborItems.includes(item.itemKey))
        .map((item, index) => ({
          phaseKey: item.itemKey,
          phaseLabel: item.label,
          plannedAmount: item.defaultAmount,
          sortOrder: index,
        }));
      const totalAmount = lines.reduce((sum, line) => sum + line.plannedAmount, 0);
      const response = await fetch(`${apiBase}/api/contractor-finance/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: contractor.id,
          productionOrderId: job.id,
          totalAmount,
          lines,
        }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el presupuesto de mano de obra.');
      const saved = await response.json() as ContractorPaymentPlan;
      setPaymentPlans((current) => {
        const withoutCurrent = current.filter((plan) => plan.productionOrderId !== job.id);
        return saved ? [...withoutCurrent, saved] : current;
      });
      setEditingLaborJobId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando mano de obra.');
    } finally {
      setSavingLabor(false);
    }
  }

  function readApiError(data: unknown, fallback: string) {
    if (data && typeof data === 'object') {
      const payload = data as { error?: string; detail?: string; message?: string };
      return payload.detail || payload.error || payload.message || fallback;
    }
    return fallback;
  }

  function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function uploadFinalSketchup(job: ProductionOrderRecord, file?: File | null) {
    if (!apiBase || !contractor || !user || !file) return;
    const environment = getEnvironment(job);
    const quotation = getQuotation(job);
    const client = getClient(job);
    if (!environment?.id || !quotation?.id) {
      setError('No se encontró el ambiente para subir el SketchUp final.');
      return;
    }

    setUploadingFinalJobId(job.id);
    setError(null);
    try {
      const fileData = await fileToBase64(file);
      const response = await fetch(`${apiBase}/api/furniture-files/contractor-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          projectEnvironmentId: environment.id,
          clientId: client?.id ?? quotation.clientId,
          assignedContractorId: contractor.id,
          fileName: file.name,
          fileSize: String(file.size),
          mimeType: file.type || 'application/octet-stream',
          fileData,
          uploadedBy: user.name || contractor.name,
          notes: 'SketchUp final subido por contratista',
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiError(data, 'No se pudo subir el SketchUp final.'));
      setFurnitureFiles((current) => [
        ...current.filter((entry) => !(entry.fileKind === 'contractor_final' && entry.projectEnvironmentId === environment.id && entry.assignedContractorId === contractor.id)),
        data as FurnitureFileRecord,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo SketchUp final.');
    } finally {
      setUploadingFinalJobId(null);
    }
  }

  function openAdvanceModal(job: ProductionOrderRecord) {
    const plan = getPaymentPlan(job);
    const request = getAdvanceRequest(job);
    setAdvanceJobId(job.id);
    setAdvanceAmount(String(request?.amount ?? Math.round((plan?.totalAmount ?? 0) * 0.3)));
    setAdvanceNotes(request?.notes ?? '');
  }

  async function saveAdvanceRequest(job: ProductionOrderRecord) {
    if (!apiBase || !contractor) return;
    const plan = getPaymentPlan(job);
    if (!plan) return;
    setSavingAdvance(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/advance-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          contractorId: contractor.id,
          productionOrderId: job.id,
          amount: Number(advanceAmount),
          notes: advanceNotes || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiError(data, 'No se pudo enviar la solicitud de anticipo.'));
      setAdvanceRequests((current) => [data as AdvanceRequestRecord, ...current.filter((entry) => entry.planId !== plan.id)]);
      setAdvanceJobId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando solicitud de anticipo.');
    } finally {
      setSavingAdvance(false);
    }
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
    const { jsPDF } = await import('jspdf');
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

  const laborJob = jobs.find((job) => job.id === editingLaborJobId) ?? null;
  const advanceJob = jobs.find((job) => job.id === advanceJobId) ?? null;
  const advancePlan = advanceJob ? getPaymentPlan(advanceJob) : undefined;
  const activeAdvanceRequest = advanceJob ? getAdvanceRequest(advanceJob) : undefined;
  const availableLaborItems = laborItems;
  const laborTotal = availableLaborItems
    .filter((item) => selectedLaborItems.includes(item.itemKey))
    .reduce((sum, item) => sum + item.defaultAmount, 0);

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
            <Card key={notification.id} className="border-amber-200 bg-amber-50 p-3 transition hover:border-amber-300 hover:bg-amber-100/80">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-600" />
                    <p className="truncate text-sm font-medium text-amber-900">{notification.message}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-amber-800/80">{formatDate(notification.createdAt)}</p>
                    {getNotificationTarget(notification, 'contractor') ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">Abrir</span>
                    ) : null}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    void markNotificationAsRead(notification.id);
                  }}
                >
                  Marcar leído
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trabajo Asignado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resumen</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pago</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inicio y fin estimado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">SketchUp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etapa</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Solicitud de anticipo</th>
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
                const initialSketchupFile = getInitialSketchupFile(job);
                const finalSketchupFile = getFinalSketchupFile(job);
                const environment = getEnvironment(job);
                const plan = getPaymentPlan(job);
                const advanceRequest = getAdvanceRequest(job);
                const progress = getJobProgress(job);
                return (
                  <tr key={job.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-muted-foreground">{job.id.slice(0, 8)}</p>
                      <p className="font-medium">Sketch UP inicial</p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!initialSketchupFile}
                        onClick={() => initialSketchupFile ? void downloadSketchupFile(initialSketchupFile) : undefined}
                        className="mt-1 max-w-[190px] gap-2"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        <span className="truncate">{initialSketchupFile?.fileName ?? environment?.sketchupFileName ?? 'Sin archivo .skp'}</span>
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate font-medium">{description}</p>
                      <p className="text-xs text-muted-foreground">{environment?.description || `${job.items.length} tareas · avance ${progress}%`}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{client?.name ?? 'N/A'}</p>
                      <p className="max-w-[180px] truncate text-xs text-muted-foreground">{client?.address || client?.phone || 'Sin direccion'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => openLaborForm(job)}>
                        <WalletCards className="h-4 w-4" />
                        {plan ? formatCurrency(plan.totalAmount) : 'Calcular mano de obra'}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatDate(job.startDate)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(job.estimatedDeliveryDate)}</p>
                      <Button size="sm" variant="ghost" className="mt-1 h-7 gap-1 px-2 text-xs" onClick={() => window.location.assign('/schedule')}>
                        <CalendarRange className="h-3.5 w-3.5" />
                        Definir cronograma
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {finalSketchupFile ? (
                          <Button size="sm" variant="outline" onClick={() => void downloadSketchupFile(finalSketchupFile)} className="max-w-[190px] gap-2">
                            <Download className="h-4 w-4 shrink-0" />
                            <span className="truncate">{finalSketchupFile.fileName}</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin final</span>
                        )}
                        <Label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                          {uploadingFinalJobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {finalSketchupFile ? 'Reemplazar final' : 'Subir final'}
                          <Input
                            type="file"
                            accept=".skp,.skb,application/octet-stream"
                            disabled={uploadingFinalJobId === job.id}
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              void uploadFinalSketchup(job, file);
                              event.target.value = '';
                            }}
                          />
                        </Label>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={laborStatusClass(plan)}>{laborStatusLabel(plan)}</Badge>
                      {plan?.reviewStatus === 'rejected' && plan.reviewNotes ? (
                        <p className="mt-1 max-w-[180px] text-xs text-red-700">{plan.reviewNotes}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {plan?.reviewStatus === 'approved' ? (
                        <select
                          value={getCurrentPhase(job)}
                          onChange={(event) => void updateJobPhase(job.id, event.target.value as ProductionPhase)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                        >
                          {PRODUCTION_PHASE_OPTIONS.map((phase) => (
                            <option key={phase.value} value={phase.value}>{phase.label} · {phase.progress}%</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Disponible al aprobar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" disabled={!plan || plan.reviewStatus !== 'approved'} onClick={() => openAdvanceModal(job)}>
                        {advanceRequest ? 'Ver solicitud' : 'Solicitar'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!laborJob} onOpenChange={(open) => { if (!open) setEditingLaborJobId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Formulario de mano de obra</DialogTitle>
            <DialogDescription>
              Selecciona los ítems que aplican para este ambiente. El total quedará en revisión por administración.
            </DialogDescription>
          </DialogHeader>
          {laborJob ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="font-medium">{getLeadDescription(laborJob)}</p>
                <p className="text-xs text-muted-foreground">Trabajo {laborJob.id.slice(0, 8)}</p>
              </div>
              <div className="space-y-2">
                {availableLaborItems.length === 0 ? (
                  <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No hay actividades de mano de obra configuradas. Pide al admin, gerente o arquitecta que las cree en Solicitud de Pago Contratistas.
                  </Card>
                ) : null}
                {availableLaborItems.map((item) => (
                  <label key={item.itemKey} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLaborItems.includes(item.itemKey)}
                        onChange={(event) => {
                          setSelectedLaborItems((current) => event.target.checked
                            ? [...current, item.itemKey]
                            : current.filter((key) => key !== item.itemKey));
                        }}
                      />
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-semibold">{formatCurrency(item.defaultAmount)}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm">
                <span className="font-medium text-sky-800">Total mano de obra</span>
                <span className="font-mono font-semibold text-sky-800">{formatCurrency(laborTotal)}</span>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setEditingLaborJobId(null)}>Cerrar</Button>
                <Button disabled={savingLabor || selectedLaborItems.length === 0} onClick={() => void saveLaborPlan(laborJob)}>
                  {savingLabor ? 'Enviando...' : 'Enviar a revisión'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!advanceJob} onOpenChange={(open) => { if (!open) setAdvanceJobId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitud de anticipo</DialogTitle>
            <DialogDescription>
              Revisa el estado de tu solicitud o envía una nueva para este trabajo aprobado.
            </DialogDescription>
          </DialogHeader>
          {advanceJob && advancePlan ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Total aprobado</p>
                  <p className="font-mono font-semibold">{formatCurrency(advancePlan.totalAmount)}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Estado solicitud</p>
                  <p className="font-medium">
                    {activeAdvanceRequest?.status === 'approved' ? 'Aprobado' :
                      activeAdvanceRequest?.status === 'rejected' ? 'Rechazado' :
                      activeAdvanceRequest?.status === 'paid' ? 'Pagado' :
                      activeAdvanceRequest ? 'En revisión' : 'Sin solicitud'}
                  </p>
                </div>
              </div>

              {activeAdvanceRequest?.reviewNotes ? (
                <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {activeAdvanceRequest.reviewNotes}
                </Card>
              ) : null}

              <div className="space-y-1.5">
                <Label>Monto solicitado</Label>
                <Input type="number" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nota para administración</Label>
                <Textarea value={advanceNotes} onChange={(event) => setAdvanceNotes(event.target.value)} placeholder="Detalle opcional de la solicitud..." />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setAdvanceJobId(null)}>Cerrar</Button>
                <Button disabled={savingAdvance || Number(advanceAmount) <= 0} onClick={() => void saveAdvanceRequest(advanceJob)}>
                  {savingAdvance ? 'Enviando...' : activeAdvanceRequest ? 'Reenviar solicitud' : 'Enviar solicitud'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
