'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Camera,
  ChevronDown,
  ClipboardList,
  FileText,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  Warehouse,
} from 'lucide-react';

type RequestPriority = 'alta' | 'media' | 'baja';
type RequestStatus = 'pendiente' | 'aprobado' | 'rechazado';
type DefectStatus = 'nuevo' | 'reportado' | 'en-gestion' | 'resuelto';
type ClaimStatus = 'abierto' | 'en-revision' | 'resuelto';
type SurplusClass = 'reutilizable' | 'desecho';

interface SupplierRecord {
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
}

interface PriceVersion {
  date: string;
  priceBs: number;
  exchangeRate: number;
}

interface MaterialRecord {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  supplierId: string;
  sku: string;
  unit: string;
  warehouse: string;
  purchaseDate: string;
  stockPhysical: number;
  stockReserved: number;
  blockedByDefect: number;
  minStock: number;
  priceHistory: PriceVersion[];
  recentUsage: { project: string; date: string; quantity: number }[];
}

interface MaterialRequestRecord {
  id: string;
  requester: string;
  materialId: string;
  quantity: number;
  date: string;
  priority: RequestPriority;
  status: RequestStatus;
}

interface DefectAlertRecord {
  id: string;
  materialId: string;
  defectType: string;
  affectedQuantity: number;
  supplierId: string;
  createdAt: string;
  status: DefectStatus;
  supplierReportSent: boolean;
}

interface ReturnClaimRecord {
  id: string;
  purchaseOrderRef: string;
  materialId: string;
  reason: string;
  status: ClaimStatus;
}

interface SurplusRecord {
  id: string;
  materialId: string;
  quantity: number;
  origin: string;
  classification: SurplusClass;
  reintegrated: boolean;
}

const INITIAL_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'supp-1',
    name: 'Maderas Selectas Bolivia',
    nit: '1029384018',
    phone: '+591 2 4444444',
    email: 'ventas@maderasselectas.bo',
    address: 'Zona Industrial, La Paz',
    supplierType: 'Madera',
    purchaseHistoryCount: 28,
    deliveryDelays: 2,
    defectsRate: 1.8,
    avgPriceCompetitiveness: 84,
    status: 'active',
  },
  {
    id: 'supp-2',
    name: 'Herrajes Andinos SRL',
    nit: '2398741201',
    phone: '+591 3 6666666',
    email: 'compras@herrajesandinos.bo',
    address: 'Parque Industrial, Santa Cruz',
    supplierType: 'Herrajes',
    purchaseHistoryCount: 34,
    deliveryDelays: 4,
    defectsRate: 2.1,
    avgPriceCompetitiveness: 88,
    status: 'active',
  },
  {
    id: 'supp-3',
    name: 'Textiles Premium BO',
    nit: '5546789921',
    phone: '+591 2 7777777',
    email: 'pedidos@textilespremium.bo',
    address: 'Zona Comercial, Cochabamba',
    supplierType: 'Telas',
    purchaseHistoryCount: 22,
    deliveryDelays: 1,
    defectsRate: 1.2,
    avgPriceCompetitiveness: 81,
    status: 'active',
  },
];

const INITIAL_MATERIALS: MaterialRecord[] = [
  {
    id: 'mat-1',
    name: 'Madera MDF 18mm',
    category: 'Materia prima',
    imageUrl: makeMockImage('Madera MDF 18mm', '#047857'),
    supplierId: 'supp-1',
    sku: 'MDF-18-001',
    unit: 'pliego',
    warehouse: 'Almacen Central - La Paz',
    purchaseDate: '2026-03-20',
    stockPhysical: 64,
    stockReserved: 22,
    blockedByDefect: 0,
    minStock: 25,
    priceHistory: [
      { date: '2026-01-10', priceBs: 410, exchangeRate: 6.96 },
      { date: '2026-02-15', priceBs: 430, exchangeRate: 6.95 },
      { date: '2026-03-20', priceBs: 450, exchangeRate: 6.96 },
    ],
    recentUsage: [
      { project: 'Proyecto Hotel Andino', date: '2026-03-25', quantity: 12 },
      { project: 'Oficinas Garcia', date: '2026-03-22', quantity: 9 },
      { project: 'Showroom Centro', date: '2026-03-16', quantity: 6 },
    ],
  },
  {
    id: 'mat-2',
    name: 'Bisagra Cazoleta 35mm',
    category: 'Herrajes',
    imageUrl: makeMockImage('Bisagra Cazoleta', '#1d4ed8'),
    supplierId: 'supp-2',
    sku: 'HER-BIS-035',
    unit: 'unidad',
    warehouse: 'Almacen Secundario - Santa Cruz',
    purchaseDate: '2026-03-18',
    stockPhysical: 420,
    stockReserved: 130,
    blockedByDefect: 15,
    minStock: 160,
    priceHistory: [
      { date: '2026-01-11', priceBs: 38, exchangeRate: 6.96 },
      { date: '2026-02-09', priceBs: 42, exchangeRate: 6.95 },
      { date: '2026-03-18', priceBs: 45, exchangeRate: 6.96 },
    ],
    recentUsage: [
      { project: 'Torres Empresariales', date: '2026-03-24', quantity: 75 },
      { project: 'Proyecto Hotel Andino', date: '2026-03-20', quantity: 40 },
      { project: 'Clinica Santa Maria', date: '2026-03-14', quantity: 32 },
    ],
  },
  {
    id: 'mat-3',
    name: 'Tela Tapiceria Premium',
    category: 'Telas',
    imageUrl: makeMockImage('Tela Tapiceria Premium', '#9333ea'),
    supplierId: 'supp-3',
    sku: 'TEL-TP-090',
    unit: 'metro',
    warehouse: 'Almacen Tapizados - Cochabamba',
    purchaseDate: '2026-03-21',
    stockPhysical: 190,
    stockReserved: 70,
    blockedByDefect: 0,
    minStock: 80,
    priceHistory: [
      { date: '2026-01-07', priceBs: 72, exchangeRate: 6.96 },
      { date: '2026-02-17', priceBs: 78, exchangeRate: 6.95 },
      { date: '2026-03-21', priceBs: 85, exchangeRate: 6.96 },
    ],
    recentUsage: [
      { project: 'Restaurant El Parador', date: '2026-03-26', quantity: 28 },
      { project: 'Salon Ejecutivos', date: '2026-03-18', quantity: 20 },
      { project: 'Proyecto Lobby Norte', date: '2026-03-11', quantity: 16 },
    ],
  },
];

