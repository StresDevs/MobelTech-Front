'use client';

import Image from 'next/image';
import { jsPDF } from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CURRENCY_FORMAT } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Camera,
  ClipboardList,
  Download,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Warehouse,
} from 'lucide-react';

type RequestPriority = 'alta' | 'media' | 'baja';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type DefectStatus = 'nuevo' | 'reportado' | 'en-gestion' | 'resuelto';
type ClaimStatus = 'abierto' | 'en-revision' | 'resuelto';
type SurplusClass = 'reutilizable' | 'desecho';

type SupplierRecord = {
  id: string;
  name: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  supplierType: string;
  purchaseHistoryCount: number;
  deliveryDelays: number;
  defectsRate: number;
  avgPriceCompetitiveness: number;
  status: 'active' | 'inactive';
};

type PriceVersion = {
  date: string;
  priceBs: number;
  exchangeRate: number;
};

type MaterialRecord = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  supplierId: string;
  sku: string;
  unit: string;
  warehouse: string;
  purchaseDate: string | null;
  stockPhysical: number;
  stockReserved: number;
  blockedByDefect: number;
  minStock: number;
  priceHistory: PriceVersion[];
  recentUsage: Array<{ project: string; date: string; quantity: number }>;
};

type MaterialRequestRecord = {
  id: string;
  contractorId: string;
  productionOrderId?: string | null;
  status: RequestStatus;
  rejectionComments?: string | null;
  requestDate: string;
  items: Array<{ materialId: string; quantity: number; notes?: string | null }>;
};

type DefectAlertRecord = {
  id: string;
  materialId: string;
  defectType: string;
  affectedQuantity: number;
  supplierId: string;
  createdAt: string;
  status: DefectStatus;
  supplierReportSent: boolean;
  notes?: string | null;
};

type ReturnClaimRecord = {
  id: string;
  purchaseOrderRef: string;
  supplierId?: string | null;
  materialId: string;
  reason: string;
  status: ClaimStatus;
  createdAt?: string;
};

type SurplusRecord = {
  id: string;
  materialId: string;
  quantity: number;
  origin: string;
  classification: SurplusClass;
  reintegrated: boolean;
};

type PurchaseOrderRecord = {
  id: string;
  supplierId: string;
  referenceCode: string;
  status: string;
  requestedBy?: string | null;
  notes?: string | null;
  orderedAt: string;
  items: Array<{
    materialId: string;
    quantity: number;
    unitPriceBs: number;
    receivedQuantity: number;
  }>;
};

type WarehouseRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type ContractorRecord = {
  id: string;
  name: string;
  userId?: string | null;
};

type InventoryOverview = {
  suppliers: SupplierRecord[];
  materials: MaterialRecord[];
  warehouses: WarehouseRecord[];
  contractors: ContractorRecord[];
  requests: MaterialRequestRecord[];
  defects: DefectAlertRecord[];
  claims: ReturnClaimRecord[];
  surplus: SurplusRecord[];
  purchaseOrders: PurchaseOrderRecord[];
};

const requesterSuggestions = ['Carlos Mamani', 'Ana Rojas', 'Diego Flores', 'Maria Villca'];

const EMPTY_OVERVIEW: InventoryOverview = {
  suppliers: [],
  materials: [],
  warehouses: [],
  contractors: [],
  requests: [],
  defects: [],
  claims: [],
  surplus: [],
  purchaseOrders: [],
};

