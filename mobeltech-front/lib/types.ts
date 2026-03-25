// Business entity types for MobelTech admin system

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  registrationDate: Date;
  status: 'active' | 'inactive';
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  status: 'quotation' | 'production' | 'delivered';
  startDate: Date;
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  budget: number;
  totalRevenue?: number;
}

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  dimensions: string;
  notes?: string;
}

export interface Quotation {
  id: string;
  clientId: string;
  projectId?: string;
  items: QuotationItem[];
  status: 'draft' | 'adjustment' | 'approved' | 'rejected';
  createdDate: Date;
  totalAmount: number;
  notes?: string;
}

export interface Measurement {
  id: string;
  clientId: string;
  date: Date;
  time: string;
  address: string;
  phone: string;
  referenceNotes?: string;
  furnitureItems: string[];
  quotationDeliveryDate?: Date;
  prequotationLink?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ProductionPhase {
  name: 'cortado' | 'canteado' | 'ensamblado' | 'instalacion' | 'entregado';
  completed: boolean;
  completedDate?: Date;
}

export interface ProductionItem {
  id: string;
  description: string;
  quantity: number;
  phases: ProductionPhase[];
  progress: number; // 0-100
}

export interface ProductionOrder {
  id: string;
  projectId: string;
  quotationId?: string;
  items: ProductionItem[];
  startDate: Date;
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  status: 'pending' | 'in-progress' | 'delayed' | 'completed';
  assignedContractorId?: string;
}

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  specialization: string;
  advances: {
    advance1: number;
    advance2?: number;
    advance3?: number;
    balance: number;
  };
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  productsProvided: string[];
  status: 'active' | 'inactive';
}

export interface Material {
  id: string;
  name: string;
  supplierId: string;
  unitPrice: number;
  stock: number;
  unit: string;
  lastPurchaseDate: Date;
  image?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  materials: {
    materialId: string;
    quantity: number;
    unitPrice: number;
  }[];
  status: 'pending' | 'received' | 'partial' | 'defective';
  createdDate: Date;
  receivedDate?: Date;
  totalAmount: number;
}

export interface StockMovement {
  id: string;
  materialId: string;
  type: 'entry' | 'exit' | 'return' | 'damage';
  quantity: number;
  projectId?: string;
  contractorId?: string;
  date: Date;
  notes?: string;
}

export interface WarehouseStock {
  materialId: string;
  available: number;
  reserved: number;
  realAvailable: number;
}

export interface ProjectFinance {
  projectId: string;
  ingresos: {
    advance1: number;
    advance2?: number;
    advance3?: number;
    total: number;
  };
  egresos: {
    materials: number;
    labor: number;
    total: number;
  };
  utilidad: number;
  utilidadPercentage: number;
}

export interface Invoice {
  id: string;
  projectId: string;
  clientId: string;
  amount: number;
  status: 'facturado' | 'sin-factura';
  issueDate: Date;
  dueDate?: Date;
  number: string;
}

export interface DashboardKPI {
  activeProjects: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
}

export interface MaterialRequestItem {
  materialId: string;
  quantity: number;
  notes?: string;
}

export interface MaterialRequest {
  id: string;
  contractorId: string;
  projectId?: string;
  items: MaterialRequestItem[];
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
  rejectionReason?: string;
  rejectionComments?: string;
}

export type ProductionPhaseType = 'corte' | 'canteado' | 'ensamblado' | 'instalacion' | 'entrega';

export interface SchedulePhase {
  phase: ProductionPhaseType;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ProjectSchedule {
  projectId: string;
  furnitureId: string;
  clientId: string;
  contractorId: string;
  furnitureName: string;
  clientName: string;
  contractorName: string;
  phases: SchedulePhase[];
}