const INITIAL_REQUESTS: MaterialRequestRecord[] = [
  {
    id: 'req-1',
    requester: 'Carlos Mamani',
    materialId: 'mat-1',
    quantity: 8,
    date: '2026-03-27',
    priority: 'alta',
    status: 'pendiente',
  },
  {
    id: 'req-2',
    requester: 'Ana Rojas',
    materialId: 'mat-2',
    quantity: 42,
    date: '2026-03-26',
    priority: 'media',
    status: 'aprobado',
  },
];

const INITIAL_DEFECT_ALERTS: DefectAlertRecord[] = [
  {
    id: 'def-1',
    materialId: 'mat-2',
    defectType: 'Oxidacion prematura',
    affectedQuantity: 15,
    supplierId: 'supp-2',
    createdAt: '2026-03-24',
    status: 'reportado',
    supplierReportSent: true,
  },
];

const INITIAL_RETURN_CLAIMS: ReturnClaimRecord[] = [
  {
    id: 'ret-1',
    purchaseOrderRef: 'PO-2026-118',
    materialId: 'mat-2',
    reason: 'Lote defectuoso reportado en linea de ensamblado',
    status: 'en-revision',
  },
];

const INITIAL_SURPLUS: SurplusRecord[] = [
  {
    id: 'sur-1',
    materialId: 'mat-1',
    quantity: 7,
    origin: 'Produccion Proyecto Hotel Andino',
    classification: 'reutilizable',
    reintegrated: false,
  },
  {
    id: 'sur-2',
    materialId: 'mat-3',
    quantity: 4,
    origin: 'Compra en exceso lote febrero',
    classification: 'desecho',
    reintegrated: false,
  },
];

const requesterSuggestions = ['Carlos Mamani', 'Ana Rojas', 'Diego Flores', 'Maria Villca'];

