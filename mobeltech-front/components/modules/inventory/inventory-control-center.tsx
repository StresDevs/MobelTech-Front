'use client';

import Image from 'next/image';
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
  ClipboardList,
  FileText,
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

type InventoryOverview = {
  suppliers: SupplierRecord[];
  materials: MaterialRecord[];
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

function getSupplierScore(supplier: SupplierRecord) {
  const delayPenalty = Math.max(0, 100 - supplier.deliveryDelays * 12);
  const defectPenalty = Math.max(0, 100 - supplier.defectsRate * 20);
  const pricing = supplier.avgPriceCompetitiveness;
  return Math.round(delayPenalty * 0.4 + defectPenalty * 0.35 + pricing * 0.25);
}

export function InventoryControlCenter() {
  const { user } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(6.96);
  const [overview, setOverview] = useState<InventoryOverview>(EMPTY_OVERVIEW);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [globalOrderSearch, setGlobalOrderSearch] = useState('');
  const [stockOrderSearch, setStockOrderSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MaterialRecord | null>(null);

  const [supplierDraft, setSupplierDraft] = useState({
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
    warehouse: 'Almacén Central - La Paz',
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
  const requests = overview.requests;
  const defectAlerts = overview.defects;
  const returnClaims = overview.claims;
  const surplus = overview.surplus;
  const purchaseOrders = overview.purchaseOrders;

  const supplierRanking = useMemo(
    () => [...suppliers].sort((a, b) => getSupplierScore(b) - getSupplierScore(a)),
    [suppliers],
  );

  const allCategories = useMemo(() => Array.from(new Set(materials.map((m) => m.category))), [materials]);
  const allWarehouses = useMemo(() => Array.from(new Set(materials.map((m) => m.warehouse))), [materials]);

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
    const approvedRequests = requests.filter((request) => request.status === 'approved');
    const grouped = new Map<string, { supplierId: string; materialId: string; quantity: number }>();

    for (const request of approvedRequests) {
      for (const item of request.items) {
        const material = materials.find((entry) => entry.id === item.materialId);
        if (!material) continue;
        const key = `${material.supplierId}-${material.id}`;
        const current = grouped.get(key);
        if (current) current.quantity += item.quantity;
        else grouped.set(key, { supplierId: material.supplierId, materialId: material.id, quantity: item.quantity });
      }
    }

    return Array.from(grouped.values());
  }, [materials, requests]);

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
        throw new Error(body?.error || fallbackMessage);
      }
      return body as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSupplierCreate() {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierDraft),
      }),
      'No se pudo registrar el proveedor.',
    );

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

  async function handleMaterialCreate() {
    const created = await performMutation(
      fetch(`${apiBase}/api/inventory/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialDraft),
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
    await loadOverview();
  }

  function handleEditOpen(material: MaterialRecord) {
    setEditDraft({ ...material });
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
    setClaimDraft((current) => ({ ...current, purchaseOrderRef: '', reason: '' }));
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

  function handleGenerateGlobalOrder() {
    if (globalOrderSuggestions.length === 0) return;

    const groupedBySupplier = new Map<string, Array<{ materialName: string; quantity: number; estimatedCost: number }>>();

    for (const suggestion of globalOrderSuggestions) {
      const material = materials.find((entry) => entry.id === suggestion.materialId);
      if (!material) continue;
      const current = groupedBySupplier.get(suggestion.supplierId) ?? [];
      current.push({
        materialName: material.name,
        quantity: suggestion.quantity,
        estimatedCost: suggestion.quantity * getCurrentPriceBs(material),
      });
      groupedBySupplier.set(suggestion.supplierId, current);
    }

    const lines = Array.from(groupedBySupplier.entries()).map(([supplierId, entries]) => {
      const total = entries.reduce((sum, entry) => sum + entry.estimatedCost, 0);
      return `${getSupplierName(supplierId)}: ${entries.length} item(s) - ${formatBs(total)}`;
    });

    window.alert(`Orden global sugerida:\n\n${lines.join('\n')}`);
  }

  function handleGenerateStockOrder() {
    if (stockAlerts.length === 0) return;
    const lines = stockAlerts
      .map((alert) => {
        const material = materials.find((entry) => entry.id === alert.materialId);
        if (!material) return null;
        return `${material.name}: sugerido ${alert.suggestedQty} ${material.unit} - proveedor ${getSupplierName(material.supplierId)}`;
      })
      .filter(Boolean);

    window.alert(`Reabastecimiento sugerido:\n\n${lines.join('\n')}`);
  }

  if (loading) {
    return (
      <PageLoadingState
        title="Cargando inventario"
        description="Sincronizando materiales, proveedores, stock y trazabilidad..."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(255,255,255,0.96))] shadow-sm dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.18),rgba(22,22,22,0.98))]">
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6b2f]">Centro Inteligente</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Inventario y compras conectados</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Proveedores, stock, defectos, devoluciones y sobrantes ya están leyendo desde API y Neon.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Materiales" value={String(materials.length)} icon={<Package className="h-4 w-4" />} />
            <MetricCard label="Solicitudes pendientes" value={String(requests.filter((request) => request.status === 'pending').length)} icon={<ClipboardList className="h-4 w-4" />} />
            <MetricCard label="Stock bajo" value={String(stockAlerts.length)} icon={<AlertTriangle className="h-4 w-4" />} />
            <Card className="border-border/70 bg-background/80 p-4 shadow-none">
              <p className="text-xs text-muted-foreground">Tipo de cambio Bs/USD</p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={exchangeRate}
                  className="h-9"
                  onChange={(event) => setExchangeRate(Number(event.target.value) || 6.96)}
                />
                <Badge className="bg-[#d6a85a] text-[#1f1f1f]">Manual</Badge>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </Card>
      ) : null}

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
              <Select value={supplierDraft.supplierType} onValueChange={(value) => setSupplierDraft((current) => ({ ...current, supplierType: value }))}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madera">Madera</SelectItem>
                  <SelectItem value="Telas">Telas</SelectItem>
                  <SelectItem value="Herrajes">Herrajes</SelectItem>
                  <SelectItem value="Insumos">Insumos</SelectItem>
                </SelectContent>
              </Select>
              <div className="xl:col-span-3 flex justify-end">
                <Button onClick={() => void handleSupplierCreate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                  {saving ? 'Guardando...' : 'Registrar proveedor'}
                </Button>
              </div>
            </CardContent>
          </Card>

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
            <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
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
                  <Field label="SKU"><Input value={materialDraft.sku} onChange={(event) => setMaterialDraft((current) => ({ ...current, sku: event.target.value }))} /></Field>
                  <Field label="Categoría">
                    <Select value={materialDraft.category} onValueChange={(value) => setMaterialDraft((current) => ({ ...current, category: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Materia prima">Materia prima</SelectItem>
                        <SelectItem value="Herrajes">Herrajes</SelectItem>
                        <SelectItem value="Telas">Telas</SelectItem>
                        <SelectItem value="Insumos">Insumos</SelectItem>
                        <SelectItem value="Muebles">Muebles</SelectItem>
                        <SelectItem value="Equipos y Herramientas">Equipos y Herramientas</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Proveedor">
                    <Select value={materialDraft.supplierId} onValueChange={(value) => setMaterialDraft((current) => ({ ...current, supplierId: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Unidad"><Input value={materialDraft.unit} onChange={(event) => setMaterialDraft((current) => ({ ...current, unit: event.target.value }))} /></Field>
                  <Field label="Almacén"><Input value={materialDraft.warehouse} onChange={(event) => setMaterialDraft((current) => ({ ...current, warehouse: event.target.value }))} /></Field>
                  <Field label="Precio de compra (Bs.)"><Input type="number" min={0} value={materialDraft.purchasePriceBs} onChange={(event) => setMaterialDraft((current) => ({ ...current, purchasePriceBs: event.target.value }))} /></Field>
                  <Field label="Fecha de compra"><Input type="date" value={materialDraft.purchaseDate} onChange={(event) => setMaterialDraft((current) => ({ ...current, purchaseDate: event.target.value }))} /></Field>
                  <Field label="Stock inicial"><Input type="number" min={0} value={materialDraft.initialStock} onChange={(event) => setMaterialDraft((current) => ({ ...current, initialStock: event.target.value }))} /></Field>
                  <Field label="Stock mínimo"><Input type="number" min={0} value={materialDraft.minStock} onChange={(event) => setMaterialDraft((current) => ({ ...current, minStock: event.target.value }))} /></Field>
                  <div className="md:col-span-2">
                    <Field label="Imagen URL"><Input value={materialDraft.imageUrl} onChange={(event) => setMaterialDraft((current) => ({ ...current, imageUrl: event.target.value }))} /></Field>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddItemOpen(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={() => void handleMaterialCreate()} disabled={saving} style={{ backgroundColor: '#d6a85a', color: '#1f1f1f' }}>
                      {saving ? 'Guardando...' : 'Guardar ítem'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por descripción, SKU o categoría..." value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} />
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
                <SelectTrigger className="xl:w-72"><SelectValue placeholder="Almacén" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los almacenes</SelectItem>
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
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Und</TableHead>
                  <TableHead>Stock disp.</TableHead>
                  <TableHead>Valor USD</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No hay materiales con esos filtros.</TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const available = getAvailableStock(material);
                    const lowStock = available < material.minStock;
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-xl border bg-muted">
                              <Image
                                src={material.imageUrl || makeMockImage(material.name)}
                                alt={material.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">{material.sku}</p>
                              <p className="font-medium">{material.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{material.warehouse}</TableCell>
                        <TableCell><Badge variant="outline">{material.category}</Badge></TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell className={lowStock ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700'}>{available}</TableCell>
                        <TableCell>${getCurrentPriceUsd(material).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditOpen(material)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedMaterialId(material.id); setDetailOpen(true); }}><FileText className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => void handleDeleteMaterial(material.id)}><Trash2 className="h-4 w-4" /></Button>
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
                    <TableHead>Almacén</TableHead>
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
                    return (
                      <TableRow key={material.id} className={risk ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                        <TableCell>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">{material.sku}</p>
                        </TableCell>
                        <TableCell>{material.warehouse}</TableCell>
                        <TableCell>{material.stockPhysical}</TableCell>
                        <TableCell>{material.stockReserved}</TableCell>
                        <TableCell>{material.blockedByDefect}</TableCell>
                        <TableCell className={risk ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700'}>{available}</TableCell>
                        <TableCell>
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
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Orden global sugerida</CardTitle>
                <CardDescription>Consolida solicitudes aprobadas por proveedor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Buscar ítem..." value={globalOrderSearch} onChange={(event) => setGlobalOrderSearch(event.target.value)} />
                {globalOrderSuggestions
                  .filter((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    return !globalOrderSearch || normalizeText(material?.name ?? '').includes(normalizeText(globalOrderSearch)) || normalizeText(material?.sku ?? '').includes(normalizeText(globalOrderSearch));
                  })
                  .map((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    if (!material) return null;
                    return (
                      <div key={`${item.supplierId}-${item.materialId}`} className="rounded-xl border border-border p-3">
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">Proveedor sugerido: {getSupplierName(item.supplierId)}</p>
                        <p className="text-sm">Cantidad consolidada: {item.quantity}</p>
                      </div>
                    );
                  })}
                {globalOrderSuggestions.length === 0 ? <p className="text-sm text-muted-foreground">No hay solicitudes aprobadas para consolidar.</p> : null}
                <Button onClick={handleGenerateGlobalOrder} disabled={globalOrderSuggestions.length === 0}>
                  <FileText className="mr-1 h-4 w-4" />
                  Generar orden global
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reabastecimiento sugerido</CardTitle>
                <CardDescription>Materiales por debajo del mínimo configurado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Buscar ítem..." value={stockOrderSearch} onChange={(event) => setStockOrderSearch(event.target.value)} />
                {stockAlerts
                  .filter((alert) => {
                    const material = materials.find((entry) => entry.id === alert.materialId);
                    return !stockOrderSearch || normalizeText(material?.name ?? '').includes(normalizeText(stockOrderSearch)) || normalizeText(material?.sku ?? '').includes(normalizeText(stockOrderSearch));
                  })
                  .map((alert) => {
                    const material = materials.find((entry) => entry.id === alert.materialId);
                    if (!material) return null;
                    return (
                      <div key={alert.materialId} className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">Disponible: {getAvailableStock(material)} | Mínimo: {material.minStock}</p>
                        <p className="text-sm">Sugerido comprar: {alert.suggestedQty} {material.unit}</p>
                      </div>
                    );
                  })}
                {stockAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No hay materiales debajo del stock mínimo.</p> : null}
                <Button variant="secondary" onClick={handleGenerateStockOrder} disabled={stockAlerts.length === 0}>Generar sugerencia</Button>
              </CardContent>
            </Card>
          </div>

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay órdenes registradas.</TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.referenceCode}</TableCell>
                        <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{new Date(order.orderedAt).toLocaleDateString('es-BO')}</TableCell>
                        <TableCell>{order.items.length}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defectos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alarmas por material defectuoso</CardTitle>
              <CardDescription>Bloquea inventario y lleva el flujo del incidente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select value={defectDraft.materialId} onValueChange={(value) => setDefectDraft((current) => ({ ...current, materialId: value }))}>
                <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Tipo de defecto" value={defectDraft.defectType} onChange={(event) => setDefectDraft((current) => ({ ...current, defectType: event.target.value }))} />
              <Input type="number" min={1} value={defectDraft.affectedQuantity} onChange={(event) => setDefectDraft((current) => ({ ...current, affectedQuantity: event.target.value }))} />
              <Button onClick={() => void handleDefectCreate()} disabled={saving}>Registrar alarma</Button>
            </CardContent>
          </Card>

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
                    <TableHead>Acción</TableHead>
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
                      <TableCell><Button variant="outline" size="sm" onClick={() => void handleDefectStatusAdvance(alert.id)}>Avanzar flujo</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cambios" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de cambio / restitución</CardTitle>
              <CardDescription>Registro de devoluciones y reclamos con orden de compra asociada.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input placeholder="Orden de compra asociada" value={claimDraft.purchaseOrderRef} onChange={(event) => setClaimDraft((current) => ({ ...current, purchaseOrderRef: event.target.value }))} />
              <Select value={claimDraft.materialId} onValueChange={(value) => setClaimDraft((current) => ({ ...current, materialId: value }))}>
                <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea className="md:col-span-2" placeholder="Motivo del reclamo" value={claimDraft.reason} onChange={(event) => setClaimDraft((current) => ({ ...current, reason: event.target.value }))} />
              <Button className="md:col-span-2 xl:col-span-4" onClick={() => void handleClaimCreate()} disabled={saving}>Crear reclamo</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seguimiento de reclamos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OC asociada</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>{claim.purchaseOrderRef}</TableCell>
                      <TableCell>{getMaterialName(claim.materialId)}</TableCell>
                      <TableCell className="max-w-sm truncate" title={claim.reason}>{claim.reason}</TableCell>
                      <TableCell><Badge variant="outline">{claim.status}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => void handleClaimStatus(claim.id)}>Avanzar estado</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sobrantes" className="mt-6 space-y-4">
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
                    <TableHead>Acción</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <p><span className="text-muted-foreground">SKU:</span> {selectedMaterial.sku}</p>
                  <p><span className="text-muted-foreground">Proveedor:</span> {getSupplierName(selectedMaterial.supplierId)}</p>
                  <p><span className="text-muted-foreground">Ubicación:</span> {selectedMaterial.warehouse}</p>
                  <p><span className="text-muted-foreground">Stock físico/reservado/bloqueado:</span> {selectedMaterial.stockPhysical} / {selectedMaterial.stockReserved} / {selectedMaterial.blockedByDefect}</p>
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
              <Field label="SKU"><Input value={editDraft.sku} onChange={(event) => setEditDraft((current) => current ? { ...current, sku: event.target.value } : current)} /></Field>
              <Field label="Categoría"><Input value={editDraft.category} onChange={(event) => setEditDraft((current) => current ? { ...current, category: event.target.value } : current)} /></Field>
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
              <Field label="Almacén"><Input value={editDraft.warehouse} onChange={(event) => setEditDraft((current) => current ? { ...current, warehouse: event.target.value } : current)} /></Field>
              <Field label="Precio actual (Bs.)"><Input type="number" min={0} value={String(getCurrentPriceBs(editDraft))} onChange={(event) => setEditDraft((current) => current ? { ...current, priceHistory: [{ date: current.purchaseDate ?? toIsoDate(), priceBs: Number(event.target.value || 0), exchangeRate }] } : current)} /></Field>
              <Field label="Stock mínimo"><Input type="number" min={0} value={String(editDraft.minStock)} onChange={(event) => setEditDraft((current) => current ? { ...current, minStock: Number(event.target.value || 0) } : current)} /></Field>
              <div className="md:col-span-2">
                <Field label="Imagen URL"><Input value={editDraft.imageUrl} onChange={(event) => setEditDraft((current) => current ? { ...current, imageUrl: event.target.value } : current)} /></Field>
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
