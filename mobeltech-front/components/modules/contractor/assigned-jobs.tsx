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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  ArrowLeft,
  BellRing,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  PackageCheck,
  Phone,
  RefreshCw,
  Upload,
  User,
  WalletCards,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
      completedDate?: string | Date | null;
    }>;
  }>;
  schedulePhases?: Array<{
    id?: string;
    type: 'tentative' | 'actual' | 'real';
    phase: ProductionPhase;
    startDate: string;
    endDate: string;
    completed?: string | null;
    cuttingMachine?: string | null;
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
  estimatedSchedule?: LaborScheduleRow[];
  paidAmount: number;
  remainingAmount: number;
  lines?: Array<{
    id: string;
    phaseKey: string;
    phaseLabel: string;
    unit?: string;
    width?: number;
    heightQuantity?: number;
    enableHeight?: boolean;
    enableWidthQuantity?: boolean;
    measuredTotal?: number;
    unitPrice?: number;
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
  uploadedBy?: string | null;
  createdAt?: string | Date | null;
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

type MaterialRequestRecord = {
  id: string;
  contractorId: string;
  productionOrderId?: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejectionComments?: string | null;
  requestDate?: string | Date;
};

type EmbeddedFlow = {
  kind: 'schedule' | 'materials';
  job: ProductionOrderRecord;
  title: string;
  description: string;
  url: string;
};

type LaborCatalogItem = {
  id: string;
  itemKey: string;
  label: string;
  unit: string;
  defaultAmount: number;
  referencePrice?: number;
  active: boolean;
  sortOrder: number;
  enableHeight?: boolean;
  enableWidthQuantity?: boolean;
  defaultHeight?: number;
  defaultWidthQuantity?: number;
  useDefaultHeight?: boolean;
  useDefaultWidthQuantity?: boolean;
};

type LaborDraftLine = {
  id?: string;
  itemKey: string;
  label: string;
  unit: string;
  width: string;
  heightQuantity: string;
  unitPrice: number;
  enableHeight: boolean;
  enableWidthQuantity: boolean;
  defaultHeight?: number;
  defaultWidthQuantity?: number;
  useDefaultHeight?: boolean;
  useDefaultWidthQuantity?: boolean;
};

type LaborScheduleRow = {
  phaseKey: ProductionPhase;
  phaseLabel: string;
  startDate: string;
  endDate: string;
};

type LaborDraftSnapshot = {
  lines: LaborDraftLine[];
  schedule: LaborScheduleRow[];
  savedAt: string;
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

function formatMeasure(amount?: number) {
  return Number(amount || 0).toLocaleString('es-BO', { maximumFractionDigits: 3 });
}

function measureInputValue(amount?: number) {
  const numeric = Number(amount || 0);
  return numeric > 0 ? String(numeric) : '';
}

const tableItemHeaderClass = 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100';
const tableItemCellClass = 'bg-amber-50/80 text-zinc-900 dark:bg-amber-500/10 dark:text-zinc-100';
const tableMeasureHeaderClass = 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100';
const tableMeasureCellClass = 'bg-emerald-50 text-zinc-900 dark:bg-emerald-500/10 dark:text-zinc-100';
const tableMoneyHeaderClass = 'bg-sky-100 text-sky-950 dark:bg-sky-500/20 dark:text-sky-100';
const tableMoneyCellClass = 'bg-sky-50 text-sky-950 dark:bg-sky-500/10 dark:text-sky-100';

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
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedJobId = searchParams.get('jobId');
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
  const [materialRequests, setMaterialRequests] = useState<MaterialRequestRecord[]>([]);
  const [laborItems, setLaborItems] = useState<LaborCatalogItem[]>([]);
  const [contractor, setContractor] = useState<ContractorRecord | null>(null);
  const [editingLaborJobId, setEditingLaborJobId] = useState<string | null>(null);
  const [laborSchedulePromptJobId, setLaborSchedulePromptJobId] = useState<string | null>(null);
  const [selectedLaborLines, setSelectedLaborLines] = useState<LaborDraftLine[]>([]);
  const [confirmedLaborLineKeys, setConfirmedLaborLineKeys] = useState<Set<string>>(() => new Set());
  const [laborScheduleRows, setLaborScheduleRows] = useState<LaborScheduleRow[]>([]);
  const [laborDraftSavedAt, setLaborDraftSavedAt] = useState<string | null>(null);
  const [laborSearch, setLaborSearch] = useState('');
  const [savingLabor, setSavingLabor] = useState(false);
  const [uploadingFinalJobId, setUploadingFinalJobId] = useState<string | null>(null);
  const [updatingRealPhaseKey, setUpdatingRealPhaseKey] = useState<string | null>(null);
  const [advanceJobId, setAdvanceJobId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [embeddedFlow, setEmbeddedFlow] = useState<EmbeddedFlow | null>(null);

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
        setMaterialRequests([]);
        setFurnitureFiles([]);
        setLoading(false);
        return;
      }

      const [jobsResponse, notificationsResponse, clientsResponse, quotationsResponse, plansResponse, furnitureFilesResponse, laborItemsResponse, advanceRequestsResponse, materialRequestsResponse] = await Promise.all([
        fetch(`${apiBase}/api/production-orders?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/notifications?recipientUserId=${encodeURIComponent(user.id)}&unreadOnly=true`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/clients`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/quotations`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/plans?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/furniture-files?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/labor-items`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/advance-requests?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/material-requests?contractorId=${encodeURIComponent(activeContractor.id)}`, { cache: 'no-store' }),
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
      setMaterialRequests(materialRequestsResponse.ok ? await materialRequestsResponse.json() : []);
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

  useEffect(() => {
    if (!editingLaborJobId) return;
    const timeout = window.setTimeout(() => {
      persistLaborDraft(editingLaborJobId, selectedLaborLines, laborScheduleRows);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [editingLaborJobId, selectedLaborLines, laborScheduleRows, user?.id, contractor?.id]);

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

  function openJobDetail(jobId: string) {
    router.push(`/assigned-jobs?jobId=${encodeURIComponent(jobId)}`);
  }

  function closeJobDetail() {
    router.push('/assigned-jobs');
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
    const environments = quotation?.environmentProjects ?? [];
    const environmentByProject = environments.find((environment) => (
      Boolean(job.projectId) && environment.projectId === job.projectId
    ));
    if (environmentByProject) return environmentByProject;

    const contractorEnvironments = environments.filter((environment) => (
      environment.assignedContractorId === job.assignedContractorId
    ));
    return contractorEnvironments.length === 1 ? contractorEnvironments[0] : null;
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
    return getInitialSketchupFiles(job)[0];
  }

  function sortFurnitureFilesByVersion(rows: FurnitureFileRecord[]) {
    return [...rows].sort((left, right) => {
      if (right.version !== left.version) return right.version - left.version;
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }

  function getInitialSketchupFiles(job: ProductionOrderRecord) {
    const environment = getEnvironment(job);
    if (environment?.id) {
      return sortFurnitureFilesByVersion(furnitureFiles.filter((file) => (
        file.fileKind !== 'contractor_final' &&
        file.projectEnvironmentId === environment.id
      )));
    }

    return sortFurnitureFilesByVersion(furnitureFiles.filter((file) => (
      file.fileKind !== 'contractor_final' &&
      file.quotationId === job.quotationId &&
      file.assignedContractorId === job.assignedContractorId
    )));
  }

  function getFinalSketchupFile(job: ProductionOrderRecord) {
    const environment = getEnvironment(job);
    if (environment?.id) {
      return sortFurnitureFilesByVersion(furnitureFiles.filter((file) => (
        file.fileKind === 'contractor_final' &&
        file.projectEnvironmentId === environment.id
      )))[0];
    }

    return sortFurnitureFilesByVersion(furnitureFiles.filter((file) => (
      file.fileKind === 'contractor_final' &&
      file.quotationId === job.quotationId &&
      file.assignedContractorId === job.assignedContractorId
    )))[0];
  }

  function hasNewInitialSketchupVersion(job: ProductionOrderRecord) {
    const versions = getInitialSketchupFiles(job);
    return versions.length > 1 || Number(versions[0]?.version ?? 1) > 1;
  }

  function getPaymentPlan(job: ProductionOrderRecord) {
    return paymentPlans.find((entry) => entry.productionOrderId === job.id);
  }

  function getAdvanceRequest(job: ProductionOrderRecord) {
    const plan = getPaymentPlan(job);
    if (!plan) return undefined;
    return advanceRequests.find((request) => request.planId === plan.id);
  }

  function getMaterialRequest(job: ProductionOrderRecord) {
    return materialRequests.find((request) => request.productionOrderId === job.id && request.status !== 'rejected');
  }

  function getRejectedMaterialRequest(job: ProductionOrderRecord) {
    return materialRequests.find((request) => request.productionOrderId === job.id && request.status === 'rejected');
  }

  function hasMaterialRequestReady(job: ProductionOrderRecord) {
    return Boolean(getMaterialRequest(job));
  }

  function goToMaterialRequest(job: ProductionOrderRecord) {
    const client = getClient(job);
    setEmbeddedFlow({
      kind: 'materials',
      job,
      title: 'Solicitud de material',
      description: `${getLeadDescription(job)}${client?.name ? ` · Cliente: ${client.name}` : ''}`,
      url: `/contractor-requests?jobId=${encodeURIComponent(job.id)}&fromAssignedJob=1&embedded=1`,
    });
  }

  function goToSchedule(job: ProductionOrderRecord, options?: { fromLaborDraft?: boolean }) {
    const client = getClient(job);
    const queryKey = options?.fromLaborDraft ? 'laborJobId' : 'jobId';
    setEmbeddedFlow({
      kind: 'schedule',
      job,
      title: options?.fromLaborDraft ? 'Cronograma tentativo' : 'Cronograma del trabajo',
      description: `${getLeadDescription(job)}${client?.name ? ` · Cliente: ${client.name}` : ''}`,
      url: `/schedule?${queryKey}=${encodeURIComponent(job.id)}&embedded=1`,
    });
  }

  function hasActualScheduleReady(job: ProductionOrderRecord) {
    const actualPhases = job.schedulePhases?.filter((phase) => phase.type === 'actual') ?? [];
    return PRODUCTION_PHASE_OPTIONS.every((phase) => (
      actualPhases.some((entry) => entry.phase === phase.value && Boolean(entry.startDate) && Boolean(entry.endDate))
    ));
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

  function parseMeasure(value: string | number | undefined) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function createEmptyLaborSchedule(): LaborScheduleRow[] {
    return PRODUCTION_PHASE_OPTIONS.map((phase) => ({
      phaseKey: phase.value,
      phaseLabel: phase.label,
      startDate: '',
      endDate: '',
    }));
  }

  function normalizeScheduleRows(rows?: LaborScheduleRow[] | null) {
    const byKey = new Map((rows ?? []).map((row) => [row.phaseKey, row]));
    return PRODUCTION_PHASE_OPTIONS.map((phase) => {
      const current = byKey.get(phase.value);
      return {
        phaseKey: phase.value,
        phaseLabel: phase.label,
        startDate: current?.startDate ?? '',
        endDate: current?.endDate ?? '',
      };
    });
  }

  function getLaborDraftKey(jobId: string) {
    return `mobeltech:labor-payment-draft:${user?.id ?? 'guest'}:${contractor?.id ?? 'contractor'}:${jobId}`;
  }

  function readLaborDraft(jobId: string) {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(getLaborDraftKey(jobId));
      if (!raw) return null;
      const draft = JSON.parse(raw) as LaborDraftSnapshot;
      if (!Array.isArray(draft.lines) || !Array.isArray(draft.schedule)) return null;
      return draft;
    } catch {
      return null;
    }
  }

  function persistLaborDraft(jobId: string, lines: LaborDraftLine[], schedule: LaborScheduleRow[]) {
    if (typeof window === 'undefined') return null;
    const savedAt = new Date().toISOString();
    const draft: LaborDraftSnapshot = { lines, schedule, savedAt };
    window.localStorage.setItem(getLaborDraftKey(jobId), JSON.stringify(draft));
    setLaborDraftSavedAt(savedAt);
    return draft;
  }

  function clearLaborDraft(jobId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(getLaborDraftKey(jobId));
    setLaborDraftSavedAt(null);
  }

  function getDraftLineMeasuredTotal(line: LaborDraftLine) {
    const height = line.enableHeight ? parseMeasure(line.width) : 1;
    const widthQuantity = line.enableWidthQuantity ? parseMeasure(line.heightQuantity) : 1;
    const calculated = height * widthQuantity;
    return calculated > 0 ? calculated : 0;
  }

  function getDraftLinePartial(line: LaborDraftLine) {
    return getDraftLineMeasuredTotal(line) * Number(line.unitPrice || 0);
  }

  function addLaborLine(item: LaborCatalogItem) {
    setSelectedLaborLines((current) => {
      if (current.some((line) => line.itemKey === item.itemKey)) return current;
      return [
        ...current,
        {
          itemKey: item.itemKey,
          label: item.label,
          unit: item.unit || 'UND',
          width: item.useDefaultHeight ? measureInputValue(item.defaultHeight) : '',
          heightQuantity: item.useDefaultWidthQuantity ? measureInputValue(item.defaultWidthQuantity) : '',
          unitPrice: item.referencePrice ?? item.defaultAmount,
          enableHeight: item.enableHeight ?? true,
          enableWidthQuantity: item.enableWidthQuantity ?? true,
          defaultHeight: item.defaultHeight ?? 0,
          defaultWidthQuantity: item.defaultWidthQuantity ?? 0,
          useDefaultHeight: item.useDefaultHeight ?? false,
          useDefaultWidthQuantity: item.useDefaultWidthQuantity ?? false,
        },
      ];
    });
    setLaborSearch('');
  }

  function confirmLaborLine(itemKey: string) {
    setConfirmedLaborLineKeys((current) => {
      const next = new Set(current);
      next.add(itemKey);
      return next;
    });
  }

  function updateLaborLine(index: number, field: 'width' | 'heightQuantity', value: string) {
    setSelectedLaborLines((current) =>
      current.map((line, currentIndex) => {
        if (currentIndex !== index) return line;
        if (field === 'width' && line.useDefaultHeight) return line;
        if (field === 'heightQuantity' && line.useDefaultWidthQuantity) return line;
        return { ...line, [field]: value };
      }),
    );
    setConfirmedLaborLineKeys((current) => {
      const itemKey = selectedLaborLines[index]?.itemKey;
      if (!itemKey || !current.has(itemKey)) return current;
      const next = new Set(current);
      next.delete(itemKey);
      return next;
    });
  }

  function removeLaborLine(index: number) {
    setSelectedLaborLines((current) => {
      const removedLine = current[index];
      if (removedLine) {
        setConfirmedLaborLineKeys((confirmed) => {
          if (!confirmed.has(removedLine.itemKey)) return confirmed;
          const next = new Set(confirmed);
          next.delete(removedLine.itemKey);
          return next;
        });
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function openLaborForm(job: ProductionOrderRecord) {
    const plan = getPaymentPlan(job);
    const draft = readLaborDraft(job.id);
    const draftLines = draft?.lines?.length ? draft.lines : null;
    const catalogAwareDraftLines = draftLines?.map((line) => {
      const catalogItem = laborItems.find((item) => item.itemKey === line.itemKey);
      const useDefaultHeight = catalogItem?.useDefaultHeight ?? line.useDefaultHeight ?? false;
      const useDefaultWidthQuantity = catalogItem?.useDefaultWidthQuantity ?? line.useDefaultWidthQuantity ?? false;

      return {
        ...line,
        label: catalogItem?.label ?? line.label,
        unit: catalogItem?.unit ?? line.unit,
        width: useDefaultHeight ? measureInputValue(catalogItem?.defaultHeight ?? line.defaultHeight) : line.width,
        heightQuantity: useDefaultWidthQuantity ? measureInputValue(catalogItem?.defaultWidthQuantity ?? line.defaultWidthQuantity) : line.heightQuantity,
        unitPrice: catalogItem?.defaultAmount ?? line.unitPrice,
        enableHeight: catalogItem?.enableHeight ?? line.enableHeight,
        enableWidthQuantity: catalogItem?.enableWidthQuantity ?? line.enableWidthQuantity,
        defaultHeight: catalogItem?.defaultHeight ?? line.defaultHeight ?? 0,
        defaultWidthQuantity: catalogItem?.defaultWidthQuantity ?? line.defaultWidthQuantity ?? 0,
        useDefaultHeight,
        useDefaultWidthQuantity,
      };
    });
    setEditingLaborJobId(job.id);
    setLaborSearch('');
    setConfirmedLaborLineKeys(new Set());
    setSelectedLaborLines(
      catalogAwareDraftLines ?? plan?.lines?.map((line) => {
        const catalogItem = laborItems.find((item) => item.itemKey === line.phaseKey);
        const useDefaultHeight = catalogItem?.useDefaultHeight ?? false;
        const useDefaultWidthQuantity = catalogItem?.useDefaultWidthQuantity ?? false;

        return {
          id: line.id,
          itemKey: line.phaseKey,
          label: catalogItem?.label ?? line.phaseLabel,
          unit: catalogItem?.unit ?? line.unit ?? 'UND',
          width: useDefaultHeight ? measureInputValue(catalogItem?.defaultHeight) : (line.width ? String(line.width) : ''),
          heightQuantity: useDefaultWidthQuantity ? measureInputValue(catalogItem?.defaultWidthQuantity) : (line.heightQuantity ? String(line.heightQuantity) : ''),
          unitPrice: catalogItem?.defaultAmount ?? line.unitPrice ?? 0,
          enableHeight: catalogItem?.enableHeight ?? line.enableHeight ?? true,
          enableWidthQuantity: catalogItem?.enableWidthQuantity ?? line.enableWidthQuantity ?? true,
          defaultHeight: catalogItem?.defaultHeight ?? 0,
          defaultWidthQuantity: catalogItem?.defaultWidthQuantity ?? 0,
          useDefaultHeight,
          useDefaultWidthQuantity,
        };
      }) ?? [],
    );
    setLaborScheduleRows(normalizeScheduleRows(draft?.schedule ?? plan?.estimatedSchedule ?? createEmptyLaborSchedule()));
    setLaborDraftSavedAt(draft?.savedAt ?? null);
  }

  async function saveLaborPlan(job: ProductionOrderRecord) {
    if (!apiBase || !contractor || selectedLaborLines.length === 0) return;
    setSavingLabor(true);
    setError(null);
    try {
      const lines = selectedLaborLines.map((line, index) => {
        const measuredTotal = getDraftLineMeasuredTotal(line);
        const plannedAmount = measuredTotal * line.unitPrice;
        return {
          id: line.id,
          phaseKey: line.itemKey,
          phaseLabel: line.label,
          unit: line.unit,
          width: line.enableHeight ? parseMeasure(line.width) : 0,
          heightQuantity: line.enableWidthQuantity ? parseMeasure(line.heightQuantity) : 0,
          enableHeight: line.enableHeight,
          enableWidthQuantity: line.enableWidthQuantity,
          measuredTotal,
          unitPrice: line.unitPrice,
          plannedAmount,
          sortOrder: index,
        };
      });
      const totalAmount = lines.reduce((sum, line) => sum + line.plannedAmount, 0);
      if (totalAmount <= 0) {
        throw new Error('Agrega medidas válidas para calcular la mano de obra.');
      }
      persistLaborDraft(job.id, selectedLaborLines, laborScheduleRows.length ? laborScheduleRows : createEmptyLaborSchedule());
      setEditingLaborJobId(null);
      setLaborSchedulePromptJobId(job.id);
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
      toast({ title: 'Solicitud de anticipo enviada', description: 'Administracion recibira la notificacion para revisarla.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando solicitud de anticipo.');
      toast({
        title: 'Error enviando solicitud',
        description: err instanceof Error ? err.message : 'No se pudo enviar la solicitud de anticipo.',
        variant: 'destructive',
      });
    } finally {
      setSavingAdvance(false);
    }
  }

  function getRealPhase(job: ProductionOrderRecord, phase: ProductionPhase) {
    return job.schedulePhases?.find((entry) => entry.type === 'real' && entry.phase === phase);
  }

  function isPhaseStarted(job: ProductionOrderRecord, phase: ProductionPhase) {
    return Boolean(getRealPhase(job, phase));
  }

  function isPhaseFinished(job: ProductionOrderRecord, phase: ProductionPhase) {
    const realPhase = getRealPhase(job, phase);
    if (realPhase?.completed === 'true') return true;
    if (job.items.length === 0) return false;
    return job.items.every((item) => item.phases?.some((entry) => entry.phase === phase && entry.completed === 'true'));
  }

  function getFinishedRealPhaseCount(job: ProductionOrderRecord) {
    return PRODUCTION_PHASE_OPTIONS.filter((phase) => isPhaseFinished(job, phase.value)).length;
  }

  function getItemFinishedPhaseCount(item: ProductionOrderRecord['items'][number]) {
    return item.phases?.filter((phase) => phase.completed === 'true').length ?? 0;
  }

  function getNextRealPhaseStep(job: ProductionOrderRecord) {
    const nextPhase = PRODUCTION_PHASE_OPTIONS.find((phase) => !isPhaseFinished(job, phase.value));
    if (!nextPhase) return null;
    return {
      phase: nextPhase.value,
      label: nextPhase.label,
      action: isPhaseStarted(job, nextPhase.value) ? 'finish' as const : 'start' as const,
    };
  }

  function todayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function applyRealPhaseUpdate(
    previousJob: ProductionOrderRecord,
    updatedJob: ProductionOrderRecord,
    phase: ProductionPhase,
    action: 'start' | 'finish',
    date: string,
  ): ProductionOrderRecord {
    const existingRealPhase = updatedJob.schedulePhases?.find((entry) => entry.type === 'real' && entry.phase === phase);
    const fallbackStartDate = existingRealPhase?.startDate ?? getRealPhase(previousJob, phase)?.startDate ?? date;
    const nextRealPhase = {
      ...(existingRealPhase ?? {
        id: `local-real-${updatedJob.id}-${phase}`,
        type: 'real' as const,
        phase,
        startDate: fallbackStartDate,
        endDate: fallbackStartDate,
        completed: 'false',
        cuttingMachine: null,
      }),
      startDate: action === 'start' ? date : fallbackStartDate,
      endDate: action === 'finish' ? date : (existingRealPhase?.endDate ?? fallbackStartDate),
      completed: action === 'finish' ? 'true' : (existingRealPhase?.completed ?? 'false'),
    };
    const phaseIndex = PRODUCTION_PHASE_OPTIONS.findIndex((option) => option.value === phase);
    const schedulePhases = [
      ...(updatedJob.schedulePhases ?? []).filter((entry) => {
        if (entry.type !== 'real') return true;
        if (entry.phase === phase) return false;
        const entryIndex = PRODUCTION_PHASE_OPTIONS.findIndex((option) => option.value === entry.phase);
        if (action === 'finish' && entryIndex > phaseIndex && entry.completed !== 'true') return false;
        return true;
      }),
      nextRealPhase,
    ];
    const items = updatedJob.items.map((item) => {
      if (action !== 'finish') return item;
      const otherPhases = item.phases?.filter((entry) => entry.phase !== phase) ?? [];
      return {
        ...item,
        phases: [
          ...otherPhases,
          { phase, completed: 'true', completedDate: date },
        ],
      };
    });

    return { ...updatedJob, schedulePhases, items };
  }

  async function updateJobRealPhase(jobId: string, phase: ProductionPhase, action: 'start' | 'finish') {
    if (!apiBase) return;
    const job = jobs.find((entry) => entry.id === jobId);
    if (job && !hasActualScheduleReady(job)) {
      toast({
        title: 'Cronograma requerido',
        description: 'Antes de iniciar el avance real debes completar el cronograma de este trabajo.',
        variant: 'destructive',
      });
      goToSchedule(job);
      return;
    }
    if (job && !hasMaterialRequestReady(job)) {
      toast({
        title: 'Solicitud de material requerida',
        description: 'Antes de iniciar el avance real debes llenar y enviar la solicitud de material de este trabajo.',
        variant: 'destructive',
      });
      goToMaterialRequest(job);
      return;
    }
    const updateKey = `${jobId}-${phase}-${action}`;
    const progressDate = todayDateString();
    setUpdatingRealPhaseKey(updateKey);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/production-orders/${jobId}/real-progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          action,
          date: progressDate,
          createdBy: user?.id ?? null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiError(data, 'No se pudo actualizar el avance real.'));
      setJobs((current) => current.map((job) => {
        if (job.id !== jobId) return job;
        const updatedJob = data && typeof data === 'object' ? data as ProductionOrderRecord : job;
        return applyRealPhaseUpdate(job, updatedJob, phase, action, progressDate);
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando avance real.');
    } finally {
      setUpdatingRealPhaseKey(null);
    }
  }

  function renderCompactRealProgress(job: ProductionOrderRecord, plan?: ContractorPaymentPlan) {
    if (plan?.reviewStatus !== 'approved') {
      return <span className="text-xs text-muted-foreground">Disponible al aprobar</span>;
    }

    const nextStep = getNextRealPhaseStep(job);
    const finishedCount = getFinishedRealPhaseCount(job);
    const scheduleReady = hasActualScheduleReady(job);
    const materialReady = hasMaterialRequestReady(job);
    const rejectedMaterialRequest = getRejectedMaterialRequest(job);

    return (
      <div className="min-w-[250px] space-y-2">
        <div className="flex items-center gap-1.5">
          {PRODUCTION_PHASE_OPTIONS.map((phase) => {
            const started = isPhaseStarted(job, phase.value);
            const finished = isPhaseFinished(job, phase.value);
            const open = started && !finished && nextStep?.phase === phase.value;
            return (
              <span
                key={phase.value}
                className={`h-2.5 w-8 rounded-full ${
                  finished ? 'bg-emerald-500' : open ? 'bg-emerald-300' : 'bg-muted'
                }`}
                title={`${phase.label}: ${finished ? 'finalizado' : open ? 'en curso' : 'pendiente'}`}
              />
            );
          })}
        </div>
        {!scheduleReady ? (
          <div className="space-y-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-sky-200 px-2 text-xs text-sky-700 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-100 dark:hover:bg-sky-500/10"
              onClick={() => goToSchedule(job)}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Completar cronograma
            </Button>
            <p className="text-xs text-sky-700 dark:text-sky-200">
              Requerido antes de solicitud de material y avance real.
            </p>
          </div>
        ) : !materialReady ? (
          <div className="space-y-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-amber-200 px-2 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-100 dark:hover:bg-amber-500/10"
              onClick={() => goToMaterialRequest(job)}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Llenar solicitud de material
            </Button>
            <p className="text-xs text-amber-700 dark:text-amber-200">
              {rejectedMaterialRequest ? 'Solicitud rechazada: corrígela antes de iniciar avance real.' : 'Requerido antes de iniciar avance real.'}
            </p>
          </div>
        ) : nextStep ? (
          <Button
            type="button"
            size="sm"
            variant={nextStep.action === 'start' ? 'outline' : 'default'}
            className="h-8 gap-1.5 px-2 text-xs"
            disabled={updatingRealPhaseKey === `${job.id}-${nextStep.phase}-${nextStep.action}`}
            onClick={() => void updateJobRealPhase(job.id, nextStep.phase, nextStep.action)}
          >
            {updatingRealPhaseKey === `${job.id}-${nextStep.phase}-${nextStep.action}` ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {nextStep.action === 'start' ? 'Iniciar' : 'Finalizar'} {nextStep.label}
          </Button>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Trabajo finalizado</Badge>
        )}
        <p className="text-xs text-muted-foreground">{finishedCount} de {PRODUCTION_PHASE_OPTIONS.length} fases finalizadas</p>
      </div>
    );
  }

  function renderRealProgressPanel(job: ProductionOrderRecord, plan?: ContractorPaymentPlan) {
    if (plan?.reviewStatus !== 'approved') {
      return (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Avance real</p>
          <p className="mt-2 text-sm text-muted-foreground">
            El avance real se habilita cuando administración aprueba la mano de obra.
          </p>
        </div>
      );
    }

    const nextStep = getNextRealPhaseStep(job);
    const scheduleReady = hasActualScheduleReady(job);
    const materialReady = hasMaterialRequestReady(job);
    const rejectedMaterialRequest = getRejectedMaterialRequest(job);

    return (
      <div className="rounded-xl border border-border p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Avance real</p>
            <p className="text-xs text-muted-foreground">Marca inicio y fin cuando realmente empieza o termina cada fase.</p>
          </div>
          <Badge variant="outline">{getFinishedRealPhaseCount(job)} / {PRODUCTION_PHASE_OPTIONS.length} fases</Badge>
        </div>
        {!scheduleReady ? (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-2">
                <CalendarRange className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Primero debes completar el cronograma.</p>
                  <p className="mt-1 text-xs">
                    Después de guardar el cronograma, el sistema te llevará a la solicitud de material de este trabajo.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-sky-300 bg-white/70 text-sky-900 hover:bg-white dark:bg-background/20 dark:text-sky-100"
                onClick={() => goToSchedule(job)}
              >
                Ir a cronograma
              </Button>
            </div>
          </div>
        ) : !materialReady ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-2">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Primero debes llenar la solicitud de material.</p>
                  <p className="mt-1 text-xs">
                    {rejectedMaterialRequest
                      ? 'Tu solicitud anterior fue rechazada. Corrígela y reenvíala antes de iniciar el avance real por etapas.'
                      : 'El avance real por etapas se habilita después de enviar la solicitud de materiales de este trabajo.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 bg-white/70 text-amber-900 hover:bg-white dark:bg-background/20 dark:text-amber-100"
                onClick={() => goToMaterialRequest(job)}
              >
                Ir a solicitud
              </Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-3">
          {PRODUCTION_PHASE_OPTIONS.map((phase) => {
            const realPhase = getRealPhase(job, phase.value);
            const started = Boolean(realPhase);
            const finished = isPhaseFinished(job, phase.value);
            const isCurrentPhase = nextStep?.phase === phase.value;
            const open = started && !finished && isCurrentPhase;
            const startKey = `${job.id}-${phase.value}-start`;
            const finishKey = `${job.id}-${phase.value}-finish`;

            return (
              <div key={phase.value} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${finished ? 'bg-emerald-500' : open ? 'bg-emerald-300' : 'bg-muted-foreground/30'}`} />
                      <p className="text-sm font-semibold">{phase.label}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {finished ? 'Finalizado' : open ? 'En curso' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Inicio real: {realPhase ? formatDate(realPhase.startDate) : 'Sin marcar'} · Fin real: {finished && realPhase ? formatDate(realPhase.endDate) : 'Sin marcar'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      disabled={!scheduleReady || !materialReady || !isCurrentPhase || started || finished || updatingRealPhaseKey === startKey}
                      onClick={() => void updateJobRealPhase(job.id, phase.value, 'start')}
                    >
                      {updatingRealPhaseKey === startKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarRange className="h-3.5 w-3.5" />}
                      Iniciar hoy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={!scheduleReady || !materialReady || !isCurrentPhase || !started || finished || updatingRealPhaseKey === finishKey}
                      onClick={() => void updateJobRealPhase(job.id, phase.value, 'finish')}
                    >
                      {updatingRealPhaseKey === finishKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Finalizar hoy
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

  async function generateLaborPlanPdf(plan: ContractorPaymentPlan, job: ProductionOrderRecord) {
    if (plan.reviewStatus !== 'approved') return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadLogoDataUrl();
    const title = getLeadDescription(job);

    if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 14, 12, 24, 16);
    doc.setFontSize(16);
    doc.text('MOBELTECH', 42, 18);
    doc.setFontSize(11);
    doc.text('Solicitud de pago de mano de obra aprobada', 42, 26);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 34, 196, 34);

    let y = 44;
    doc.setFontSize(10);
    doc.text(`Trabajo: ${title}`, 14, y, { maxWidth: 178 });
    y += 8;
    doc.text(`Contratista: ${contractor?.name ?? 'Contratista'}`, 14, y);
    y += 6;
    doc.text(`Estado: Aprobada`, 14, y);
    y += 6;
    doc.text(`Total aprobado: ${formatCurrency(plan.totalAmount)}`, 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text('Detalle de actividades', 14, y);
    y += 7;
    doc.setFontSize(8);
    doc.text('Item', 14, y);
    doc.text('Total', 112, y, { align: 'right' });
    doc.text('P.Unit.', 144, y, { align: 'right' });
    doc.text('Parcial', 188, y, { align: 'right' });
    y += 5;
    doc.line(14, y, 196, y);
    y += 5;

    (plan.lines ?? []).forEach((line, index) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${index + 1}. ${line.phaseLabel}`, 14, y, { maxWidth: 86 });
      doc.text(Number(line.measuredTotal ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 3 }), 112, y, { align: 'right' });
      doc.text(formatCurrency(line.unitPrice ?? 0), 144, y, { align: 'right' });
      doc.text(formatCurrency(line.plannedAmount), 188, y, { align: 'right' });
      y += 7;
    });

    y += 5;
    doc.setFontSize(11);
    doc.text('Cronograma estimado', 14, y);
    y += 7;
    doc.setFontSize(9);
    (plan.estimatedSchedule ?? []).forEach((phase) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${phase.phaseLabel}: ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`, 16, y);
      y += 6;
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, 14, 286);
    doc.save(`mano_obra_aprobada_${job.id.slice(0, 8)}.pdf`);
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
  const laborSchedulePromptJob = jobs.find((job) => job.id === laborSchedulePromptJobId) ?? null;
  const advanceJob = jobs.find((job) => job.id === advanceJobId) ?? null;
  const advancePlan = advanceJob ? getPaymentPlan(advanceJob) : undefined;
  const activeAdvanceRequest = advanceJob ? getAdvanceRequest(advanceJob) : undefined;
  const canSubmitAdvanceRequest = !activeAdvanceRequest || activeAdvanceRequest.status === 'rejected';
  const laborQuery = laborSearch.trim().toLowerCase();
  const availableLaborItems = laborItems.filter((item) => {
    const alreadyAdded = selectedLaborLines.some((line) => line.itemKey === item.itemKey);
    const matchesSearch = !laborQuery || [item.label, item.unit].join(' ').toLowerCase().includes(laborQuery);
    return !alreadyAdded && matchesSearch;
  });
  const laborTotal = selectedLaborLines.reduce((sum, line) => sum + getDraftLinePartial(line), 0);
  const canSaveLaborDraft = selectedLaborLines.length > 0 && laborTotal > 0;
  const selectedJob = selectedJobId ? jobs.find((job) => job.id === selectedJobId) ?? null : null;
  const selectedJobClient = selectedJob ? getClient(selectedJob) : null;
  const selectedJobEnvironment = selectedJob ? getEnvironment(selectedJob) : null;
  const selectedJobPlan = selectedJob ? getPaymentPlan(selectedJob) : undefined;
  const selectedJobAdvanceRequest = selectedJob ? getAdvanceRequest(selectedJob) : undefined;
  const selectedJobInitialSketchup = selectedJob ? getInitialSketchupFile(selectedJob) : undefined;
  const selectedJobFinalSketchup = selectedJob ? getFinalSketchupFile(selectedJob) : undefined;
  const selectedJobFinishedPhaseCount = selectedJob ? getFinishedRealPhaseCount(selectedJob) : 0;

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

      {selectedJobId ? (
        selectedJob ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" size="sm" className="gap-2 self-start" onClick={closeJobDetail}>
                <ArrowLeft className="h-4 w-4" />
                Volver a trabajos
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void generateWorkOrderPdf(selectedJob)}>
                  <Download className="h-4 w-4" />
                  Orden PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadAssignedData({ silent: true })}>
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusClass(selectedJob.status)}>{statusLabel(selectedJob.status)}</Badge>
                      <Badge className={laborStatusClass(selectedJobPlan)}>{laborStatusLabel(selectedJobPlan)}</Badge>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">
                      {getLeadDescription(selectedJob)}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Trabajo #{selectedJob.id.slice(0, 8)}
                      {selectedJobEnvironment?.ambience ? ` · ${selectedJobEnvironment.ambience}` : ''}
                    </p>
                  </div>
                  <div className="min-w-[220px] rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Avance real</span>
                      <span className="font-mono font-semibold">{selectedJobFinishedPhaseCount}/{PRODUCTION_PHASE_OPTIONS.length}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(selectedJobFinishedPhaseCount / PRODUCTION_PHASE_OPTIONS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile icon={<User className="h-4 w-4" />} label="Cliente" value={selectedJobClient?.name ?? 'N/A'} detail={selectedJobClient?.phone ?? selectedJobClient?.email ?? undefined} />
                    <InfoTile icon={<CalendarRange className="h-4 w-4" />} label="Inicio / entrega" value={`${formatDate(selectedJob.startDate)} - ${formatDate(selectedJob.estimatedDeliveryDate)}`} detail={selectedJob.actualDeliveryDate ? `Entregado: ${formatDate(selectedJob.actualDeliveryDate)}` : undefined} />
                    <InfoTile icon={<WalletCards className="h-4 w-4" />} label="Mano de obra" value={selectedJobPlan ? formatCurrency(selectedJobPlan.totalAmount) : 'Pendiente'} detail={selectedJobPlan?.reviewNotes ?? undefined} />
                    <InfoTile icon={<Phone className="h-4 w-4" />} label="Contacto / dirección" value={selectedJobClient?.address ?? selectedJobClient?.phone ?? 'Sin datos'} />
                  </div>

                  <div className="rounded-xl border border-border">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Tareas del trabajo</p>
                    </div>
                    <div className="divide-y divide-border">
                      {(selectedJob.items.length > 0 ? selectedJob.items : [{ id: 'empty', description: selectedJobEnvironment?.description || 'Trabajo sin tareas registradas', quantity: 1 }]).map((item) => (
                        <div key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                              {getItemFinishedPhaseCount(item as ProductionOrderRecord['items'][number])}/{PRODUCTION_PHASE_OPTIONS.length} fases reales
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedJobEnvironment?.description ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Detalle del ambiente</p>
                      </div>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedJobEnvironment.description}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Archivos SketchUp</p>
                    </div>
                    <div className="space-y-3">
                      <FileActionRow
                        label="Inicial"
                        fileName={selectedJobInitialSketchup?.fileName ?? selectedJobEnvironment?.sketchupFileName ?? 'Sin archivo inicial'}
                        disabled={!selectedJobInitialSketchup}
                        onDownload={() => selectedJobInitialSketchup ? void downloadSketchupFile(selectedJobInitialSketchup) : undefined}
                      />
                      <FileActionRow
                        label="Final"
                        fileName={selectedJobFinalSketchup?.fileName ?? 'Sin archivo final'}
                        disabled={!selectedJobFinalSketchup}
                        onDownload={() => selectedJobFinalSketchup ? void downloadSketchupFile(selectedJobFinalSketchup) : undefined}
                      />
                      <Label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                        {uploadingFinalJobId === selectedJob.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {selectedJobFinalSketchup ? 'Reemplazar final' : 'Subir SketchUp final'}
                        <Input
                          type="file"
                          accept=".skp,.skb,application/octet-stream"
                          disabled={uploadingFinalJobId === selectedJob.id}
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void uploadFinalSketchup(selectedJob, file);
                            event.target.value = '';
                          }}
                        />
                      </Label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold">Acciones</p>
                    <div className="mt-3 grid gap-2">
                      <Button variant="outline" className="justify-start gap-2" onClick={() => openLaborForm(selectedJob)}>
                        <WalletCards className="h-4 w-4" />
                        {selectedJobPlan ? 'Editar mano de obra' : 'Calcular mano de obra'}
                      </Button>
                      <Button variant="outline" className="justify-start gap-2" disabled={!selectedJobPlan || selectedJobPlan.reviewStatus !== 'approved'} onClick={() => openAdvanceModal(selectedJob)}>
                        <WalletCards className="h-4 w-4" />
                        {selectedJobAdvanceRequest ? 'Ver solicitud de anticipo' : 'Solicitar anticipo'}
                      </Button>
                      <Button variant="outline" className="justify-start gap-2" disabled={!selectedJobPlan || selectedJobPlan.reviewStatus !== 'approved'} onClick={() => selectedJobPlan ? void generateLaborPlanPdf(selectedJobPlan, selectedJob) : undefined}>
                        <Download className="h-4 w-4" />
                        Descargar mano de obra PDF
                      </Button>
                      <Button variant="outline" className="justify-start gap-2" onClick={() => goToSchedule(selectedJob)}>
                        <CalendarRange className="h-4 w-4" />
                        Llenar cronograma tentativo
                      </Button>
                      <Button variant="outline" className="justify-start gap-2" onClick={() => goToMaterialRequest(selectedJob)}>
                        <PackageCheck className="h-4 w-4" />
                        Solicitud de material
                      </Button>
                    </div>
                  </div>

                  {renderRealProgressPanel(selectedJob, selectedJobPlan)}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold">Trabajo no encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  La notificación apunta a un trabajo que no está disponible para este contratista o todavía se está sincronizando.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeJobDetail}>Volver</Button>
                <Button onClick={() => void loadAssignedData({ silent: true })}>Actualizar</Button>
              </div>
            </div>
          </Card>
        )
      ) : (
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avance real</th>
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
                const hasNewSketchupVersion = hasNewInitialSketchupVersion(job);
                const finalSketchupFile = getFinalSketchupFile(job);
                const environment = getEnvironment(job);
                const plan = getPaymentPlan(job);
                const advanceRequest = getAdvanceRequest(job);
                return (
                  <tr
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button,a,input,label,select,textarea')) return;
                      openJobDetail(job.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button,a,input,label,select,textarea')) return;
                      event.preventDefault();
                      openJobDetail(job.id);
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-muted-foreground">{job.id.slice(0, 8)}</p>
                      <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => openJobDetail(job.id)}>
                        Ver detalle
                      </Button>
                      <div className={`mt-2 rounded-lg border p-2 ${hasNewSketchupVersion ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100' : 'border-transparent bg-transparent'}`}>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Sketch UP inicial</p>
                          {hasNewSketchupVersion ? <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/25 dark:text-amber-100">Nueva versión</Badge> : null}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!initialSketchupFile}
                          onClick={() => initialSketchupFile ? void downloadSketchupFile(initialSketchupFile) : undefined}
                          className="mt-1 max-w-[210px] gap-2 bg-background/80"
                        >
                          <Download className="h-4 w-4 shrink-0" />
                          <span className="truncate">{initialSketchupFile?.fileName ?? environment?.sketchupFileName ?? 'Sin archivo .skp'}</span>
                        </Button>
                        {hasNewSketchupVersion && initialSketchupFile ? (
                          <p className="mt-1 text-xs font-medium">Recibiste v{initialSketchupFile.version} de {initialSketchupFile.uploadedBy ?? 'administración'}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate font-medium">{description}</p>
                      <p className="text-xs text-muted-foreground">
                        {environment?.description || `${job.items.length} tareas · ${getFinishedRealPhaseCount(job)}/${PRODUCTION_PHASE_OPTIONS.length} fases reales`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{client?.name ?? 'N/A'}</p>
                      <p className="max-w-[180px] truncate text-xs text-muted-foreground">{client?.address || client?.phone || 'Sin direccion'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openLaborForm(job)}>
                          <WalletCards className="h-4 w-4" />
                          {plan ? formatCurrency(plan.totalAmount) : 'Calcular mano de obra'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" disabled={!plan || plan.reviewStatus !== 'approved'} onClick={() => plan ? void generateLaborPlanPdf(plan, job) : undefined}>
                          <Download className="h-3.5 w-3.5" />
                          PDF aprobado
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatDate(job.startDate)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(job.estimatedDeliveryDate)}</p>
                      <Button size="sm" variant="ghost" className="mt-1 h-7 gap-1 px-2 text-xs" onClick={() => goToSchedule(job)}>
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
                      {renderCompactRealProgress(job, plan)}
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
      )}

      <Dialog open={!!laborJob} onOpenChange={(open) => { if (!open) { setEditingLaborJobId(null); setSelectedLaborLines([]); setConfirmedLaborLineKeys(new Set()); setLaborScheduleRows([]); setLaborDraftSavedAt(null); setLaborSearch(''); } }}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-none xl:w-[min(1240px,calc(100vw-3rem))]">
          {laborJob ? (
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-border/70 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <DialogTitle>Formulario de mano de obra</DialogTitle>
                    <DialogDescription>
                      Busca actividades, agrégalas y completa las medidas. El total quedará en revisión por administración.
                    </DialogDescription>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    {savingLabor ? 'Enviando solicitud...' : laborDraftSavedAt ? `Guardado ${new Date(laborDraftSavedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}` : 'Autosave listo'}
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="font-medium">{getLeadDescription(laborJob)}</p>
                  <p className="text-xs text-muted-foreground">Trabajo {laborJob.id.slice(0, 8)}</p>
                </div>
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="space-y-1.5">
                      <Label>Buscador</Label>
                      <Input value={laborSearch} onChange={(event) => setLaborSearch(event.target.value)} placeholder="Buscar actividad de mano de obra..." />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={() => setLaborSearch('')}>Limpiar</Button>
                    </div>
                  </div>

                  {laborItems.length === 0 ? (
                    <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      No hay actividades de mano de obra configuradas. Pide al admin, gerente o arquitecta que las cree en Solicitud mano de obra.
                    </Card>
                  ) : null}

                  {availableLaborItems.length > 0 ? (
                    <div className="max-h-36 overflow-auto rounded-md border border-border/70">
                      {availableLaborItems.slice(0, 8).map((item) => (
                        <div
                          key={item.itemKey}
                          role="button"
                          tabIndex={0}
                          className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/60 bg-emerald-50/60 px-3 py-2 text-zinc-900 transition hover:bg-emerald-100/70 focus-visible:bg-emerald-100/70 focus-visible:outline-none last:border-b-0 dark:bg-emerald-500/10 dark:text-zinc-100 dark:hover:bg-emerald-500/15 dark:focus-visible:bg-emerald-500/15"
                          onClick={() => addLaborLine(item)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            addLaborLine(item);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.unit || 'UND'} · {formatCurrency(item.referencePrice ?? item.defaultAmount)}
                              {' · '}
                              {[
                                item.enableHeight ?? true ? `Alto${item.useDefaultHeight ? ` fijo ${formatMeasure(item.defaultHeight)}` : ''}` : null,
                                item.enableWidthQuantity ?? true ? `Ancho/Cantidad${item.useDefaultWidthQuantity ? ` fijo ${formatMeasure(item.defaultWidthQuantity)}` : ''}` : null,
                              ].filter(Boolean).join(' + ') || 'Sin medidas'}
                            </p>
                          </div>
                          <Button type="button" size="sm" className="shrink-0" onClick={(event) => { event.stopPropagation(); addLaborLine(item); }}>Agregar</Button>
                        </div>
                      ))}
                    </div>
                  ) : laborItems.length > 0 ? (
                    <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
                      No hay actividades disponibles para ese filtro.
                    </p>
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-md border border-border/70">
                  <table className="w-full min-w-[1180px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className="w-12 px-2 py-2 text-center font-semibold text-muted-foreground">No</th>
                        <th className={`w-[34%] px-3 py-2 text-left font-semibold ${tableItemHeaderClass}`}>ITEM</th>
                        <th className={`w-[8%] px-3 py-2 text-center font-semibold ${tableItemHeaderClass}`}>UNIDAD</th>
                        <th className={`w-[9%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>Alto</th>
                        <th className={`w-[11%] px-3 py-2 text-right font-semibold ${tableMeasureHeaderClass}`}>Ancho/Cantidad</th>
                        <th className={`w-[11%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>TOTAL</th>
                        <th className={`w-[13%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>P.UNITARIO</th>
                        <th className={`w-[13%] px-3 py-2 text-right font-semibold ${tableMoneyHeaderClass}`}>P.PARCIAL</th>
                        <th className="w-[10%] px-3 py-2 text-right font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLaborLines.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Agrega actividades desde el buscador.</td>
                        </tr>
                      ) : selectedLaborLines.map((line, index) => {
                        const isLineConfirmed = confirmedLaborLineKeys.has(line.itemKey);
                        return (
                        <tr key={line.itemKey} className={`border-b border-border/60 transition-colors last:border-b-0 ${isLineConfirmed ? 'bg-emerald-500/5' : ''}`}>
                          <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                          <td className={`px-3 py-2 font-medium ${tableItemCellClass}`}><span className="block whitespace-normal leading-snug">{line.label}</span></td>
                          <td className={`px-3 py-2 text-center font-mono text-xs font-semibold ${tableItemCellClass}`}>{line.unit}</td>
                          <td className={`px-3 py-2 ${tableMeasureCellClass}`}>
                            {line.enableHeight ? (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={line.width}
                                  disabled={line.useDefaultHeight}
                                  onChange={(event) => updateLaborLine(index, 'width', event.target.value)}
                                  className="h-8 text-right font-mono disabled:cursor-not-allowed disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-100"
                                  placeholder="0"
                                />
                                {line.useDefaultHeight ? (
                                  <span className="block text-right text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-200">
                                    Fijo
                                  </span>
                                ) : null}
                              </div>
                            ) : <span className="block text-center text-xs text-muted-foreground">No aplica</span>}
                          </td>
                          <td className={`px-3 py-2 ${tableMeasureCellClass}`}>
                            {line.enableWidthQuantity ? (
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={line.heightQuantity}
                                  disabled={line.useDefaultWidthQuantity}
                                  onChange={(event) => updateLaborLine(index, 'heightQuantity', event.target.value)}
                                  className="h-8 text-right font-mono disabled:cursor-not-allowed disabled:opacity-80 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-100"
                                  placeholder="0"
                                />
                                {line.useDefaultWidthQuantity ? (
                                  <span className="block text-right text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-200">
                                    Fijo
                                  </span>
                                ) : null}
                              </div>
                            ) : <span className="block text-center text-xs text-muted-foreground">No aplica</span>}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${tableMoneyCellClass}`}>
                            {getDraftLineMeasuredTotal(line).toLocaleString('es-BO', { maximumFractionDigits: 3 })}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono ${tableMoneyCellClass}`}>{formatCurrency(line.unitPrice)}</td>
                          <td className={`px-4 py-2 text-right font-mono font-semibold ${tableMoneyCellClass}`}>{formatCurrency(getDraftLinePartial(line))}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant={isLineConfirmed ? 'outline' : 'ghost'}
                                size="icon"
                                className={`h-8 w-8 shrink-0 ${isLineConfirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100' : 'text-muted-foreground hover:text-emerald-700'}`}
                                onClick={() => confirmLaborLine(line.itemKey)}
                                aria-label={isLineConfirmed ? `Item ${line.label} confirmado` : `Confirmar item ${line.label}`}
                                title={isLineConfirmed ? 'Item confirmado' : 'Confirmar item'}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => removeLaborLine(index)}>Quitar</Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm dark:bg-sky-500/10 sm:min-w-80">
                  <div>
                    <span className="font-medium text-sky-800 dark:text-sky-100">Total mano de obra</span>
                    <p className="text-xs font-normal text-muted-foreground">El cronograma se completa después de guardar este borrador.</p>
                  </div>
                  <span className="font-mono font-semibold text-sky-800 dark:text-sky-100">{formatCurrency(laborTotal)}</span>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setEditingLaborJobId(null)}>Cerrar</Button>
                  <Button disabled={savingLabor || !canSaveLaborDraft} onClick={() => void saveLaborPlan(laborJob)}>
                    {savingLabor ? 'Guardando...' : 'Continuar al cronograma'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!laborSchedulePromptJob} onOpenChange={(open) => { if (!open) setLaborSchedulePromptJobId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Falta completar el cronograma</DialogTitle>
            <DialogDescription>
              La mano de obra quedó guardada como borrador. Para enviar la solicitud a revisión debes vincularla con el cronograma del trabajo.
            </DialogDescription>
          </DialogHeader>
          {laborSchedulePromptJob ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-semibold">{getLeadDescription(laborSchedulePromptJob)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Trabajo {laborSchedulePromptJob.id.slice(0, 8)}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Abriremos el cronograma sobre esta ficha para que completes las fases sin salir del trabajo asignado.
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setLaborSchedulePromptJobId(null)}>Después</Button>
                <Button
                  onClick={() => {
                    const job = laborSchedulePromptJob;
                    setLaborSchedulePromptJobId(null);
                    goToSchedule(job, { fromLaborDraft: true });
                  }}
                  className="gap-2"
                >
                  <CalendarRange className="h-4 w-4" />
                  Llenar cronograma
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!embeddedFlow}
        onOpenChange={(open) => {
          if (open) return;
          setEmbeddedFlow(null);
          void loadAssignedData({ silent: true });
        }}
      >
        <DialogContent className="flex h-[92vh] w-[min(1180px,96vw)] max-w-none flex-col overflow-hidden p-0">
          {embeddedFlow ? (
            <>
              <DialogHeader className="border-b border-border bg-muted/30 px-5 py-4 text-left">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2">
                      {embeddedFlow.kind === 'schedule' ? <CalendarRange className="h-5 w-5 text-primary" /> : <PackageCheck className="h-5 w-5 text-primary" />}
                      {embeddedFlow.title}
                    </DialogTitle>
                    <DialogDescription className="mt-1 truncate">
                      {embeddedFlow.description}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0">Trabajo #{embeddedFlow.job.id.slice(0, 8)}</Badge>
                </div>
              </DialogHeader>
              <div className="min-h-0 flex-1 bg-background">
                <iframe
                  key={embeddedFlow.url}
                  title={embeddedFlow.title}
                  src={embeddedFlow.url}
                  className="h-full w-full border-0"
                />
              </div>
            </>
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
                <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
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
                <Button disabled={savingAdvance || Number(advanceAmount) <= 0 || !canSubmitAdvanceRequest} onClick={() => void saveAdvanceRequest(advanceJob)}>
                  {savingAdvance ? 'Enviando...' : activeAdvanceRequest?.status === 'rejected' ? 'Reenviar solicitud' : activeAdvanceRequest ? 'Solicitud activa' : 'Enviar solicitud'}
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

function InfoTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/15 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function FileActionRow({
  label,
  fileName,
  disabled,
  onDownload,
}: {
  label: string;
  fileName: string;
  disabled?: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 ${disabled ? 'text-muted-foreground/40' : 'text-emerald-600'}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
          <p className="mt-1 truncate text-sm font-medium">{fileName}</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onDownload} className="h-8 shrink-0 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Descargar
        </Button>
      </div>
    </div>
  );
}