const formatBs = (amount: number) => `Bs. ${amount.toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;

const toIsoDate = () => new Date().toISOString().slice(0, 10);

function makeMockImage(label: string, tone: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="${tone}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="60" y="60" width="1080" height="680" rx="36" fill="rgba(255,255,255,0.14)"/><text x="600" y="390" text-anchor="middle" fill="white" font-family="Verdana, sans-serif" font-size="52" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const getSupplierScore = (supplier: SupplierRecord) => {
  const delayPenalty = Math.max(0, 100 - supplier.deliveryDelays * 12);
  const defectPenalty = Math.max(0, 100 - supplier.defectsRate * 20);
  const pricing = supplier.avgPriceCompetitiveness;
  const score = delayPenalty * 0.4 + defectPenalty * 0.35 + pricing * 0.25;
  return Math.round(score);
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function InventoryControlCenter() {
  const [exchangeRate, setExchangeRate] = useState(6.96);

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(INITIAL_SUPPLIERS);
  const [materials, setMaterials] = useState<MaterialRecord[]>(INITIAL_MATERIALS);
  const [requests, setRequests] = useState<MaterialRequestRecord[]>(INITIAL_REQUESTS);
  const [defectAlerts, setDefectAlerts] = useState<DefectAlertRecord[]>(INITIAL_DEFECT_ALERTS);
  const [returnClaims, setReturnClaims] = useState<ReturnClaimRecord[]>(INITIAL_RETURN_CLAIMS);
  const [surplus, setSurplus] = useState<SurplusRecord[]>(INITIAL_SURPLUS);

  const [supplierFormError, setSupplierFormError] = useState('');
  const [materialFormError, setMaterialFormError] = useState('');
  const [requestError, setRequestError] = useState('');

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MaterialRecord | null>(null);
  const [editFormError, setEditFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');

  const materialImageInputRef = useRef<HTMLInputElement>(null);

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
    supplierId: INITIAL_SUPPLIERS[0]?.id ?? '',
    sku: '',
    unit: 'unidad',
    warehouse: 'Almacen Central - La Paz',
    purchaseDate: toIsoDate(),
    purchasePriceBs: '0',
    initialStock: '0',
    minStock: '0',
    imageUrl: '',
  });

  const [requestDraft, setRequestDraft] = useState({
    requester: requesterSuggestions[0],
    materialId: INITIAL_MATERIALS[0]?.id ?? '',
    quantity: '1',
    priority: 'media' as RequestPriority,
  });

  const [defectDraft, setDefectDraft] = useState({
    materialId: INITIAL_MATERIALS[1]?.id ?? INITIAL_MATERIALS[0]?.id ?? '',
    defectType: '',
    affectedQuantity: '1',
  });

  const [claimDraft, setClaimDraft] = useState({
    purchaseOrderRef: '',
    materialId: INITIAL_MATERIALS[0]?.id ?? '',
    reason: '',
  });

  const [surplusDraft, setSurplusDraft] = useState({
    materialId: INITIAL_MATERIALS[0]?.id ?? '',
    quantity: '1',
    origin: '',
    classification: 'reutilizable' as SurplusClass,
  });

  const supplierRanking = useMemo(
    () => [...suppliers].sort((a, b) => getSupplierScore(b) - getSupplierScore(a)),
    [suppliers],
  );

  const allCategories = useMemo(() => Array.from(new Set(materials.map((m) => m.category))), [materials]);
  const allWarehouses = useMemo(() => Array.from(new Set(materials.map((m) => m.warehouse))), [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = normalizeText(searchQuery);
      const matchSearch =
        q === '' ||
        normalizeText(m.name).includes(q) ||
        normalizeText(m.sku).includes(q) ||
        normalizeText(m.category).includes(q);
      const matchCategory = filterCategory === 'all' || m.category === filterCategory;
      const matchWarehouse = filterWarehouse === 'all' || m.warehouse === filterWarehouse;
      return matchSearch && matchCategory && matchWarehouse;
    });
  }, [materials, searchQuery, filterCategory, filterWarehouse]);

  const stockAlerts = useMemo(
    () =>
      materials
        .filter((material) => material.stockPhysical - material.stockReserved - material.blockedByDefect < material.minStock)
        .map((material) => ({
          materialId: material.id,
          suggestedQty: Math.max(material.minStock * 2 - (material.stockPhysical - material.stockReserved), 1),
        })),
    [materials],
  );

  const globalOrderSuggestions = useMemo(() => {
    const approvedRequests = requests.filter((request) => request.status === 'aprobado');
    const grouped: Record<
      string,
      {
        supplierId: string;
        materialId: string;
        quantity: number;
      }
    > = {};

    for (const request of approvedRequests) {
      const material = materials.find((entry) => entry.id === request.materialId);
      if (!material) continue;
      const key = `${material.supplierId}-${material.id}`;
      if (!grouped[key]) {
        grouped[key] = {
          supplierId: material.supplierId,
          materialId: material.id,
          quantity: 0,
        };
      }
      grouped[key].quantity += request.quantity;
    }

    return Object.values(grouped);
  }, [materials, requests]);

  const selectedMaterial = useMemo(
    () => materials.find((entry) => entry.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
  );

  const getMaterialName = (materialId: string) =>
    materials.find((entry) => entry.id === materialId)?.name ?? 'Material no encontrado';

  const getSupplierName = (supplierId: string) =>
    suppliers.find((entry) => entry.id === supplierId)?.name ?? 'Proveedor no encontrado';

  const getCurrentPriceBs = (material: MaterialRecord) =>
    material.priceHistory[material.priceHistory.length - 1]?.priceBs ?? 0;

  const getCurrentPriceUsd = (material: MaterialRecord) => getCurrentPriceBs(material) / exchangeRate;

  const getAvailableStock = (material: MaterialRecord) =>
    material.stockPhysical - material.stockReserved - material.blockedByDefect;

  const handleSupplierCreate = () => {
    const duplicate = suppliers.some(
      (supplier) =>
        normalizeText(supplier.name) === normalizeText(supplierDraft.name) || supplier.nit.trim() === supplierDraft.nit.trim(),
    );

    if (duplicate) {
      setSupplierFormError('Ya existe un proveedor con el mismo nombre o NIT.');
      return;
    }

    setSuppliers((current) => [
      ...current,
      {
        id: `supp-${current.length + 1}`,
        name: supplierDraft.name.trim(),
        nit: supplierDraft.nit.trim(),
        phone: supplierDraft.phone.trim(),
        email: supplierDraft.email.trim(),
        address: supplierDraft.address.trim(),
        supplierType: supplierDraft.supplierType,
        purchaseHistoryCount: 0,
        deliveryDelays: 0,
        defectsRate: 0,
        avgPriceCompetitiveness: 75,
        status: 'active',
      },
    ]);

    setSupplierDraft({
      name: '',
      nit: '',
      phone: '',
      email: '',
      address: '',
      supplierType: 'Madera',
    });
    setSupplierFormError('');
  };

  const handleEditOpen = (material: MaterialRecord) => {
    setEditDraft({ ...material });
    setEditFormError('');
    setEditItemOpen(true);
  };

  const handleMaterialUpdate = () => {
    if (!editDraft) return;
    const priceBs = getCurrentPriceBs(editDraft);
    const minStock = editDraft.minStock;
    if (!editDraft.name.trim() || !editDraft.sku.trim()) {
      setEditFormError('Nombre y SKU son obligatorios.');
      return;
    }
    const skuExists = materials.some(
      (m) => normalizeText(m.sku) === normalizeText(editDraft.sku) && m.id !== editDraft.id,
    );
    if (skuExists) {
      setEditFormError('El SKU ya existe en otro ítem.');
      return;
    }
    if (!Number.isFinite(minStock) || minStock <= 0) {
      setEditFormError('El stock mínimo debe ser mayor a 0.');
      return;
    }
    setMaterials((prev) =>
      prev.map((m) => (m.id === editDraft.id ? { ...editDraft } : m)),
    );
    setEditItemOpen(false);
    setEditDraft(null);
    setEditFormError('');
  };

  const handleMaterialCreate = () => {
    const priceBs = Number(materialDraft.purchasePriceBs);
    const initialStock = Number(materialDraft.initialStock);
    const minStock = Number(materialDraft.minStock);

    const skuExists = materials.some((material) => normalizeText(material.sku) === normalizeText(materialDraft.sku));

    if (skuExists) {
      setMaterialFormError('El SKU ya existe. Debe ser unico.');
      return;
    }

    if (!Number.isFinite(priceBs) || !Number.isFinite(initialStock) || !Number.isFinite(minStock)) {
      setMaterialFormError('Precio, stock inicial y stock minimo deben ser valores numericos validos.');
      return;
    }

    setMaterials((current) => [
      ...current,
      {
        id: `mat-${current.length + 1}`,
        name: materialDraft.name.trim(),
        category: materialDraft.category,
        imageUrl:
          materialDraft.imageUrl.trim() ||
          makeMockImage(materialDraft.name.trim() || 'Nuevo Material', '#0f766e'),
        supplierId: materialDraft.supplierId,
        sku: materialDraft.sku.trim(),
        unit: materialDraft.unit.trim(),
        warehouse: materialDraft.warehouse.trim(),
        purchaseDate: materialDraft.purchaseDate,
        stockPhysical: initialStock,
        stockReserved: 0,
        blockedByDefect: 0,
        minStock,
        priceHistory: [
          {
            date: materialDraft.purchaseDate,
            priceBs,
            exchangeRate,
          },
        ],
        recentUsage: [],
      },
    ]);

    setMaterialDraft((current) => ({
      ...current,
      name: '',
      sku: '',
      purchasePriceBs: '0',
      initialStock: '0',
      minStock: '0',
      imageUrl: '',
    }));
    setMaterialFormError('');
  };

  const handleMaterialImageUpdate = (materialId: string, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMaterials((current) =>
      current.map((material) => (material.id === materialId ? { ...material, imageUrl: url } : material)),
    );
  };

  const handleRequestCreate = () => {
    const material = materials.find((entry) => entry.id === requestDraft.materialId);
    if (!material) return;

    const quantity = Number(requestDraft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRequestError('La cantidad debe ser mayor a 0.');
      return;
    }

    if (quantity > getAvailableStock(material)) {
      setRequestError('No hay stock disponible suficiente para esta solicitud.');
      return;
    }

    setRequests((current) => [
      {
        id: `req-${current.length + 1}`,
        requester: requestDraft.requester,
        materialId: requestDraft.materialId,
        quantity,
        date: toIsoDate(),
        priority: requestDraft.priority,
        status: 'pendiente',
      },
      ...current,
    ]);

    setRequestDraft((current) => ({ ...current, quantity: '1' }));
    setRequestError('');
  };

  const handleRequestStatus = (requestId: string, status: RequestStatus) => {
    const request = requests.find((entry) => entry.id === requestId);
    if (!request) return;

    if (status === 'aprobado') {
      setMaterials((current) =>
        current.map((material) =>
          material.id === request.materialId
            ? {
                ...material,
                stockReserved: material.stockReserved + request.quantity,
              }
            : material,
        ),
      );
    }

    setRequests((current) =>
      current.map((entry) => (entry.id === requestId ? { ...entry, status } : entry)),
    );
  };

  const handleAddStock = (materialId: string, quantityToAdd: number, newPriceBs?: number) => {
    setMaterials((current) =>
      current.map((material) => {
        if (material.id !== materialId) return material;
        const nextHistory = [...material.priceHistory];
        if (newPriceBs && Number.isFinite(newPriceBs)) {
          nextHistory.push({ date: toIsoDate(), priceBs: newPriceBs, exchangeRate });
        }
        return {
          ...material,
          stockPhysical: material.stockPhysical + quantityToAdd,
          purchaseDate: toIsoDate(),
          priceHistory: nextHistory,
        };
      }),
    );
  };

  const handleMinStockChange = (materialId: string, minStock: number) => {
    setMaterials((current) =>
      current.map((material) => (material.id === materialId ? { ...material, minStock } : material)),
    );
  };

  const handleDefectCreate = () => {
    const quantity = Number(defectDraft.affectedQuantity);
    const material = materials.find((entry) => entry.id === defectDraft.materialId);
    if (!material || !Number.isFinite(quantity) || quantity <= 0) return;

    setDefectAlerts((current) => [
      {
        id: `def-${current.length + 1}`,
        materialId: defectDraft.materialId,
        defectType: defectDraft.defectType || 'Defecto no especificado',
        affectedQuantity: quantity,
        supplierId: material.supplierId,
        createdAt: toIsoDate(),
        status: 'nuevo',
        supplierReportSent: true,
      },
      ...current,
    ]);

    setMaterials((current) =>
      current.map((entry) =>
        entry.id === defectDraft.materialId
          ? {
              ...entry,
              blockedByDefect: entry.blockedByDefect + quantity,
            }
          : entry,
      ),
    );

    setDefectDraft((current) => ({ ...current, defectType: '', affectedQuantity: '1' }));
  };

  const handleDefectStatusAdvance = (defectId: string) => {
    setDefectAlerts((current) =>
      current.map((defect) => {
        if (defect.id !== defectId) return defect;
        if (defect.status === 'nuevo') return { ...defect, status: 'reportado' };
        if (defect.status === 'reportado') return { ...defect, status: 'en-gestion' };
        if (defect.status === 'en-gestion') return { ...defect, status: 'resuelto' };
        return defect;
      }),
    );
  };

  const handleClaimCreate = () => {
    if (!claimDraft.purchaseOrderRef.trim() || !claimDraft.reason.trim()) return;

    setReturnClaims((current) => [
      {
        id: `ret-${current.length + 1}`,
        purchaseOrderRef: claimDraft.purchaseOrderRef.trim(),
        materialId: claimDraft.materialId,
        reason: claimDraft.reason.trim(),
        status: 'abierto',
      },
      ...current,
    ]);

    setClaimDraft({
      purchaseOrderRef: '',
      materialId: claimDraft.materialId,
      reason: '',
    });
  };

  const handleClaimStatus = (claimId: string) => {
    setReturnClaims((current) =>
      current.map((claim) => {
        if (claim.id !== claimId) return claim;
        if (claim.status === 'abierto') return { ...claim, status: 'en-revision' };
        if (claim.status === 'en-revision') return { ...claim, status: 'resuelto' };
        return claim;
      }),
    );
  };

  const handleSurplusCreate = () => {
    const quantity = Number(surplusDraft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !surplusDraft.origin.trim()) return;

    setSurplus((current) => [
      {
        id: `sur-${current.length + 1}`,
        materialId: surplusDraft.materialId,
        quantity,
        origin: surplusDraft.origin.trim(),
        classification: surplusDraft.classification,
        reintegrated: false,
      },
      ...current,
    ]);

    setSurplusDraft((current) => ({ ...current, quantity: '1', origin: '' }));
  };

  const handleSurplusReintegration = (surplusId: string) => {
    const item = surplus.find((entry) => entry.id === surplusId);
    if (!item || item.classification !== 'reutilizable' || item.reintegrated) return;

    setMaterials((current) =>
      current.map((material) =>
        material.id === item.materialId
          ? { ...material, stockPhysical: material.stockPhysical + item.quantity }
          : material,
      ),
    );

    setSurplus((current) =>
      current.map((entry) => (entry.id === surplusId ? { ...entry, reintegrated: true } : entry)),
    );
  };

  const handleGenerateGlobalOrder = () => {
    if (globalOrderSuggestions.length === 0) return;

    const groupedBySupplier: Record<string, { materialName: string; quantity: number; estimatedCost: number }[]> = {};

    for (const suggestion of globalOrderSuggestions) {
      const material = materials.find((entry) => entry.id === suggestion.materialId);
      if (!material) continue;
      if (!groupedBySupplier[suggestion.supplierId]) {
        groupedBySupplier[suggestion.supplierId] = [];
      }
      groupedBySupplier[suggestion.supplierId].push({
        materialName: material.name,
        quantity: suggestion.quantity,
        estimatedCost: suggestion.quantity * getCurrentPriceBs(material),
      });
    }

    const lines = Object.entries(groupedBySupplier)
      .map(([supplierId, entries]) => {
        const supplier = getSupplierName(supplierId);
        const total = entries.reduce((acc, entry) => acc + entry.estimatedCost, 0);
        return `${supplier}: ${entries.length} item(s) - ${formatBs(total)}`;
      })
      .join('\n');

    window.alert(`Orden global generada con consolidacion por proveedor:\n\n${lines}`);
  };

  const handleGenerateStockOrder = () => {
    if (stockAlerts.length === 0) return;

    const lines = stockAlerts
      .map((alert) => {
        const material = materials.find((entry) => entry.id === alert.materialId);
        if (!material) return null;
        return `${material.name}: sugerido ${alert.suggestedQty} ${material.unit} - proveedor ${getSupplierName(material.supplierId)}`;
      })
      .filter(Boolean)
      .join('\n');

    window.alert(`Ordenes automaticas para reabastecimiento (stock < minimo):\n\n${lines}`);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-foreground">Centro Inteligente de Inventario</CardTitle>
          <CardDescription className="text-muted-foreground">
            Gestion integral de proveedores, catalogo, stock, solicitudes, compras y calidad. Moneda principal: Bolivianos (Bs.)
          </CardDescription>
          <div className="h-1.5 w-40 rounded-full bg-primary" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 pb-6 md:grid-cols-4">
          <Card className="border-border bg-muted/30 p-4 shadow-none">
            <p className="text-sm text-muted-foreground">Materiales</p>
            <p className="text-2xl font-semibold">{materials.length}</p>
          </Card>
          <Card className="border-border bg-muted/30 p-4 shadow-none">
            <p className="text-sm text-muted-foreground">Solicitudes pendientes</p>
            <p className="text-2xl font-semibold">{requests.filter((request) => request.status === 'pendiente').length}</p>
          </Card>
          <Card className="border-border bg-muted/30 p-4 shadow-none">
            <p className="text-sm text-muted-foreground">Alertas por stock bajo</p>
            <p className="text-2xl font-semibold">{stockAlerts.length}</p>
          </Card>
          <Card className="border-border bg-muted/30 p-4 shadow-none">
            <p className="text-sm text-muted-foreground">Tipo de cambio Bs/USD</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={exchangeRate}
                className="h-8"
                onChange={(event) => setExchangeRate(Number(event.target.value) || 6.96)}
              />
              <Badge className="bg-primary text-primary-foreground">Manual</Badge>
            </div>
          </Card>
        </CardContent>
      </Card>

      <Tabs defaultValue="proveedores" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="proveedores" className="gap-1 text-xs">
            <Store className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="productos" className="gap-1 text-xs">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
         
          <TabsTrigger value="stock" className="gap-1 text-xs">
            <Warehouse className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-1 text-xs">
            <ShoppingCart className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="defectos" className="gap-1 text-xs">
            <AlertTriangle className="h-4 w-4" />
            Defectos
          </TabsTrigger>
          <TabsTrigger value="cambios" className="gap-1 text-xs">
            <ArrowLeftRight className="h-4 w-4" />
            Restitucion
          </TabsTrigger>
          <TabsTrigger value="sobrantes" className="gap-1 text-xs">
            <Boxes className="h-4 w-4" />
            Sobrantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proveedores" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-4 w-4" />
                Registro de Proveedores
              </CardTitle>
              <CardDescription>
                Sin duplicados por nombre/NIT, con historial de compras y ranking automatico por desempeno.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="Nombre / razon social"
                value={supplierDraft.name}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                placeholder="NIT / identificacion"
                value={supplierDraft.nit}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, nit: event.target.value }))}
              />
              <Input
                placeholder="Telefono"
                value={supplierDraft.phone}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, phone: event.target.value }))}
              />
              <Input
                placeholder="Email"
                value={supplierDraft.email}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                placeholder="Direccion"
                value={supplierDraft.address}
                onChange={(event) => setSupplierDraft((current) => ({ ...current, address: event.target.value }))}
              />
              <Select
                value={supplierDraft.supplierType}
                onValueChange={(value) => setSupplierDraft((current) => ({ ...current, supplierType: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madera">Madera</SelectItem>
                  <SelectItem value="Telas">Telas</SelectItem>
                  <SelectItem value="Herrajes">Herrajes</SelectItem>
                  <SelectItem value="Insumos">Insumos</SelectItem>
                </SelectContent>
              </Select>
              <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
                <Button onClick={handleSupplierCreate}>Registrar proveedor</Button>
                {supplierFormError ? <p className="text-sm text-red-600">{supplierFormError}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ranking automatico de proveedores</CardTitle>
              <CardDescription>
                Score en base a retrasos, defectos y competitividad de precios. Mejores opciones sugeridas para compra global.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Historial compras</TableHead>
                    <TableHead>Calidad</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRanking.map((supplier) => {
                    const score = getSupplierScore(supplier);
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">NIT {supplier.nit}</p>
                        </TableCell>
                        <TableCell>{supplier.supplierType}</TableCell>
                        <TableCell>{supplier.purchaseHistoryCount} ordenes</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span>{Math.max(1, Math.round((100 - supplier.defectsRate * 10) / 20))}/5</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{score}/100</p>
                            <Progress value={score} />
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

        <TabsContent value="productos" className="mt-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ítems Inventario</h2>
              <p className="text-sm text-muted-foreground">{filteredMaterials.length} ítem{filteredMaterials.length !== 1 ? 's' : ''} registrado{filteredMaterials.length !== 1 ? 's' : ''}</p>
            </div>
            <Dialog open={addItemOpen} onOpenChange={(open) => { setAddItemOpen(open); if (!open) setMaterialFormError(''); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                  <Plus className="h-4 w-4" />
                  Agregar Ítem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar nuevo ítem al inventario</DialogTitle>
                  <DialogDescription>
                    SKU único por item. El stock mínimo es configurable por material para alertas personalizadas.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nombre del producto</label>
                    <Input
                      placeholder="Ej. Madera MDF 18mm"
                      value={materialDraft.name}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, name: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">SKU / Código único</label>
                    <Input
                      placeholder="Ej. MDF-18-001"
                      value={materialDraft.sku}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, sku: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categoría</label>
                    <Select
                      value={materialDraft.category}
                      onValueChange={(value) => setMaterialDraft((c) => ({ ...c, category: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sofa">Sofá</SelectItem>
                        <SelectItem value="Mesa">Mesa</SelectItem>
                        <SelectItem value="Materia prima">Materia prima</SelectItem>
                        <SelectItem value="Herrajes">Herrajes</SelectItem>
                        <SelectItem value="Telas">Telas</SelectItem>
                        <SelectItem value="Muebles">Muebles</SelectItem>
                        <SelectItem value="Equipos y Herramientas">Equipos y Herramientas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Proveedor</label>
                    <Select
                      value={materialDraft.supplierId}
                      onValueChange={(value) => setMaterialDraft((c) => ({ ...c, supplierId: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Proveedor asociado" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Unidad de medida</label>
                    <Input
                      placeholder="Ej. pza, metro, galón"
                      value={materialDraft.unit}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, unit: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Almacén</label>
                    <Input
                      placeholder="Ej. Almacen Central - La Paz"
                      value={materialDraft.warehouse}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, warehouse: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Precio de compra (Bs.)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={materialDraft.purchasePriceBs}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, purchasePriceBs: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fecha de compra</label>
                    <Input
                      type="date"
                      value={materialDraft.purchaseDate}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, purchaseDate: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Stock inicial</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={materialDraft.initialStock}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, initialStock: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Stock mínimo (alerta personalizada)</label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="25"
                      value={materialDraft.minStock}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, minStock: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">URL de imagen (opcional)</label>
                    <Input
                      placeholder="https://... o dejar vacío para imagen autogenerada"
                      value={materialDraft.imageUrl}
                      onChange={(event) => setMaterialDraft((c) => ({ ...c, imageUrl: event.target.value }))}
                    />
                  </div>

                  {materialFormError ? (
                    <p className="text-sm text-red-600 md:col-span-2">{materialFormError}</p>
                  ) : null}

                  <div className="flex gap-3 md:col-span-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        handleMaterialCreate();
                        if (!materialFormError) setAddItemOpen(false);
                      }}
                    >
                      Guardar ítem
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setAddItemOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, ítem n° o descripción..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Todos los almacenes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los almacenes</SelectItem>
                  {allWarehouses.map((wh) => (
                    <SelectItem key={wh} value={wh}>
                      {wh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 font-semibold">n°</TableHead>
                  <TableHead className="font-semibold">Ítem</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold">Categoría</TableHead>
                  <TableHead className="font-semibold">Und</TableHead>
                  <TableHead className="font-semibold">Stock</TableHead>
                  <TableHead className="font-semibold">Rendimiento</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      No se encontraron ítems con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material, idx) => {
                    const available = getAvailableStock(material);
                    const lowStock = available < material.minStock;
                    const rendimiento = Math.min(
                      100,
                      Math.round((available / Math.max(material.minStock * 2, 1)) * 100),
                    );
                    return (
                      <TableRow key={material.id} className="group">
                        <TableCell className="text-muted-foreground font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border bg-muted">
                              <Image
                                src={material.imageUrl}
                                alt={material.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <span className="font-mono text-sm font-semibold">{material.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium uppercase tracking-wide">{material.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {material.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{material.unit}</TableCell>
                        <TableCell>
                          <span
                            className={
                              lowStock
                                ? 'font-semibold text-red-500'
                                : 'font-semibold text-emerald-600'
                            }
                          >
                            {available}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={rendimiento}
                              className={`h-2 w-20 ${lowStock ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                            />
                            <span className="text-xs text-muted-foreground">{rendimiento}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Subir / tomar foto"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                setSelectedMaterialId(material.id);
                                materialImageInputRef.current?.click();
                              }}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              className="text-blue-500 hover:text-blue-600"
                              onClick={() => handleEditOpen(material)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalle"
                              onClick={() => {
                                setSelectedMaterialId(material.id);
                                setDetailOpen(true);
                              }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              className="text-red-500 hover:text-red-600"
                              onClick={() =>
                                setMaterials((prev) => prev.filter((m) => m.id !== material.id))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          <input
            ref={materialImageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) =>
              handleMaterialImageUpdate(selectedMaterialId ?? '', event.target.files?.[0] ?? null)
            }
          />

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogTrigger className="hidden" />
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detalle de material y trazabilidad</DialogTitle>
                <DialogDescription>
                  Proyectos recientes en los que se uso y ubicacion exacta de almacen, mas historial de precios.
                </DialogDescription>
              </DialogHeader>

              {selectedMaterial ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg bg-slate-100">
                      <Image src={selectedMaterial.imageUrl} alt={selectedMaterial.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-lg font-semibold">{selectedMaterial.name}</p>
                      <p>
                        <span className="text-muted-foreground">SKU:</span> {selectedMaterial.sku}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Proveedor:</span> {getSupplierName(selectedMaterial.supplierId)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Ubicacion:</span> {selectedMaterial.warehouse}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Stock fisico/reservado/bloqueado:</span>{' '}
                        {selectedMaterial.stockPhysical} / {selectedMaterial.stockReserved} / {selectedMaterial.blockedByDefect}
                      </p>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Proyectos recientes donde fue usado</CardTitle>
                    </CardHeader>
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
                          {selectedMaterial.recentUsage.length > 0 ? (
                            selectedMaterial.recentUsage.map((usage) => (
                              <TableRow key={`${usage.project}-${usage.date}`}>
                                <TableCell>{usage.project}</TableCell>
                                <TableCell>{usage.date}</TableCell>
                                <TableCell>{usage.quantity}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                Sin uso reciente registrado.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Control de versiones de precio</CardTitle>
                    </CardHeader>
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
                              <TableCell>${(version.priceBs / version.exchangeRate).toFixed(2)}</TableCell>
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

          {/* Edit Item Modal */}
          <Dialog open={editItemOpen} onOpenChange={(open) => { setEditItemOpen(open); if (!open) { setEditDraft(null); setEditFormError(''); } }}>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar ítem de inventario</DialogTitle>
                <DialogDescription>
                  Modifica los datos del material. El historial de precios se conserva; cambia el último precio si aplica.
                </DialogDescription>
              </DialogHeader>
              {editDraft ? (
                <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nombre del producto</label>
                    <Input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, name: e.target.value } : d)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">SKU / Código único</label>
                    <Input
                      value={editDraft.sku}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, sku: e.target.value } : d)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categoría</label>
                    <Select
                      value={editDraft.category}
                      onValueChange={(v) => setEditDraft((d) => d ? { ...d, category: v } : d)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sofa">Sofá</SelectItem>
                        <SelectItem value="Mesa">Mesa</SelectItem>
                        <SelectItem value="Materia prima">Materia prima</SelectItem>
                        <SelectItem value="Herrajes">Herrajes</SelectItem>
                        <SelectItem value="Telas">Telas</SelectItem>
                        <SelectItem value="Muebles">Muebles</SelectItem>
                        <SelectItem value="Equipos y Herramientas">Equipos y Herramientas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Proveedor</label>
                    <Select
                      value={editDraft.supplierId}
                      onValueChange={(v) => setEditDraft((d) => d ? { ...d, supplierId: v } : d)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Unidad de medida</label>
                    <Input
                      value={editDraft.unit}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, unit: e.target.value } : d)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Almacén</label>
                    <Input
                      value={editDraft.warehouse}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, warehouse: e.target.value } : d)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Precio actual (Bs.)</label>
                    <Input
                      type="number"
                      min={0}
                      value={editDraft.priceHistory[editDraft.priceHistory.length - 1]?.priceBs ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isFinite(val)) return;
                        setEditDraft((d) => {
                          if (!d) return d;
                          const hist = [...d.priceHistory];
                          if (hist.length > 0) {
                            hist[hist.length - 1] = { ...hist[hist.length - 1], priceBs: val };
                          }
                          return { ...d, priceHistory: hist };
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Stock mínimo (alerta)</label>
                    <Input
                      type="number"
                      min={1}
                      value={editDraft.minStock}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, minStock: Number(e.target.value) } : d)}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">URL de imagen</label>
                    <Input
                      value={editDraft.imageUrl}
                      onChange={(e) => setEditDraft((d) => d ? { ...d, imageUrl: e.target.value } : d)}
                    />
                  </div>

                  {editFormError ? (
                    <p className="text-sm text-red-600 md:col-span-2">{editFormError}</p>
                  ) : null}

                  <div className="flex gap-3 md:col-span-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleMaterialUpdate}
                    >
                      Guardar cambios
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setEditItemOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </TabsContent>

       

        <TabsContent value="stock" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verificacion de Stock en tiempo real</CardTitle>
              <CardDescription>
                Diferencia stock fisico, reservado y bloqueado. Permite umbral minimo por material y alerta predictiva de agotamiento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Almacen</TableHead>
                    <TableHead>Fisico</TableHead>
                    <TableHead>Reservado</TableHead>
                    <TableHead>Bloqueado</TableHead>
                    <TableHead>Disponible</TableHead>
                    <TableHead>Minimo</TableHead>
                    <TableHead>Configurar minimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => {
                    const available = getAvailableStock(material);
                    const risk = available <= material.minStock;
                    return (
                      <TableRow key={material.id} className={risk ? 'bg-red-50/60' : ''}>
                        <TableCell>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">{material.sku}</p>
                        </TableCell>
                        <TableCell>{material.warehouse}</TableCell>
                        <TableCell>{material.stockPhysical}</TableCell>
                        <TableCell>{material.stockReserved}</TableCell>
                        <TableCell>{material.blockedByDefect}</TableCell>
                        <TableCell>
                          <span className={risk ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>{available}</span>
                        </TableCell>
                        <TableCell>{material.minStock}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            defaultValue={material.minStock}
                            className="h-8 w-28"
                            onBlur={(event) => {
                              const next = Number(event.target.value);
                              if (Number.isFinite(next) && next > 0) {
                                handleMinStockChange(material.id, next);
                              }
                            }}
                          />
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generacion de Orden de Compra Global</CardTitle>
                <CardDescription>
                  Consolidacion de solicitudes aprobadas por proveedor para optimizar costos y reducir fragmentacion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {globalOrderSuggestions.length > 0 ? (
                  globalOrderSuggestions.map((item) => {
                    const material = materials.find((entry) => entry.id === item.materialId);
                    if (!material) return null;
                    return (
                      <div key={`${item.supplierId}-${item.materialId}`} className="rounded-lg border p-3">
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Proveedor sugerido: {getSupplierName(item.supplierId)} | Cantidad consolidada: {item.quantity}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No hay solicitudes aprobadas para consolidar.</p>
                )}
                <Button onClick={handleGenerateGlobalOrder} disabled={globalOrderSuggestions.length === 0}>
                  <FileText className="mr-1 h-4 w-4" />
                  Generar orden global
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orden de Compra para Reabastecimiento</CardTitle>
                <CardDescription>
                  Disparo automatico si stock disponible cae por debajo del minimo personalizado por material.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stockAlerts.length > 0 ? (
                  stockAlerts.map((alert) => {
                    const material = materials.find((entry) => entry.id === alert.materialId);
                    if (!material) return null;
                    return (
                      <div key={alert.materialId} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Disponible: {getAvailableStock(material)} | Minimo: {material.minStock}
                        </p>
                        <p className="text-sm">Sugerido comprar: {alert.suggestedQty} {material.unit}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No hay materiales debajo del stock minimo.</p>
                )}
                <Button variant="secondary" onClick={handleGenerateStockOrder} disabled={stockAlerts.length === 0}>
                  Generar ordenes automaticas
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="defectos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alarmas por Material Defectuoso</CardTitle>
              <CardDescription>
                Bloqueo inmediato en inventario, alerta automatica y reporte al proveedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Select
                value={defectDraft.materialId}
                onValueChange={(value) => setDefectDraft((current) => ({ ...current, materialId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Tipo de defecto"
                value={defectDraft.defectType}
                onChange={(event) => setDefectDraft((current) => ({ ...current, defectType: event.target.value }))}
              />
              <Input
                type="number"
                min={1}
                value={defectDraft.affectedQuantity}
                onChange={(event) => setDefectDraft((current) => ({ ...current, affectedQuantity: event.target.value }))}
                placeholder="Cantidad afectada"
              />
              <Button onClick={handleDefectCreate}>Registrar alarma</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de alertas</CardTitle>
            </CardHeader>
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
                    <TableHead>Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defectAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{getMaterialName(alert.materialId)}</TableCell>
                      <TableCell>{alert.defectType}</TableCell>
                      <TableCell>{alert.affectedQuantity}</TableCell>
                      <TableCell>{getSupplierName(alert.supplierId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.supplierReportSent ? 'secondary' : 'destructive'}>
                          {alert.supplierReportSent ? 'Enviado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleDefectStatusAdvance(alert.id)}>
                          Avanzar flujo
                        </Button>
                      </TableCell>
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
              <CardTitle>Gestion de Cambio / Restitucion</CardTitle>
              <CardDescription>
                Registro de devoluciones por orden de compra asociada y seguimiento de reclamos hasta resolucion.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Orden de compra asociada"
                value={claimDraft.purchaseOrderRef}
                onChange={(event) => setClaimDraft((current) => ({ ...current, purchaseOrderRef: event.target.value }))}
              />

              <Select
                value={claimDraft.materialId}
                onValueChange={(value) => setClaimDraft((current) => ({ ...current, materialId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                className="md:col-span-2"
                placeholder="Motivo del reclamo"
                value={claimDraft.reason}
                onChange={(event) => setClaimDraft((current) => ({ ...current, reason: event.target.value }))}
              />

              <Button className="md:col-span-2 lg:col-span-4" onClick={handleClaimCreate}>
                Crear reclamo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguimiento de reclamos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OC asociada</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>{claim.purchaseOrderRef}</TableCell>
                      <TableCell>{getMaterialName(claim.materialId)}</TableCell>
                      <TableCell className="max-w-sm truncate" title={claim.reason}>
                        {claim.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{claim.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleClaimStatus(claim.id)}>
                          Avanzar estado
                        </Button>
                      </TableCell>
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
              <CardTitle>Control de Sobrantes</CardTitle>
              <CardDescription>
                Clasifica sobrantes reutilizables o desecho. Permite reingreso al inventario para material recuperable.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Select
                value={surplusDraft.materialId}
                onValueChange={(value) => setSurplusDraft((current) => ({ ...current, materialId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                value={surplusDraft.quantity}
                onChange={(event) => setSurplusDraft((current) => ({ ...current, quantity: event.target.value }))}
                placeholder="Cantidad sobrante"
              />

              <Input
                placeholder="Origen"
                value={surplusDraft.origin}
                onChange={(event) => setSurplusDraft((current) => ({ ...current, origin: event.target.value }))}
              />

              <Select
                value={surplusDraft.classification}
                onValueChange={(value: SurplusClass) =>
                  setSurplusDraft((current) => ({ ...current, classification: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Clasificacion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reutilizable">Reutilizable</SelectItem>
                  <SelectItem value="desecho">Desecho</SelectItem>
                </SelectContent>
              </Select>

              <Button className="md:col-span-2 lg:col-span-4" onClick={handleSurplusCreate}>
                Registrar sobrante
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listado de sobrantes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Clasificacion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surplus.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getMaterialName(item.materialId)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.origin}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.classification}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.reintegrated ? 'secondary' : 'default'}>
                          {item.reintegrated ? 'Reingresado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={item.classification !== 'reutilizable' || item.reintegrated}
                            onClick={() => handleSurplusReintegration(item.id)}
                          >
                            Reingresar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSurplus((current) => current.filter((entry) => entry.id !== item.id))}
                          >
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
    </div>
  );
}