const formatBs = (amount: number) =>
  `${CURRENCY_FORMAT}${amount.toLocaleString('es-BO', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const toIsoDate = () => new Date().toISOString().slice(0, 10);

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function makeMockImage(label: string, tone = '#0f766e') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="${tone}"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="60" y="60" width="1080" height="680" rx="36" fill="rgba(255,255,255,0.12)"/><text x="600" y="390" text-anchor="middle" fill="white" font-family="Verdana, sans-serif" font-size="52" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getValidationMessage(body: { error?: string; details?: Record<string, string[]> } | null, fallback: string) {
  const firstDetail = body?.details ? Object.values(body.details).flat()[0] : null;
  return firstDetail || body?.error || fallback;
}

function getSuggestionKey(reason: 'request' | 'stock', materialId: string) {
  return `${reason}:${materialId}`;
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function getSupplierScore(supplier: SupplierRecord) {
  const delayPenalty = Math.max(0, 100 - supplier.deliveryDelays * 12);
  const defectPenalty = Math.max(0, 100 - supplier.defectsRate * 20);
  const pricing = supplier.avgPriceCompetitiveness;
  return Math.round(delayPenalty * 0.4 + defectPenalty * 0.35 + pricing * 0.25);
}

export function InventoryControlCenter() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'partner';
  const isWarehouseRole = ['warehouse', 'almacenero'].includes(user?.role ?? '');
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(6.96);
  const [overview, setOverview] = useState<InventoryOverview>(EMPTY_OVERVIEW);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [globalOrderSearch, setGlobalOrderSearch] = useState('');
  const [defectMaterialSearch, setDefectMaterialSearch] = useState('');
  const [claimMaterialSearch, setClaimMaterialSearch] = useState('');
  const [claimSupplierSearch, setClaimSupplierSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MaterialRecord | null>(null);
  const [showInlineSupplierForm, setShowInlineSupplierForm] = useState(false);
  const [materialImageLink, setMaterialImageLink] = useState('');
  const [editImageLink, setEditImageLink] = useState('');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [newPurchaseOrderOpen, setNewPurchaseOrderOpen] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [acceptedGlobalOrders, setAcceptedGlobalOrders] = useState<PurchaseOrderRecord[]>([]);
  const [manualOrderDraft, setManualOrderDraft] = useState({
    supplierId: '',
    materialId: '',
    quantity: '1',
    unitPriceBs: '0',
    totalPriceBs: '',
    notes: '',
  });

  const [supplierDraft, setSupplierDraft] = useState({
    name: '',
    nit: '',
    phone: '',
    email: '',
    address: '',
    supplierType: 'Madera',
  });

  const [inlineSupplierDraft, setInlineSupplierDraft] = useState({
    name: '',
    nit: '',
    phone: '',
    email: '',
    address: '',
    supplierType: 'Madera',
  });

  const [materialDraft, setMaterialDraft] = useState({
    name: '',
    category: 'Materia prima',
    supplierId: '',
    sku: '',
    unit: 'unidad',
    warehouse: '',
    purchaseDate: toIsoDate(),
    purchasePriceBs: '0',
    initialStock: '0',
    minStock: '0',
    imageUrl: '',
  });

  const [defectDraft, setDefectDraft] = useState({
    materialId: '',
    defectType: '',
    affectedQuantity: '1',
  });

  const [claimDraft, setClaimDraft] = useState({
    supplierId: '',
    purchaseOrderRef: '',
    materialId: '',
    reason: '',
  });

  const [surplusDraft, setSurplusDraft] = useState({
    materialId: '',
    quantity: '1',
    origin: '',
    classification: 'reutilizable' as SurplusClass,
  });

  async function loadOverview() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/inventory/overview`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar el inventario.');
      const json = await response.json();
      setOverview(json);
      setMaterialDraft((current) => ({
        ...current,
        supplierId: current.supplierId || json.suppliers[0]?.id || '',
        warehouse: current.warehouse || json.warehouses[0]?.name || '',
      }));
      setDefectDraft((current) => ({
        ...current,
        materialId: current.materialId || json.materials[0]?.id || '',
      }));
      setClaimDraft((current) => ({
        ...current,
        materialId: current.materialId || json.materials[0]?.id || '',
      }));
      setSurplusDraft((current) => ({
        ...current,
        materialId: current.materialId || json.materials[0]?.id || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando inventario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [apiBase]);

  const suppliers = overview.suppliers;
  const materials = overview.materials;
  const warehouses = overview.warehouses;
  const contractors = overview.contractors;
  const requests = overview.requests;
  const defectAlerts = overview.defects;
  const returnClaims = overview.claims;
  const surplus = overview.surplus;
  const purchaseOrders = overview.purchaseOrders;
  const visiblePurchaseOrders = useMemo(
    () => [...acceptedGlobalOrders, ...purchaseOrders],
    [acceptedGlobalOrders, purchaseOrders],
  );

  const supplierRanking = useMemo(
    () => [...suppliers].sort((a, b) => getSupplierScore(b) - getSupplierScore(a)),
    [suppliers],
  );

  const allCategories = useMemo(() => Array.from(new Set(materials.map((m) => m.category))), [materials]);
  const allWarehouses = useMemo(
    () => warehouses.length > 0 ? warehouses.map((warehouse) => warehouse.name) : Array.from(new Set(materials.map((m) => m.warehouse))).filter(Boolean),
    [materials, warehouses],
  );

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const query = normalizeText(materialSearch);
      const matchesSearch =
        query === '' ||
        normalizeText(material.name).includes(query) ||
        normalizeText(material.sku).includes(query) ||
        normalizeText(material.category).includes(query);
      const matchesCategory = filterCategory === 'all' || material.category === filterCategory;
      const matchesWarehouse = filterWarehouse === 'all' || material.warehouse === filterWarehouse;
      return matchesSearch && matchesCategory && matchesWarehouse;
    });
  }, [filterCategory, filterWarehouse, materialSearch, materials]);

  const stockAlerts = useMemo(
    () =>
      materials
        .filter((material) => getAvailableStock(material) < material.minStock)
        .map((material) => ({
          materialId: material.id,
          suggestedQty: Math.max(material.minStock * 2 - getAvailableStock(material), 1),
        })),
    [materials],
  );

  const globalOrderSuggestions = useMemo(() => {
    const grouped = new Map<string, {
      supplierId: string;
      materialId: string;
      quantity: number;
      requestedQuantity: number;
      availableQuantity: number;
      contractorIds: string[];
      requestIds: string[];
      reason: 'request';
    }>();

    for (const request of requests) {
      for (const item of request.items) {
        const material = materials.find((entry) => entry.id === item.materialId);
        if (!material) continue;
        const available = Math.max(0, getAvailableStock(material));
        const missingQuantity = Math.max(0, item.quantity - available);
        if (missingQuantity <= 0) continue;

        const key = `${material.supplierId}-${material.id}`;
        const current = grouped.get(key);
        if (current) {
          current.quantity += missingQuantity;
          current.requestedQuantity += item.quantity;
          current.availableQuantity = Math.min(current.availableQuantity, available);
          if (!current.contractorIds.includes(request.contractorId)) current.contractorIds.push(request.contractorId);
          current.requestIds.push(request.id);
        } else {
          grouped.set(key, {
            supplierId: material.supplierId,
            materialId: material.id,
            quantity: missingQuantity,
            requestedQuantity: item.quantity,
            availableQuantity: available,
            contractorIds: [request.contractorId],
            requestIds: [request.id],
            reason: 'request',
          });
        }
      }
    }

    return Array.from(grouped.values()).filter((entry) => !dismissedSuggestions.includes(getSuggestionKey(entry.reason, entry.materialId)));
  }, [dismissedSuggestions, materials, requests]);

  const stockOrderSuggestions = useMemo(
    () =>
      stockAlerts
        .map((alert) => {
          const material = materials.find((entry) => entry.id === alert.materialId);
          if (!material) return null;
          return {
            supplierId: material.supplierId,
            materialId: alert.materialId,
            quantity: alert.suggestedQty,
            reason: 'stock' as const,
          };
        })
        .filter((entry): entry is { supplierId: string; materialId: string; quantity: number; reason: 'stock' } => Boolean(entry))
        .filter((entry) => !dismissedSuggestions.includes(getSuggestionKey(entry.reason, entry.materialId))),
    [dismissedSuggestions, materials, stockAlerts],
  );

  const selectedMaterial = useMemo(
    () => materials.find((entry) => entry.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
  );

  function getMaterialName(materialId: string) {
    return materials.find((entry) => entry.id === materialId)?.name ?? 'Material no encontrado';
  }

  function getSupplierName(supplierId: string) {
    return suppliers.find((entry) => entry.id === supplierId)?.name ?? 'Proveedor no encontrado';
  }

  function getContractorName(contractorId: string) {
    return contractors.find((entry) => entry.id === contractorId || entry.userId === contractorId)?.name ?? `Contratista ${contractorId.slice(0, 8)}`;
  }

  function getDefectiveQuantity(materialId: string) {
    return defectAlerts
      .filter((alert) => alert.materialId === materialId && alert.status !== 'resuelto')
      .reduce((sum, alert) => sum + alert.affectedQuantity, 0);
  }

  function getCurrentPriceBs(material: MaterialRecord) {
    return material.priceHistory[material.priceHistory.length - 1]?.priceBs ?? 0;
  }

  function getCurrentPriceUsd(material: MaterialRecord) {
    return getCurrentPriceBs(material) / exchangeRate;
  }

  function getAvailableStock(material: MaterialRecord) {
    return material.stockPhysical - material.stockReserved - material.blockedByDefect;
  }

  async function performMutation<T>(request: Promise<Response>, fallbackMessage: string): Promise<T | null> {
    setSaving(true);
    setError(null);
    try {
      const response = await request;
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getValidationMessage(body, fallbackMessage));
      }
      return body as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function createSupplier(draft: typeof supplierDraft) {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      }),
      'No se pudo registrar el proveedor.',
    );

    return created as SupplierRecord | null;
  }

  async function handleSupplierCreate() {
    const created = await createSupplier(supplierDraft);
    if (!created) return;

    setSupplierDraft({
      name: '',
      nit: '',
      phone: '',
      email: '',
      address: '',
      supplierType: 'Madera',
    });
    await loadOverview();
  }

  async function handleInlineSupplierCreate() {
    const created = await createSupplier(inlineSupplierDraft);
    if (!created) return;

    setInlineSupplierDraft({
      name: '',
      nit: '',
      phone: '',
      email: '',
      address: '',
      supplierType: 'Madera',
    });
    setShowInlineSupplierForm(false);
    setMaterialDraft((current) => ({ ...current, supplierId: created.id }));
    await loadOverview();
  }

  async function handleMaterialCreate() {
    if (!materialDraft.name.trim()) {
      setError('El nombre del material es obligatorio.');
      return;
    }
    if (!materialDraft.supplierId) {
      setError('Selecciona un proveedor antes de crear el material.');
      return;
    }
    if (!materialDraft.unit.trim()) {
      setError('La unidad es obligatoria.');
      return;
    }
    if (!materialDraft.warehouse.trim()) {
      setError('La ubicación es obligatoria.');
      return;
    }
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...materialDraft,
          purchaseDate: undefined,
        }),
      }),
      'No se pudo crear el material.',
    );

    if (!created) return;

    setAddItemOpen(false);
    setMaterialDraft((current) => ({
      ...current,
      name: '',
      sku: '',
      purchasePriceBs: '0',
      initialStock: '0',
      minStock: '0',
      imageUrl: '',
      purchaseDate: toIsoDate(),
    }));
    setMaterialImageLink('');
    await loadOverview();
  }

  async function handleMaterialImageUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen no debe superar 3MB.');
      return;
    }

    try {
      const imageUrl = await readImageAsDataUrl(file);
      setMaterialDraft((current) => ({ ...current, imageUrl }));
      setMaterialImageLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
    }
  }

  async function handleEditImageUpload(file: File | undefined) {
    if (!file || !editDraft) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen no debe superar 3MB.');
      return;
    }

    try {
      const imageUrl = await readImageAsDataUrl(file);
      setEditDraft((current) => current ? { ...current, imageUrl } : current);
      setEditImageLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
    }
  }

  function handleEditOpen(material: MaterialRecord) {
    setEditDraft({ ...material });
    setEditImageLink(material.imageUrl?.startsWith('data:') ? '' : material.imageUrl || '');
    setEditItemOpen(true);
  }

  async function handleMaterialUpdate() {
    if (!editDraft) return;

    const updated = await performMutation(
      fetch(`${apiBase}/api/inventory/materials/${editDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          category: editDraft.category,
          supplierId: editDraft.supplierId,
          sku: editDraft.sku,
          unit: editDraft.unit,
          warehouse: editDraft.warehouse,
          minStock: editDraft.minStock,
          imageUrl: editDraft.imageUrl,
          purchasePriceBs: getCurrentPriceBs(editDraft),
        }),
      }),
      'No se pudo actualizar el material.',
    );

    if (!updated) return;

    setEditItemOpen(false);
    setEditDraft(null);
    await loadOverview();
  }

  async function handleDeleteMaterial(materialId: string) {
    const deleted = await performMutation(
      fetch(`${apiBase}/api/inventory/materials/${materialId}`, {
        method: 'DELETE',
      }),
      'No se pudo eliminar el material.',
    );

    if (!deleted) return;
    await loadOverview();
  }

  async function handleMinStockChange(materialId: string, minStock: number) {
    const updated = await performMutation(
      fetch(`${apiBase}/api/inventory/materials/${materialId}/min-stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minStock }),
      }),
      'No se pudo actualizar el stock mínimo.',
    );

    if (!updated) return;
    await loadOverview();
  }

  async function handleDefectCreate() {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...defectDraft,
          createdBy: user?.name ?? 'Sistema',
        }),
      }),
      'No se pudo registrar el defecto.',
    );

    if (!created) return;
    setDefectDraft((current) => ({ ...current, defectType: '', affectedQuantity: '1' }));
    await loadOverview();
  }

  async function handleDefectStatusAdvance(defectId: string) {
    const updated = await performMutation(
      fetch(`${apiBase}/api/inventory/defects/${defectId}/advance`, {
        method: 'PATCH',
      }),
      'No se pudo avanzar el flujo del defecto.',
    );

    if (!updated) return;
    await loadOverview();
  }

  async function handleClaimCreate() {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimDraft),
      }),
      'No se pudo crear el reclamo.',
    );

    if (!created) return;
    setClaimDraft((current) => ({ ...current, purchaseOrderRef: '', supplierId: '', reason: '' }));
    await loadOverview();
  }

  async function handleClaimStatus(claimId: string) {
    const updated = await performMutation(
      fetch(`${apiBase}/api/inventory/claims/${claimId}/advance`, {
        method: 'PATCH',
      }),
      'No se pudo avanzar el estado del reclamo.',
    );

    if (!updated) return;
    await loadOverview();
  }

  async function handleSurplusCreate() {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/surplus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surplusDraft),
      }),
      'No se pudo registrar el sobrante.',
    );

    if (!created) return;
    setSurplusDraft((current) => ({ ...current, quantity: '1', origin: '' }));
    await loadOverview();
  }

  async function handleSurplusReintegration(surplusId: string) {
    const updated = await performMutation(
      fetch(`${apiBase}/api/inventory/surplus/${surplusId}/reintegrate`, {
        method: 'PATCH',
      }),
      'No se pudo reintegrar el sobrante.',
    );

    if (!updated) return;
    await loadOverview();
  }

  async function handleDeleteSurplus(surplusId: string) {
    const deleted = await performMutation(
      fetch(`${apiBase}/api/inventory/surplus/${surplusId}`, {
        method: 'DELETE',
      }),
      'No se pudo eliminar el sobrante.',
    );

    if (!deleted) return;
    await loadOverview();
  }

  function getManualOrderTotal() {
    const explicitTotal = Number(manualOrderDraft.totalPriceBs);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;
    return Math.max(0, Number(manualOrderDraft.quantity) || 0) * Math.max(0, Number(manualOrderDraft.unitPriceBs) || 0);
  }

  function handleAcceptGlobalOrder() {
    const rows = [...globalOrderSuggestions, ...stockOrderSuggestions];
    if (rows.length === 0) return;

    const primarySupplierId = rows[0]?.supplierId || suppliers[0]?.id || '';
    const acceptedOrder: PurchaseOrderRecord = {
      id: `local-global-${Date.now()}`,
      supplierId: primarySupplierId,
      referenceCode: `GLOBAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(visiblePurchaseOrders.length + 1).padStart(2, '0')}`,
      status: 'accepted',
      requestedBy: user?.name ?? 'Administración',
      notes: 'Orden global aceptada desde faltantes de contratistas y bajo stock.',
      orderedAt: new Date().toISOString(),
      items: rows.map((item) => {
        const material = materials.find((entry) => entry.id === item.materialId);
        const unitPriceBs = material ? getCurrentPriceBs(material) : 0;
        return {
          materialId: item.materialId,
          quantity: item.quantity,
          unitPriceBs,
          receivedQuantity: 0,
        };
      }),
    };

    setAcceptedGlobalOrders((current) => [acceptedOrder, ...current]);
    setDismissedSuggestions((current) => [
      ...current,
      ...rows.map((item) => getSuggestionKey(item.reason, item.materialId)),
    ]);
  }

  function downloadGlobalOrderPdf(order: PurchaseOrderRecord) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Orden global ${order.referenceCode}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Estado: ${order.status}`, 14, 28);
    doc.text(`Generada: ${new Date(order.orderedAt).toLocaleString('es-BO')}`, 14, 35);
    let y = 48;

    order.items.forEach((item, index) => {
      const material = materials.find((entry) => entry.id === item.materialId);
      if (!material) return;
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${material.name}`, 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Cantidad: ${item.quantity} ${material.unit} | Precio ref.: ${formatBs(item.unitPriceBs)}`, 18, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    });

    const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceBs, 0);
    doc.setFontSize(12);
    doc.text(`Total referencial: ${formatBs(total)}`, 14, y + 4);
    doc.save(`orden-global-${order.referenceCode}.pdf`);
  }

  function handleDownloadReceiptPdf() {
    if (receiptFiles.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Constancia de orden global', 14, 18);
    doc.setFontSize(10);
    doc.text(`Archivos cargados: ${receiptFiles.length}`, 14, 28);
    receiptFiles.forEach((file, index) => {
      const y = 42 + index * 10;
      if (y > 270) {
        doc.addPage();
        doc.text(`${index + 1}. ${file.name}`, 14, 20);
      } else {
        doc.text(`${index + 1}. ${file.name} (${Math.round(file.size / 1024)} KB)`, 14, y);
      }
    });
    doc.save(`constancia-orden-global-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function handleRegisterManualOrder() {
    const material = materials.find((entry) => entry.id === manualOrderDraft.materialId);
    if (!manualOrderDraft.supplierId || !material) {
      setError('Selecciona proveedor e ítem para registrar la orden.');
      return;
    }

    window.alert(
      `Orden de compra preparada:\n\nProveedor: ${getSupplierName(manualOrderDraft.supplierId)}\nÍtem: ${material.name}\nCantidad: ${manualOrderDraft.quantity}\nTotal: ${formatBs(getManualOrderTotal())}`,
    );
    setNewPurchaseOrderOpen(false);
    setManualOrderDraft({
      supplierId: '',
      materialId: '',
      quantity: '1',
      unitPriceBs: '0',
      totalPriceBs: '',
      notes: '',
    });
  }

  function downloadPurchaseOrderPdf(order: PurchaseOrderRecord, supplierName: string, total: number) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Orden de compra ${order.referenceCode}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Proveedor: ${supplierName}`, 14, 28);
    doc.text(`Estado: ${order.status}`, 14, 35);
    doc.text(`Fecha: ${new Date(order.orderedAt).toLocaleDateString('es-BO')}`, 14, 42);
    let y = 56;
    order.items.forEach((item, index) => {
      const material = materials.find((entry) => entry.id === item.materialId);
      doc.text(`${index + 1}. ${material?.name ?? 'Material'} - ${item.quantity} x ${formatBs(item.unitPriceBs)}`, 14, y);
      y += 7;
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    });
    doc.setFontSize(12);
    doc.text(`Total: ${formatBs(total)}`, 14, y + 6);
    doc.save(`orden-compra-${order.referenceCode}.pdf`);
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando inventario"
        description="Sincronizando materiales, proveedores, stock y trazabilidad..."
      />
    );
  }

  if (isWarehouseRole) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-lg font-semibold">Inventario no disponible</h2>
        <p className="mt-2 text-sm">El rol almacenero no tiene permisos para ver esta sección.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Inventario y compras</h2>
            <p className="text-xs text-muted-foreground">Control operativo de materiales, proveedores y stock.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1"><Package className="h-3.5 w-3.5" />{materials.length} materiales</Badge>
            <Badge variant="outline" className="gap-1"><ClipboardList className="h-3.5 w-3.5" />{requests.filter((request) => request.status === 'pending').length} pendientes</Badge>
            <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" />{stockAlerts.length} stock bajo</Badge>
            <div className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1">
              <span className="text-xs text-muted-foreground">Bs/USD</span>
              <Input
                value={exchangeRate}
                className="h-7 w-20 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                onChange={(event) => setExchangeRate(Number(event.target.value) || 6.96)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </Card>
      ) : null}

      <datalist id="inventory-category-options">
        {allCategories.map((category) => (
          <option key={category} value={category} />
        ))}
        {['Materia prima', 'Herrajes', 'Telas', 'Insumos', 'Muebles', 'Equipos y Herramientas'].map((category) => (
          <option key={`default-${category}`} value={category} />
        ))}
      </datalist>
      <datalist id="supplier-type-options">
        {Array.from(new Set(suppliers.map((supplier) => supplier.supplierType).filter(Boolean))).map((type) => (
          <option key={type} value={type} />
        ))}
        {['Madera', 'Telas', 'Herrajes', 'Insumos'].map((type) => (
          <option key={`default-${type}`} value={type} />
        ))}
      </datalist>

      <Tabs defaultValue="proveedores" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-2 md:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger value="proveedores" className="gap-1 text-xs"><Store className="h-4 w-4" />Proveedores</TabsTrigger>
          <TabsTrigger value="productos" className="gap-1 text-xs"><Package className="h-4 w-4" />Productos</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1 text-xs"><Warehouse className="h-4 w-4" />Stock</TabsTrigger>
          <TabsTrigger value="compras" className="gap-1 text-xs"><ShoppingCart className="h-4 w-4" />Compras</TabsTrigger>
          <TabsTrigger value="defectos" className="gap-1 text-xs"><AlertTriangle className="h-4 w-4" />Defectos</TabsTrigger>
          <TabsTrigger value="cambios" className="gap-1 text-xs"><ArrowLeftRight className="h-4 w-4" />Restitución</TabsTrigger>
          <TabsTrigger value="sobrantes" className="gap-1 text-xs"><Boxes className="h-4 w-4" />Sobrantes</TabsTrigger>
        </TabsList>

        <TabsContent value="proveedores" className="mt-6 space-y-4">
          {!isReadOnly ? (
            <Card>
              <CardHeader>
                <CardTitle>Registro de proveedores</CardTitle>
                <CardDescription>Sin duplicados por NIT y con visibilidad de desempeño.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Input placeholder="Nombre / razón social" value={supplierDraft.name} onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))} />
                <Input placeholder="NIT" value={supplierDraft.nit} onChange={(event) => setSupplierDraft((current) => ({ ...current, nit: event.target.value }))} />
                <Input placeholder="Teléfono" value={supplierDraft.phone} onChange={(event) => setSupplierDraft((current) => ({ ...current, phone: event.target.value }))} />
                <Input placeholder="Email" value={supplierDraft.email} onChange={(event) => setSupplierDraft((current) => ({ ...current, email: event.target.value }))} />
                <Input placeholder="Dirección" value={supplierDraft.address} onChange={(event) => setSupplierDraft((current) => ({ ...current, address: event.target.value }))} />
                <Input
                  placeholder="Categoría del proveedor"
                  value={supplierDraft.supplierType}
                  onChange={(event) => setSupplierDraft((current) => ({ ...current, supplierType: event.target.value }))}
                  list="supplier-type-options"
                />
                <div className="flex justify-end xl:col-span-3">
                  <Button onClick={() => void handleSupplierCreate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                    {saving ? 'Guardando...' : 'Registrar proveedor'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Lista de proveedores</CardTitle>
              <CardDescription>Ordenados por ranking de desempeño.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar proveedor..." value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ranking</TableHead>
                    <TableHead>Historial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRanking
                    .filter((supplier) => normalizeText(supplier.name).includes(normalizeText(supplierSearch)))
                    .map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">NIT {supplier.nit}</p>
                        </TableCell>
                        <TableCell>{supplier.supplierType}</TableCell>
                        <TableCell>{getSupplierScore(supplier)} pts</TableCell>
                        <TableCell>{supplier.purchaseHistoryCount} órdenes</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productos" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Ítems de inventario</h3>
              <p className="text-sm text-muted-foreground">{filteredMaterials.length} ítems visibles</p>
            </div>
            {!isReadOnly ? <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 self-start bg-emerald-600 text-white hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                  Agregar ítem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Nuevo material</DialogTitle>
                  <DialogDescription>Se registrará en Neon con stock inicial, proveedor y trazabilidad.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-2 md:grid-cols-2">
                  <Field label="Nombre"><Input value={materialDraft.name} onChange={(event) => setMaterialDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
                  <Field label="Código manual"><Input value={materialDraft.sku} onChange={(event) => setMaterialDraft((current) => ({ ...current, sku: event.target.value }))} placeholder="Ej. MEL-BLANCO-18" /></Field>
                  <Field label="Categoría">
                    <Input
                      value={materialDraft.category}
                      onChange={(event) => setMaterialDraft((current) => ({ ...current, category: event.target.value }))}
                      placeholder="Materia prima, Herrajes..."
                      list="inventory-category-options"
                    />
                  </Field>
                  <Field label="Proveedor">
                    <div className="flex gap-2">
                      <Select value={materialDraft.supplierId} onValueChange={(value) => setMaterialDraft((current) => ({ ...current, supplierId: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowInlineSupplierForm((current) => !current)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  {showInlineSupplierForm ? (
                    <div className="grid gap-3 rounded-xl border border-[#d6a85a]/40 bg-[#d6a85a]/10 p-3 md:col-span-2 md:grid-cols-3">
                      <Input placeholder="Nombre proveedor" value={inlineSupplierDraft.name} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, name: event.target.value }))} />
                      <Input placeholder="NIT" value={inlineSupplierDraft.nit} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, nit: event.target.value }))} />
                      <Input placeholder="Teléfono" value={inlineSupplierDraft.phone} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, phone: event.target.value }))} />
                      <Input placeholder="Email" value={inlineSupplierDraft.email} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, email: event.target.value }))} />
                      <Input placeholder="Dirección" value={inlineSupplierDraft.address} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, address: event.target.value }))} />
                      <Input placeholder="Categoría" value={inlineSupplierDraft.supplierType} onChange={(event) => setInlineSupplierDraft((current) => ({ ...current, supplierType: event.target.value }))} list="supplier-type-options" />
                      <div className="flex justify-end gap-2 md:col-span-3">
                        <Button type="button" variant="ghost" onClick={() => setShowInlineSupplierForm(false)}>Cancelar</Button>
                        <Button type="button" onClick={() => void handleInlineSupplierCreate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                          Crear y seleccionar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <Field label="Unidad"><Input value={materialDraft.unit} onChange={(event) => setMaterialDraft((current) => ({ ...current, unit: event.target.value }))} /></Field>
                  <Field label="Ubicación">
                    <Select value={materialDraft.warehouse} onValueChange={(value) => setMaterialDraft((current) => ({ ...current, warehouse: value }))}>
                      <SelectTrigger><SelectValue placeholder="Elige ubicación" /></SelectTrigger>
                      <SelectContent>
                        {allWarehouses.map((warehouse) => (
                          <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Precio de compra (Bs.)"><Input type="number" min={0} value={materialDraft.purchasePriceBs} onChange={(event) => setMaterialDraft((current) => ({ ...current, purchasePriceBs: event.target.value }))} /></Field>
                  <Field label="Stock inicial"><Input type="number" min={0} value={materialDraft.initialStock} onChange={(event) => setMaterialDraft((current) => ({ ...current, initialStock: event.target.value }))} /></Field>
                  <Field label="Stock mínimo"><Input type="number" min={0} value={materialDraft.minStock} onChange={(event) => setMaterialDraft((current) => ({ ...current, minStock: event.target.value }))} /></Field>
                  <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-3 md:col-span-2 md:grid-cols-[170px_1fr]">
                    <div className="relative h-32 overflow-hidden rounded-xl border bg-background">
                      <Image src={materialDraft.imageUrl || makeMockImage(materialDraft.name || 'Material')} alt="Vista previa del material" fill className="object-cover" unoptimized />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Imagen del ítem</p>
                        <p className="text-xs text-muted-foreground">Carga desde galería, cámara móvil o pega un enlace. Máximo recomendado: 3MB.</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ImagePicker label="Galería" icon={<ImageIcon className="h-4 w-4" />} onChange={(file) => void handleMaterialImageUpload(file)} />
                        <ImagePicker label="Cámara" icon={<Camera className="h-4 w-4" />} capture onChange={(file) => void handleMaterialImageUpload(file)} />
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={materialImageLink}
                            onChange={(event) => setMaterialImageLink(event.target.value)}
                            placeholder="Pegar enlace de imagen"
                            className="pl-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMaterialDraft((current) => ({ ...current, imageUrl: materialImageLink.trim() }))}
                          disabled={!materialImageLink.trim()}
                        >
                          Usar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddItemOpen(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={() => void handleMaterialCreate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                      {saving ? 'Guardando...' : 'Guardar ítem'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog> : null}
          </div>

          <Card className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por descripción, código o categoría..." value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="xl:w-56"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                <SelectTrigger className="xl:w-72"><SelectValue placeholder="Ubicación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ubicaciones</SelectItem>
                  {allWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Ítem</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Und</TableHead>
                    <TableHead>Stock disp.</TableHead>
                  <TableHead>Valor / ubicación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No hay materiales con esos filtros.</TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const available = getAvailableStock(material);
                    const lowStock = available < material.minStock;
                    const defectiveQuantity = getDefectiveQuantity(material.id);
                    return (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="group relative h-11 w-11 overflow-visible rounded-xl border bg-muted">
                                <Image
                                  src={material.imageUrl || makeMockImage(material.name)}
                                  alt={material.name}
                                  fill
                                  className="rounded-xl object-cover"
                                  unoptimized
                                />
                                <div className="pointer-events-none absolute left-14 top-1/2 z-30 h-40 w-56 -translate-y-1/2 scale-95 overflow-hidden rounded-2xl border bg-background opacity-0 shadow-2xl transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                                  <Image
                                    src={material.imageUrl || makeMockImage(material.name)}
                                    alt={`Preview ${material.name}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                                    <p className="truncate text-xs font-medium text-white">{material.name}</p>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{material.sku || 'Sin código'}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{material.name}</p>
                                  {defectiveQuantity > 0 ? (
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                                      {defectiveQuantity} dañados
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{material.category}</Badge></TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell className={lowStock ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700'}>{available}</TableCell>
                          <TableCell>
                            <p className="font-semibold">${getCurrentPriceUsd(material).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{material.warehouse || 'Sin ubicación'}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {!isReadOnly ? <Button variant="ghost" size="icon" onClick={() => handleEditOpen(material)}><Pencil className="h-4 w-4" /></Button> : null}
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedMaterialId(material.id); setDetailOpen(true); }}><FileText className="h-4 w-4" /></Button>
                              {!isReadOnly ? <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => void handleDeleteMaterial(material.id)}><Trash2 className="h-4 w-4" /></Button> : null}
                            </div>
                          </TableCell>
                        </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Verificación de stock</CardTitle>
              <CardDescription>Diferencia físico, reservado, bloqueado y disponible con umbrales mínimos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Físico</TableHead>
                    <TableHead>Reservado</TableHead>
                    <TableHead>Bloqueado</TableHead>
                    <TableHead>Disponible</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Riesgo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => {
                    const available = getAvailableStock(material);
                    const risk = available <= material.minStock;
                    const performance = Math.min(100, Math.round((available / Math.max(material.minStock * 2, 1)) * 100));
                    const defectiveQuantity = getDefectiveQuantity(material.id);
                    return (
                      <TableRow key={material.id} className={risk ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                        <TableCell>
                          <p className="font-medium">{material.name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-muted-foreground">{material.sku || 'Sin código'}</p>
                            {defectiveQuantity > 0 ? (
                              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                                {defectiveQuantity} dañados
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{material.warehouse}</TableCell>
                        <TableCell>{material.stockPhysical}</TableCell>
                        <TableCell>{material.stockReserved}</TableCell>
                        <TableCell>{material.blockedByDefect}</TableCell>
                        <TableCell className={risk ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700'}>{available}</TableCell>
                        <TableCell>
                          {isReadOnly ? (
                            <span className="font-medium">{material.minStock}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              defaultValue={material.minStock}
                              className="h-8 w-24"
                              onBlur={(event) => {
                                const next = Number(event.target.value);
                                if (Number.isFinite(next)) void handleMinStockChange(material.id, next);
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={performance} className={`h-2 w-24 ${risk ? '[&>div]:bg-rose-500' : '[&>div]:bg-emerald-500'}`} />
                            <span className="text-xs text-muted-foreground">{performance}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compras" className="mt-6 space-y-4">
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle>Orden global</CardTitle>
                  <CardDescription>Faltantes reales por solicitudes de contratistas y alertas de bajo stock.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isReadOnly ? (
                    <Button variant="outline" onClick={() => setNewPurchaseOrderOpen(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Orden normal
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={handleDownloadReceiptPdf} disabled={receiptFiles.length === 0}>
                    <Download className="mr-1 h-4 w-4" />
                    Descargar constancia
                  </Button>
                  <Button onClick={handleAcceptGlobalOrder} disabled={globalOrderSuggestions.length + stockOrderSuggestions.length === 0}>
                    <FileText className="mr-1 h-4 w-4" />
                    Aceptar orden global
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                <Input placeholder="Buscar ítem, código o proveedor..." value={globalOrderSearch} onChange={(event) => setGlobalOrderSearch(event.target.value)} />
                <Input
                  type="number"
                  min={0}
                  placeholder="Precio total final Bs."
                  value={manualOrderDraft.totalPriceBs}
                  onChange={(event) => setManualOrderDraft((current) => ({ ...current, totalPriceBs: event.target.value }))}
                />
              </div>

              {!isReadOnly ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Constancia de compra</p>
                  <p className="text-xs text-muted-foreground">Sube fotos o archivos. Al descargar, se genera un solo PDF resumen con todo lo cargado.</p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="mt-3"
                    onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))}
                  />
                  {receiptFiles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {receiptFiles.map((file) => (
                        <Badge key={`${file.name}-${file.size}`} variant="outline">{file.name}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 xl:grid-cols-2">
                {globalOrderSuggestions
                  .filter((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    const supplierName = getSupplierName(item.supplierId);
                    const query = normalizeText(globalOrderSearch);
                    return !query || [material?.name ?? '', material?.sku ?? '', supplierName].some((value) => normalizeText(value).includes(query));
                  })
                  .map((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    if (!material) return null;
                    return (
                      <OrderSuggestionCard
                        key={`request-${item.materialId}`}
                        title={material.name}
                        subtitle={`Solicitado por ${item.contractorIds.map(getContractorName).join(', ')} · pedido ${item.requestedQuantity}, disponible ${item.availableQuantity}`}
                        quantity={`Faltan ${item.quantity} ${material.unit}`}
                        supplierId={item.supplierId}
                        suppliers={suppliers}
                        onSupplierChange={(supplierId) => {
                          item.supplierId = supplierId;
                        }}
                        onDismiss={() => setDismissedSuggestions((current) => [...current, getSuggestionKey('request', item.materialId)])}
                      />
                    );
                  })}
                {stockOrderSuggestions
                  .filter((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    const supplierName = getSupplierName(item.supplierId);
                    const query = normalizeText(globalOrderSearch);
                    return !query || [material?.name ?? '', material?.sku ?? '', supplierName].some((value) => normalizeText(value).includes(query));
                  })
                  .map((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    if (!material) return null;
                    return (
                      <OrderSuggestionCard
                        key={`stock-${item.materialId}`}
                        title={material.name}
                        subtitle={`Bajo stock: disponible ${getAvailableStock(material)} / mínimo ${material.minStock}`}
                        quantity={`Reponer ${item.quantity} ${material.unit}`}
                        supplierId={item.supplierId}
                        suppliers={suppliers}
                        tone="amber"
                        onSupplierChange={(supplierId) => {
                          item.supplierId = supplierId;
                        }}
                        onDismiss={() => setDismissedSuggestions((current) => [...current, getSuggestionKey('stock', item.materialId)])}
                      />
                    );
                  })}
              </div>
              {globalOrderSuggestions.length + stockOrderSuggestions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No hay solicitudes que excedan inventario ni alertas de bajo stock pendientes.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Órdenes de compra registradas</CardTitle>
              <CardDescription>Lectura directa de órdenes sembradas o registradas en base de datos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Ítems</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePurchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay órdenes registradas.</TableCell>
                    </TableRow>
                  ) : (
                    visiblePurchaseOrders.map((order) => {
                      const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceBs, 0);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.referenceCode}</TableCell>
                          <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                          <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                          <TableCell>{new Date(order.orderedAt).toLocaleDateString('es-BO')}</TableCell>
                          <TableCell>{order.items.length}</TableCell>
                          <TableCell className="font-semibold">{formatBs(total)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => order.id.startsWith('local-global-') ? downloadGlobalOrderPdf(order) : downloadPurchaseOrderPdf(order, getSupplierName(order.supplierId), total)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defectos" className="mt-6 space-y-4">
          {!isReadOnly ? (
            <Card>
              <CardHeader>
                <CardTitle>Alarmas por material defectuoso</CardTitle>
                <CardDescription>Bloquea inventario y lleva el flujo del incidente.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SearchPicker
                  placeholder="Buscar material"
                  search={defectMaterialSearch}
                  onSearch={setDefectMaterialSearch}
                  selectedLabel={getMaterialName(defectDraft.materialId)}
                  options={materials.map((material) => ({ id: material.id, label: material.name, helper: material.sku || material.category }))}
                  onSelect={(id) => setDefectDraft((current) => ({ ...current, materialId: id }))}
                />
                <Input placeholder="Tipo de defecto" value={defectDraft.defectType} onChange={(event) => setDefectDraft((current) => ({ ...current, defectType: event.target.value }))} />
                <Input type="number" min={1} value={defectDraft.affectedQuantity} onChange={(event) => setDefectDraft((current) => ({ ...current, affectedQuantity: event.target.value }))} />
                <Button onClick={() => void handleDefectCreate()} disabled={saving}>Registrar alarma</Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Lista de alertas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Defecto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Reporte</TableHead>
                    {!isReadOnly ? <TableHead>Acción</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defectAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{getMaterialName(alert.materialId)}</TableCell>
                      <TableCell>{alert.defectType}</TableCell>
                      <TableCell>{alert.affectedQuantity}</TableCell>
                      <TableCell>{getSupplierName(alert.supplierId)}</TableCell>
                      <TableCell><Badge variant="outline">{alert.status}</Badge></TableCell>
                      <TableCell><Badge variant={alert.supplierReportSent ? 'secondary' : 'destructive'}>{alert.supplierReportSent ? 'Enviado' : 'Pendiente'}</Badge></TableCell>
                      {!isReadOnly ? <TableCell><Button variant="outline" size="sm" onClick={() => void handleDefectStatusAdvance(alert.id)}>Avanzar flujo</Button></TableCell> : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cambios" className="mt-6 space-y-4">
          {!isReadOnly ? (
            <Card>
              <CardHeader>
                <CardTitle>Gestión de cambio / restitución</CardTitle>
                <CardDescription>Registro de devoluciones y reclamos asociados al proveedor.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SearchPicker
                  placeholder="Buscar proveedor"
                  search={claimSupplierSearch}
                  onSearch={setClaimSupplierSearch}
                  selectedLabel={claimDraft.supplierId ? getSupplierName(claimDraft.supplierId) : 'Proveedor'}
                  options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.name, helper: supplier.supplierType }))}
                  onSelect={(id) => setClaimDraft((current) => ({ ...current, supplierId: id }))}
                />
                <SearchPicker
                  placeholder="Buscar material"
                  search={claimMaterialSearch}
                  onSearch={setClaimMaterialSearch}
                  selectedLabel={getMaterialName(claimDraft.materialId)}
                  options={materials.map((material) => ({ id: material.id, label: material.name, helper: material.sku || material.category }))}
                  onSelect={(id) => setClaimDraft((current) => ({ ...current, materialId: id }))}
                />
                <Textarea className="md:col-span-2" placeholder="Motivo del reclamo" value={claimDraft.reason} onChange={(event) => setClaimDraft((current) => ({ ...current, reason: event.target.value }))} />
                <Button className="md:col-span-2 xl:col-span-4" onClick={() => void handleClaimCreate()} disabled={saving}>Crear reclamo</Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Seguimiento de reclamos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    {!isReadOnly ? <TableHead>Acción</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>{claim.supplierId ? getSupplierName(claim.supplierId) : 'Sin proveedor'}</TableCell>
                      <TableCell>{getMaterialName(claim.materialId)}</TableCell>
                      <TableCell className="max-w-sm truncate" title={claim.reason}>{claim.reason}</TableCell>
                      <TableCell><Badge variant="outline">{claim.status}</Badge></TableCell>
                      {!isReadOnly ? <TableCell><Button size="sm" variant="outline" onClick={() => void handleClaimStatus(claim.id)}>Avanzar estado</Button></TableCell> : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sobrantes" className="mt-6 space-y-4">
          {!isReadOnly ? (
            <Card>
              <CardHeader>
                <CardTitle>Control de sobrantes</CardTitle>
                <CardDescription>Clasifica material reutilizable o desecho y permite reintegro de stock.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Select value={surplusDraft.materialId} onValueChange={(value) => setSurplusDraft((current) => ({ ...current, materialId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} value={surplusDraft.quantity} onChange={(event) => setSurplusDraft((current) => ({ ...current, quantity: event.target.value }))} />
                <Input placeholder="Origen" value={surplusDraft.origin} onChange={(event) => setSurplusDraft((current) => ({ ...current, origin: event.target.value }))} />
                <Select value={surplusDraft.classification} onValueChange={(value: SurplusClass) => setSurplusDraft((current) => ({ ...current, classification: value }))}>
                  <SelectTrigger><SelectValue placeholder="Clasificación" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reutilizable">Reutilizable</SelectItem>
                    <SelectItem value="desecho">Desecho</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="md:col-span-2 xl:col-span-4" onClick={() => void handleSurplusCreate()} disabled={saving}>Registrar sobrante</Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Listado de sobrantes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Estado</TableHead>
                    {!isReadOnly ? <TableHead>Acción</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surplus.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getMaterialName(item.materialId)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.origin}</TableCell>
                      <TableCell><Badge variant="outline">{item.classification}</Badge></TableCell>
                      <TableCell><Badge variant={item.reintegrated ? 'secondary' : 'default'}>{item.reintegrated ? 'Reingresado' : 'Pendiente'}</Badge></TableCell>
                      {!isReadOnly ? (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={item.classification !== 'reutilizable' || item.reintegrated} onClick={() => void handleSurplusReintegration(item.id)}>
                              Reingresar
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => void handleDeleteSurplus(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={newPurchaseOrderOpen} onOpenChange={setNewPurchaseOrderOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva orden de compra</DialogTitle>
            <DialogDescription>Orden normal para comprar un material sin crear una ubicación ni tocar stock mínimo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-2 md:grid-cols-2">
            <Field label="Proveedor">
              <Select value={manualOrderDraft.supplierId} onValueChange={(value) => setManualOrderDraft((current) => ({ ...current, supplierId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ítem">
              <Select value={manualOrderDraft.materialId} onValueChange={(value) => setManualOrderDraft((current) => ({ ...current, materialId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona ítem" /></SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cantidad">
              <Input type="number" min={1} value={manualOrderDraft.quantity} onChange={(event) => setManualOrderDraft((current) => ({ ...current, quantity: event.target.value }))} />
            </Field>
            <Field label="Precio unitario (Bs.)">
              <Input type="number" min={0} value={manualOrderDraft.unitPriceBs} onChange={(event) => setManualOrderDraft((current) => ({ ...current, unitPriceBs: event.target.value }))} />
            </Field>
            <Field label="Precio total final (Bs.)">
              <Input type="number" min={0} value={manualOrderDraft.totalPriceBs} onChange={(event) => setManualOrderDraft((current) => ({ ...current, totalPriceBs: event.target.value }))} placeholder={String(getManualOrderTotal())} />
            </Field>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Total estimado</p>
              <p className="mt-1 text-2xl font-bold">{formatBs(getManualOrderTotal())}</p>
            </div>
            <Field label="Notas">
              <Textarea value={manualOrderDraft.notes} onChange={(event) => setManualOrderDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Detalle de compra, condiciones o entrega..." />
            </Field>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => setNewPurchaseOrderOpen(false)}>Cancelar</Button>
              <Button onClick={handleRegisterManualOrder} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                Preparar orden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de material y trazabilidad</DialogTitle>
            <DialogDescription>Historial de precios, uso reciente y ubicación principal del material.</DialogDescription>
          </DialogHeader>
          {selectedMaterial ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-100">
                  <Image src={selectedMaterial.imageUrl || makeMockImage(selectedMaterial.name)} alt={selectedMaterial.name} fill className="object-cover" unoptimized />
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-lg font-semibold">{selectedMaterial.name}</p>
                  <p><span className="text-muted-foreground">Código:</span> {selectedMaterial.sku || 'Sin código'}</p>
                  <p><span className="text-muted-foreground">Proveedor:</span> {getSupplierName(selectedMaterial.supplierId)}</p>
                  <p><span className="text-muted-foreground">Ubicación:</span> {selectedMaterial.warehouse}</p>
                </div>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Proyectos recientes</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMaterial.recentUsage.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">Sin uso reciente registrado.</TableCell>
                        </TableRow>
                      ) : (
                        selectedMaterial.recentUsage.map((usage) => (
                          <TableRow key={`${usage.project}-${usage.date}`}>
                            <TableCell>{usage.project}</TableCell>
                            <TableCell>{usage.date}</TableCell>
                            <TableCell>{usage.quantity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Control de versiones de precio</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Precio Bs.</TableHead>
                        <TableHead>Tasa</TableHead>
                        <TableHead>Equivalente USD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...selectedMaterial.priceHistory].reverse().map((version, index) => (
                        <TableRow key={`${version.date}-${index}`}>
                          <TableCell>{version.date}</TableCell>
                          <TableCell>{formatBs(version.priceBs)}</TableCell>
                          <TableCell>{version.exchangeRate.toFixed(2)}</TableCell>
                          <TableCell>${(version.priceBs / Math.max(version.exchangeRate, 1)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar material</DialogTitle>
            <DialogDescription>Ajusta datos principales sin perder historial de precios.</DialogDescription>
          </DialogHeader>
          {editDraft ? (
            <div className="grid gap-4 pt-2 md:grid-cols-2">
              <Field label="Nombre"><Input value={editDraft.name} onChange={(event) => setEditDraft((current) => current ? { ...current, name: event.target.value } : current)} /></Field>
              <Field label="Código manual"><Input value={editDraft.sku} onChange={(event) => setEditDraft((current) => current ? { ...current, sku: event.target.value } : current)} placeholder="Ej. MEL-BLANCO-18" /></Field>
              <Field label="Categoría"><Input value={editDraft.category} onChange={(event) => setEditDraft((current) => current ? { ...current, category: event.target.value } : current)} list="inventory-category-options" /></Field>
              <Field label="Proveedor">
                <Select value={editDraft.supplierId} onValueChange={(value) => setEditDraft((current) => current ? { ...current, supplierId: value } : current)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unidad"><Input value={editDraft.unit} onChange={(event) => setEditDraft((current) => current ? { ...current, unit: event.target.value } : current)} /></Field>
              <Field label="Ubicación">
                <Select value={editDraft.warehouse} onValueChange={(value) => setEditDraft((current) => current ? { ...current, warehouse: value } : current)}>
                  <SelectTrigger><SelectValue placeholder="Elige ubicación" /></SelectTrigger>
                  <SelectContent>
                    {allWarehouses.map((warehouse) => (
                      <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Precio actual (Bs.)"><Input type="number" min={0} value={String(getCurrentPriceBs(editDraft))} onChange={(event) => setEditDraft((current) => current ? { ...current, priceHistory: [{ date: current.purchaseDate ?? toIsoDate(), priceBs: Number(event.target.value || 0), exchangeRate }] } : current)} /></Field>
              <Field label="Stock mínimo"><Input type="number" min={0} value={String(editDraft.minStock)} onChange={(event) => setEditDraft((current) => current ? { ...current, minStock: Number(event.target.value || 0) } : current)} /></Field>
              <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-3 md:col-span-2 md:grid-cols-[170px_1fr]">
                <div className="relative h-32 overflow-hidden rounded-xl border bg-background">
                  <Image src={editDraft.imageUrl || makeMockImage(editDraft.name || 'Material')} alt="Vista previa del material" fill className="object-cover" unoptimized />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Imagen del ítem</p>
                    <p className="text-xs text-muted-foreground">Actualiza desde galería, cámara móvil o un enlace externo.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ImagePicker label="Galería" icon={<ImageIcon className="h-4 w-4" />} onChange={(file) => void handleEditImageUpload(file)} />
                    <ImagePicker label="Cámara" icon={<Camera className="h-4 w-4" />} capture onChange={(file) => void handleEditImageUpload(file)} />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={editImageLink}
                        onChange={(event) => setEditImageLink(event.target.value)}
                        placeholder="Pegar enlace de imagen"
                        className="pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditDraft((current) => current ? { ...current, imageUrl: editImageLink.trim() } : current)}
                      disabled={!editImageLink.trim()}
                    >
                      Usar
                    </Button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItemOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={() => void handleMaterialUpdate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ImagePicker({
  label,
  icon,
  capture,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  capture?: boolean;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:border-[#d6a85a] hover:bg-[#d6a85a]/10">
      {icon}
      {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? 'environment' : undefined}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function OrderSuggestionCard({
  title,
  subtitle,
  quantity,
  supplierId,
  suppliers,
  tone = 'default',
  onSupplierChange,
  onDismiss,
}: {
  title: string;
  subtitle: string;
  quantity: string;
  supplierId: string;
  suppliers: SupplierRecord[];
  tone?: 'default' | 'amber';
  onSupplierChange: (supplierId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Card className={`border-border/70 p-4 shadow-sm ${tone === 'amber' ? 'bg-amber-50/70 dark:bg-amber-950/20' : 'bg-background'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <Badge variant="outline" className="mt-2 rounded-full bg-background/70">{quantity}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss}>
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3">
        <Select value={supplierId} onValueChange={onSupplierChange}>
          <SelectTrigger><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function SearchPicker({
  placeholder,
  search,
  selectedLabel,
  options,
  onSearch,
  onSelect,
}: {
  placeholder: string;
  search: string;
  selectedLabel: string;
  options: Array<{ id: string; label: string; helper?: string }>;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  const normalized = normalizeText(search);
  const visibleOptions = options
    .filter((option) => !normalized || normalizeText(`${option.label} ${option.helper ?? ''}`).includes(normalized))
    .slice(0, 6);

  return (
    <div className="space-y-2">
      <Input placeholder={placeholder} value={search} onChange={(event) => onSearch(event.target.value)} />
      <div className="rounded-xl border border-border bg-background p-2">
        <p className="mb-2 text-xs text-muted-foreground">Seleccionado: {selectedLabel}</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {visibleOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onSelect(option.id);
                onSearch(option.label);
              }}
            >
              <span className="truncate font-medium">{option.label}</span>
              {option.helper ? <span className="ml-2 truncate text-xs text-muted-foreground">{option.helper}</span> : null}
            </button>
          ))}
          {visibleOptions.length === 0 ? <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados.</p> : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-border/70 bg-background/80 p-4 shadow-none">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a85a]/15 text-[#9a6b2f]">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
