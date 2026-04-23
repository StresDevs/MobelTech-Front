import {
  User,
  Client,
  Project,
  Quotation,
  ProductionOrder,
  Contractor,
  Supplier,
  Material,
  PurchaseOrder,
  StockMovement,
  Measurement,
  Invoice,
  ProjectFinance,
  MaterialRequest,
  ProjectSchedule,
  ClientProjectPaymentPlan,
  ContractorProjectPaymentPlan,
  FinancePaymentRecord,
  FinanceChangeLog,
  FinanceBalanceSummary,
  FinanceHistoryFilter,
  DateRangePreset,
} from './types';

// Demo user
export const DEMO_USER: User = {
  id: 'user-1',
  name: 'Juan Pérez',
  email: 'juan@mobeltech.com',
  role: 'admin',
  avatar: '👤',
};

// Clients
export const CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Empresa García S.A.',
    phone: '+591-2-1234567',
    email: 'contacto@empresagarcia.com',
    address: 'Calle Principal 123, La Paz',
    registrationDate: new Date('2026-01-15'),
    status: 'active',
  },
  {
    id: 'client-2',
    name: 'Oficinas López',
    phone: '+591-2-7654321',
    email: 'info@oficinaslopez.com',
    address: 'Avenida Comercial 456, La Paz',
    registrationDate: new Date('2026-02-20'),
    status: 'active',
  },
  {
    id: 'client-3',
    name: 'Restaurante El Parador',
    phone: '+591-2-9876543',
    email: 'reservas@elparador.com',
    address: 'Plaza Principal 789, Cochabamba',
    registrationDate: new Date('2026-03-10'),
    status: 'active',
  },
  {
    id: 'client-4',
    name: 'Hotel Andino',
    phone: '+591-3-5555555',
    email: 'gerencia@hotelandi.com',
    address: 'Zona Turística, Santa Cruz',
    registrationDate: new Date('2026-04-01'),
    status: 'active',
  },
  {
    id: 'client-5',
    name: 'Centro Médico San Lucas',
    phone: '+591-2-3333333',
    email: 'admin@cmsl.com',
    address: 'Zona Médica, La Paz',
    registrationDate: new Date('2026-01-30'),
    status: 'active',
  },
];

// Projects
export const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Mueblería - Empresa García',
    clientId: 'client-1',
    status: 'production',
    startDate: new Date('2026-05-01'),
    estimatedDeliveryDate: new Date('2026-06-15'),
    budget: 45000,
    totalRevenue: 45000,
  },
  {
    id: 'proj-2',
    name: 'Oficinas - López',
    clientId: 'client-2',
    status: 'quotation',
    startDate: new Date('2026-05-10'),
    estimatedDeliveryDate: new Date('2026-07-01'),
    budget: 32000,
  },
  {
    id: 'proj-3',
    name: 'Mobiliario Restaurante - El Parador',
    clientId: 'client-3',
    status: 'production',
    startDate: new Date('2026-04-20'),
    estimatedDeliveryDate: new Date('2026-06-30'),
    actualDeliveryDate: new Date('2026-06-28'),
    budget: 28000,
    totalRevenue: 28000,
  },
  {
    id: 'proj-4',
    name: 'Habitaciones - Hotel Andino',
    clientId: 'client-4',
    status: 'delivered',
    startDate: new Date('2026-03-15'),
    estimatedDeliveryDate: new Date('2026-05-30'),
    actualDeliveryDate: new Date('2026-05-25'),
    budget: 55000,
    totalRevenue: 55000,
  },
];

// Quotations
export const QUOTATIONS: Quotation[] = [
  {
    id: 'quote-1',
    clientId: 'client-1',
    projectId: 'proj-1',
    status: 'approved',
    items: [
      {
        id: 'item-1',
        description: 'Escritorio Ejecutivo',
        quantity: 2,
        unitPrice: 8000,
        dimensions: '1.2m x 0.6m x 0.75m',
      },
      {
        id: 'item-2',
        description: 'Sillas Ergonómicas',
        quantity: 4,
        unitPrice: 3500,
        dimensions: '0.6m x 0.6m x 1.0m',
      },
    ],
    createdDate: new Date('2026-04-20'),
    totalAmount: 30000,
  },
  {
    id: 'quote-2',
    clientId: 'client-2',
    projectId: 'proj-2',
    status: 'draft',
    items: [
      {
        id: 'item-3',
        description: 'Mostrador Recepción',
        quantity: 1,
        unitPrice: 12000,
        dimensions: '2.0m x 0.8m x 1.1m',
      },
    ],
    createdDate: new Date('2026-05-08'),
    totalAmount: 12000,
  },
  {
    id: 'quote-3',
    clientId: 'client-3',
    projectId: 'proj-3',
    status: 'approved',
    items: [
      {
        id: 'item-4',
        description: 'Mesas de Comedor',
        quantity: 4,
        unitPrice: 5000,
        dimensions: '1.2m x 1.2m x 0.75m',
      },
    ],
    createdDate: new Date('2026-04-15'),
    totalAmount: 20000,
  },
];

// Measurements
export const MEASUREMENTS: Measurement[] = [
  {
    id: 'meas-1',
    clientId: 'client-1',
    date: new Date('2026-04-07'),
    time: '09:00',
    address: 'Calle Principal 123, La Paz',
    phone: '+591-2-1234567',
    referenceNotes: 'Primer piso, entrada por puerta principal. Estacionar en la calle frente al edificio.',
    furnitureItems: ['Escritorio Ejecutivo', 'Sillas Ergonómicas'],
    quotationDeliveryDate: new Date('2026-04-13'),
    prequotationLink: '/prequotations',
    status: 'completed',
  },
  {
    id: 'meas-2',
    clientId: 'client-2',
    date: new Date('2026-04-10'),
    time: '10:00',
    address: 'Avenida Comercial 456, La Paz',
    phone: '+591-2-7654321',
    referenceNotes: 'Oficina administrativa, 3er piso. Llamar al llegar.',
    furnitureItems: ['Escritorios', 'Estanterías', 'Mesas de reunión'],
    quotationDeliveryDate: new Date('2026-04-18'),
    prequotationLink: '/prequotations',
    status: 'scheduled',
  },
  {
    id: 'meas-3',
    clientId: 'client-3',
    date: new Date('2026-04-10'),
    time: '14:00',
    address: 'Plaza Principal 789, Cochabamba',
    phone: '+591-2-9876543',
    referenceNotes: 'Zona de comedor. Contactar con gerencia. Entrada trasera.',
    furnitureItems: ['Mesas de Comedor', 'Sillas para Restaurante', 'Barra'],
    quotationDeliveryDate: new Date('2026-04-22'),
    prequotationLink: '/prequotations',
    status: 'scheduled',
  },
  {
    id: 'meas-4',
    clientId: 'client-4',
    date: new Date('2026-04-15'),
    time: '09:00',
    address: 'Zona Turística, Santa Cruz',
    phone: '+591-3-5555555',
    referenceNotes: 'Habitaciones de huéspedes. Coordinador de mantenimiento presente.',
    furnitureItems: ['Camas', 'Armarios', 'Mesas de Noche'],
    quotationDeliveryDate: new Date('2026-04-25'),
    prequotationLink: '/prequotations',
    status: 'scheduled',
  },
  {
    id: 'meas-5',
    clientId: 'client-5',
    date: new Date('2026-04-15'),
    time: '14:00',
    address: 'Zona Médica, La Paz',
    phone: '+591-2-3333333',
    referenceNotes: 'Área de espera. Entrada por recepción principal.',
    furnitureItems: ['Sillas de Espera', 'Escritorio Recepción', 'Estanterías Médicas'],
    quotationDeliveryDate: new Date('2026-04-28'),
    prequotationLink: '/prequotations',
    status: 'scheduled',
  },
];

// Contractors
export const CONTRACTORS: Contractor[] = [
  {
    id: 'contr-1',
    name: 'Carlos Mamani',
    phone: '+591-2-1111111',
    email: 'carlos@carpinteria.com',
    status: 'active',
    specialization: 'Carpintería y Ensamblado',
    advances: {
      advance1: 15000,
      advance2: 15000,
      balance: 5000,
    },
  },
  {
    id: 'contr-2',
    name: 'Roberto Villarroel',
    phone: '+591-2-2222222',
    email: 'roberto@instalaciones.com',
    status: 'active',
    specialization: 'Instalación y Acabados',
    advances: {
      advance1: 8000,
      advance2: 8000,
      balance: 4000,
    },
  },
  {
    id: 'contr-3',
    name: 'Arturo Condori',
    phone: '+591-2-3333333',
    email: 'arturo@acabados.com',
    status: 'active',
    specialization: 'Tapizado y Acabados',
    advances: {
      advance1: 5000,
      balance: 5000,
    },
  },
];

// Production Orders
export const PRODUCTION_ORDERS: ProductionOrder[] = [
  {
    id: 'po-1',
    projectId: 'proj-1',
    quotationId: 'quote-1',
    startDate: new Date('2026-05-01'),
    estimatedDeliveryDate: new Date('2026-06-15'),
    assignedContractorId: 'contr-1',
    status: 'in-progress',
    items: [
      {
        id: 'pitem-1',
        description: 'Escritorio Ejecutivo',
        quantity: 2,
        progress: 60,
        phases: [
          { name: 'cortado', completed: true,         completedDate: new Date('2026-05-05') },
          { name: 'canteado', completed: true,         completedDate: new Date('2026-05-07') },
          { name: 'ensamblado', completed: true,         completedDate: new Date('2026-05-08') },
          { name: 'instalacion', completed: false },
          { name: 'entregado', completed: false },
        ],
      },
      {
        id: 'pitem-2',
        description: 'Sillas Ergonómicas',
        quantity: 4,
        progress: 40,
        phases: [
          { name: 'cortado', completed: true,         completedDate: new Date('2026-05-06') },
          { name: 'canteado', completed: false },
          { name: 'ensamblado', completed: false },
          { name: 'instalacion', completed: false },
          { name: 'entregado', completed: false },
        ],
      },
    ],
  },
  {
    id: 'po-2',
    projectId: 'proj-3',
    quotationId: 'quote-3',
    startDate: new Date('2026-04-20'),
    estimatedDeliveryDate: new Date('2026-06-30'),
    actualDeliveryDate: new Date('2026-06-28'),
    assignedContractorId: 'contr-2',
    status: 'completed',
    items: [
      {
        id: 'pitem-3',
        description: 'Mesas de Comedor',
        quantity: 4,
        progress: 100,
        phases: [
          { name: 'cortado', completed: true,         completedDate: new Date('2026-04-25') },
          { name: 'canteado', completed: true,         completedDate: new Date('2026-04-28') },
          { name: 'ensamblado', completed: true,         completedDate: new Date('2026-05-05') },
          { name: 'instalacion', completed: true,         completedDate: new Date('2026-06-20') },
          { name: 'entregado', completed: true,         completedDate: new Date('2026-06-28') },
        ],
      },
    ],
  },
];

// Suppliers
export const SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1',
    name: 'Maderas Selectas Bolivia',
    phone: '+591-2-4444444',
    email: 'ventas@maderasbolivia.com',
    address: 'Zona Industrial La Paz',
    productsProvided: ['Madera MDF', 'Madera OSB', 'Tableros'],
    status: 'active',
  },
  {
    id: 'supp-2',
    name: 'Herrajes y Accesorios SA',
    phone: '+591-3-6666666',
    email: 'info@herrajes.com',
    address: 'Parque Industrial Santa Cruz',
    productsProvided: ['Bisagras', 'Cerraduras', 'Manillas', 'Ruedas'],
    status: 'active',
  },
  {
    id: 'supp-3',
    name: 'Telas y Tapicería',
    phone: '+591-2-7777777',
    email: 'pedidos@telastapiceria.com',
    address: 'Zona Comercial La Paz',
    productsProvided: ['Tela Tapicería', 'Espuma', 'Adhesivos'],
    status: 'active',
  },
  {
    id: 'supp-4',
    name: 'Pinturas Industriales Plus',
    phone: '+591-4-8888888',
    email: 'comercial@pinturasplus.com',
    address: 'Distribuidor Nacional',
    productsProvided: ['Pintura Base', 'Pintura Sintética', 'Barniz'],
    status: 'active',
  },
];

// Materials
export const MATERIALS: Material[] = [
  {
    id: 'mat-1',
    name: 'Madera MDF 18mm',
    supplierId: 'supp-1',
    unitPrice: 450,
    stock: 45,
    unit: 'pliego',
    lastPurchaseDate: new Date('2026-05-01'),
  },
  {
    id: 'mat-2',
    name: 'Madera OSB 12mm',
    supplierId: 'supp-1',
    unitPrice: 280,
    stock: 60,
    unit: 'pliego',
    lastPurchaseDate: new Date('2026-04-25'),
  },
  {
    id: 'mat-3',
    name: 'Bisagras Cromadas',
    supplierId: 'supp-2',
    unitPrice: 45,
    stock: 200,
    unit: 'unidad',
    lastPurchaseDate: new Date('2026-05-02'),
  },
  {
    id: 'mat-4',
    name: 'Cerraduras Seguridad',
    supplierId: 'supp-2',
    unitPrice: 120,
    stock: 30,
    unit: 'unidad',
    lastPurchaseDate: new Date('2026-04-30'),
  },
  {
    id: 'mat-5',
    name: 'Tela Tapicería Premium',
    supplierId: 'supp-3',
    unitPrice: 85,
    stock: 150,
    unit: 'metro',
    lastPurchaseDate: new Date('2026-04-28'),
  },
  {
    id: 'mat-6',
    name: 'Espuma Poliuretano 5cm',
    supplierId: 'supp-3',
    unitPrice: 55,
    stock: 80,
    unit: 'pliego',
    lastPurchaseDate: new Date('2026-05-01'),
  },
  {
    id: 'mat-7',
    name: 'Pintura Sintética Color',
    supplierId: 'supp-4',
    unitPrice: 120,
    stock: 50,
    unit: 'galón',
    lastPurchaseDate: new Date('2026-04-15'),
  },
  {
    id: 'mat-8',
    name: 'Barniz Poliuretano',
    supplierId: 'supp-4',
    unitPrice: 95,
    stock: 35,
    unit: 'galón',
    lastPurchaseDate: new Date('2026-04-20'),
  },
];

// Purchase Orders
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'puo-1',
    supplierId: 'supp-1',
    status: 'received',
    createdDate: new Date('2026-04-28'),
    receivedDate: new Date('2026-05-01'),
    materials: [
      { materialId: 'mat-1', quantity: 50, unitPrice: 450 },
      { materialId: 'mat-2', quantity: 60, unitPrice: 280 },
    ],
    totalAmount: 39300,
  },
  {
    id: 'puo-2',
    supplierId: 'supp-2',
    status: 'pending',
    createdDate: new Date('2026-05-05'),
    materials: [
      { materialId: 'mat-3', quantity: 200, unitPrice: 45 },
      { materialId: 'mat-4', quantity: 30, unitPrice: 120 },
    ],
    totalAmount: 12600,
  },
];

// Stock Movements
export const STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    materialId: 'mat-1',
    type: 'entry',
    quantity: 50,
    date: new Date('2026-05-01'),
    notes: 'Compra a Maderas Selectas',
  },
  {
    id: 'mov-2',
    materialId: 'mat-1',
    type: 'exit',
    quantity: 5,
    projectId: 'proj-1',
    date: new Date('2026-05-02'),
  },
  {
    id: 'mov-3',
    materialId: 'mat-3',
    type: 'entry',
    quantity: 200,
    date: new Date('2026-05-02'),
    notes: 'Compra a Herrajes y Accesorios',
  },
  {
    id: 'mov-4',
    materialId: 'mat-5',
    type: 'exit',
    quantity: 15,
    projectId: 'proj-3',
    date: new Date('2026-04-25'),
  },
  {
    id: 'mov-5',
    materialId: 'mat-2',
    type: 'damage',
    quantity: 2,
    date: new Date('2026-05-03'),
    notes: 'Planchas dañadas en almacén',
  },
];

// Invoices
export const INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    projectId: 'proj-1',
    clientId: 'client-1',
    amount: 30000,
    status: 'facturado',
    issueDate: new Date('2026-05-05'),
    dueDate: new Date('2026-06-05'),
    number: 'INV-2026-001',
  },
  {
    id: 'inv-2',
    projectId: 'proj-3',
    clientId: 'client-3',
    amount: 20000,
    status: 'facturado',
    issueDate: new Date('2026-04-30'),
    dueDate: new Date('2026-05-30'),
    number: 'INV-2026-002',
  },
  {
    id: 'inv-3',
    projectId: 'proj-4',
    clientId: 'client-4',
    amount: 55000,
    status: 'facturado',
    issueDate: new Date('2026-05-28'),
    dueDate: new Date('2026-06-28'),
    number: 'INV-2026-003',
  },
];

// Project Finances
export const PROJECT_FINANCES: ProjectFinance[] = [
  {
    projectId: 'proj-1',
    ingresos: {
      advance1: 15000,
      advance2: 15000,
      advance3: 15000,
      total: 45000,
    },
    egresos: {
      materials: 18000,
      labor: 20000,
      total: 38000,
    },
    utilidad: 7000,
    utilidadPercentage: 15.56,
  },
  {
    projectId: 'proj-3',
    ingresos: {
      advance1: 10000,
      advance2: 10000,
      total: 20000,
    },
    egresos: {
      materials: 8000,
      labor: 9000,
      total: 17000,
    },
    utilidad: 3000,
    utilidadPercentage: 15,
  },
  {
    projectId: 'proj-4',
    ingresos: {
      advance1: 18000,
      advance2: 18000,
      advance3: 19000,
      total: 55000,
    },
    egresos: {
      materials: 22000,
      labor: 25000,
      total: 47000,
    },
    utilidad: 8000,
    utilidadPercentage: 14.55,
  },
];

// Material Requests
export const MATERIAL_REQUESTS: MaterialRequest[] = [
  {
    id: 'mreq-1',
    contractorId: 'contr-1',
    projectId: 'proj-1',
    status: 'pending',
    requestDate: new Date('2026-03-08'),
    items: [
      { materialId: 'mat-1', quantity: 10, notes: 'Para escritorios' },
      { materialId: 'mat-3', quantity: 20, notes: 'Para ensamblado' },
    ],
  },
  {
    id: 'mreq-2',
    contractorId: 'contr-2',
    projectId: 'proj-3',
    status: 'approved',
    requestDate: new Date('2026-03-05'),
    items: [
      { materialId: 'mat-5', quantity: 25, notes: 'Tela para tapizado' },
      { materialId: 'mat-6', quantity: 5, notes: 'Espuma de relleno' },
    ],
  },
  {
    id: 'mreq-3',
    contractorId: 'contr-3',
    projectId: 'proj-1',
    status: 'rejected',
    requestDate: new Date('2026-03-01'),
    rejectionReason: 'Cantidad excesiva',
    rejectionComments: 'Se solicitó demasiada cantidad de tela. Por favor solicitar 15 metros en lugar de 40.',
    items: [
      { materialId: 'mat-5', quantity: 40, notes: 'Demasiado solicitado' },
    ],
  },
];

// Project Schedules (Cronograma Gantt)
export const PROJECT_SCHEDULES: ProjectSchedule[] = [
  {
    projectId: 'proj-1',
    furnitureId: 'furn-1',
    clientId: 'client-1',
    contractorId: 'contr-1',
    furnitureName: 'Ropero Moderno',
    clientName: 'García López',
    contractorName: 'Carlos Mamani',
    phases: [
      {
        phase: 'corte',
        plannedStart: new Date('2026-03-10'),
        plannedEnd: new Date('2026-03-13'),
        actualStart: new Date('2026-03-10'),
        actualEnd: new Date('2026-03-12'),
        status: 'completed',
      },
      {
        phase: 'canteado',
        plannedStart: new Date('2026-03-14'),
        plannedEnd: new Date('2026-03-17'),
        actualStart: new Date('2026-03-13'),
        actualEnd: new Date('2026-03-16'),
        status: 'completed',
      },
      {
        phase: 'ensamblado',
        plannedStart: new Date('2026-03-18'),
        plannedEnd: new Date('2026-03-22'),
        actualStart: new Date('2026-03-17'),
        actualEnd: undefined,
        status: 'in-progress',
      },
      {
        phase: 'instalacion',
        plannedStart: new Date('2026-03-25'),
        plannedEnd: new Date('2026-03-27'),
        status: 'pending',
      },
      {
        phase: 'entrega',
        plannedStart: new Date('2026-03-28'),
        plannedEnd: new Date('2026-03-28'),
        status: 'pending',
      },
    ],
  },
  {
    projectId: 'proj-2',
    furnitureId: 'furn-2',
    clientId: 'client-2',
    contractorId: 'contr-2',
    furnitureName: 'Escritorio Ejecutivo',
    clientName: 'Empresa García',
    contractorName: 'Juan Pérez',
    phases: [
      {
        phase: 'corte',
        plannedStart: new Date('2026-03-08'),
        plannedEnd: new Date('2026-03-10'),
        actualStart: new Date('2026-03-08'),
        actualEnd: new Date('2026-03-10'),
        status: 'completed',
      },
      {
        phase: 'canteado',
        plannedStart: new Date('2026-03-11'),
        plannedEnd: new Date('2026-03-13'),
        actualStart: new Date('2026-03-11'),
        actualEnd: new Date('2026-03-13'),
        status: 'completed',
      },
      {
        phase: 'ensamblado',
        plannedStart: new Date('2026-03-14'),
        plannedEnd: new Date('2026-03-16'),
        actualStart: new Date('2026-03-14'),
        actualEnd: new Date('2026-03-15'),
        status: 'completed',
      },
      {
        phase: 'instalacion',
        plannedStart: new Date('2026-03-17'),
        plannedEnd: new Date('2026-03-18'),
        actualStart: new Date('2026-03-17'),
        actualEnd: new Date('2026-03-18'),
        status: 'completed',
      },
      {
        phase: 'entrega',
        plannedStart: new Date('2026-03-19'),
        plannedEnd: new Date('2026-03-19'),
        actualStart: new Date('2026-03-19'),
        actualEnd: new Date('2026-03-19'),
        status: 'completed',
      },
    ],
  },
  {
    projectId: 'proj-3',
    furnitureId: 'furn-3',
    clientId: 'client-3',
    contractorId: 'contr-3',
    furnitureName: 'Estante de Madera',
    clientName: 'López González',
    contractorName: 'David Torres',
    phases: [
      {
        phase: 'corte',
        plannedStart: new Date('2026-03-15'),
        plannedEnd: new Date('2026-03-18'),
        actualStart: new Date('2026-03-16'),
        actualEnd: undefined,
        status: 'in-progress',
      },
      {
        phase: 'canteado',
        plannedStart: new Date('2026-03-19'),
        plannedEnd: new Date('2026-03-21'),
        status: 'pending',
      },
      {
        phase: 'ensamblado',
        plannedStart: new Date('2026-03-22'),
        plannedEnd: new Date('2026-03-24'),
        status: 'pending',
      },
      {
        phase: 'instalacion',
        plannedStart: new Date('2026-03-25'),
        plannedEnd: new Date('2026-03-26'),
        status: 'pending',
      },
      {
        phase: 'entrega',
        plannedStart: new Date('2026-03-27'),
        plannedEnd: new Date('2026-03-27'),
        status: 'pending',
      },
    ],
  },
];

export const CLIENT_PROJECT_PAYMENT_PLANS: ClientProjectPaymentPlan[] = [
  {
    projectId: 'proj-1',
    clientId: 'client-1',
    totalProjectAmount: 45000,
    installments: [
      {
        id: 'cli-proj-1-inst-1',
        name: 'Anticipo 1',
        amount: 15000,
        estimatedPaymentDate: new Date('2026-05-03'),
        status: 'paid',
      },
      {
        id: 'cli-proj-1-inst-2',
        name: 'Anticipo 2',
        amount: 15000,
        estimatedPaymentDate: new Date('2026-05-24'),
        status: 'paid',
      },
      {
        id: 'cli-proj-1-inst-3',
        name: 'Anticipo 3',
        amount: 15000,
        estimatedPaymentDate: new Date('2026-06-15'),
        status: 'pending',
      },
    ],
  },
  {
    projectId: 'proj-3',
    clientId: 'client-3',
    totalProjectAmount: 28000,
    installments: [
      {
        id: 'cli-proj-3-inst-1',
        name: 'Anticipo 1',
        amount: 10000,
        estimatedPaymentDate: new Date('2026-04-21'),
        status: 'paid',
      },
      {
        id: 'cli-proj-3-inst-2',
        name: 'Anticipo 2',
        amount: 10000,
        estimatedPaymentDate: new Date('2026-05-21'),
        status: 'paid',
      },
      {
        id: 'cli-proj-3-inst-3',
        name: 'Anticipo 3',
        amount: 8000,
        estimatedPaymentDate: new Date('2026-06-20'),
        status: 'pending',
      },
    ],
  },
  {
    projectId: 'proj-4',
    clientId: 'client-4',
    totalProjectAmount: 55000,
    installments: [
      {
        id: 'cli-proj-4-inst-1',
        name: 'Anticipo 1',
        amount: 18000,
        estimatedPaymentDate: new Date('2026-03-20'),
        status: 'paid',
      },
      {
        id: 'cli-proj-4-inst-2',
        name: 'Anticipo 2',
        amount: 18000,
        estimatedPaymentDate: new Date('2026-04-20'),
        status: 'paid',
      },
      {
        id: 'cli-proj-4-inst-3',
        name: 'Anticipo 3',
        amount: 19000,
        estimatedPaymentDate: new Date('2026-05-20'),
        status: 'paid',
      },
    ],
  },
];

export const CONTRACTOR_PROJECT_PAYMENT_PLANS: ContractorProjectPaymentPlan[] = [
  {
    projectId: 'proj-1',
    contractorId: 'contr-1',
    totalAgreedAmount: 35000,
    phases: [
      { id: 'phase-cutting', name: 'Cortado', amount: 7000, status: 'paid' },
      { id: 'phase-edging', name: 'Canteado', amount: 7000, status: 'paid' },
      { id: 'phase-assembly', name: 'Ensamblado', amount: 7000, status: 'paid' },
      { id: 'phase-installation', name: 'Instalación', amount: 7000, status: 'pending' },
      { id: 'phase-delivery', name: 'Entrega', amount: 7000, status: 'pending' },
    ],
  },
  {
    projectId: 'proj-3',
    contractorId: 'contr-2',
    totalAgreedAmount: 20000,
    phases: [
      { id: 'phase-cutting', name: 'Cortado', amount: 4000, status: 'paid' },
      { id: 'phase-edging', name: 'Canteado', amount: 4000, status: 'paid' },
      { id: 'phase-assembly', name: 'Ensamblado', amount: 4000, status: 'paid' },
      { id: 'phase-installation', name: 'Instalación', amount: 4000, status: 'paid' },
      { id: 'phase-delivery', name: 'Entrega', amount: 4000, status: 'pending' },
    ],
  },
  {
    projectId: 'proj-4',
    contractorId: 'contr-3',
    totalAgreedAmount: 15000,
    phases: [
      { id: 'phase-cutting', name: 'Cortado', amount: 3000, status: 'paid' },
      { id: 'phase-edging', name: 'Canteado', amount: 3000, status: 'paid' },
      { id: 'phase-assembly', name: 'Ensamblado', amount: 3000, status: 'pending' },
      { id: 'phase-installation', name: 'Instalación', amount: 3000, status: 'pending' },
      { id: 'phase-delivery', name: 'Entrega', amount: 3000, status: 'pending' },
    ],
  },
];

export const FINANCE_PAYMENT_HISTORY: FinancePaymentRecord[] = [
  {
    id: 'fin-rec-1',
    type: 'receivable',
    projectId: 'proj-1',
    clientId: 'client-1',
    lineType: 'installment',
    lineId: 'cli-proj-1-inst-1',
    lineName: 'Anticipo 1',
    amount: 15000,
    date: new Date('2026-05-03'),
    status: 'paid',
  },
  {
    id: 'fin-rec-2',
    type: 'receivable',
    projectId: 'proj-1',
    clientId: 'client-1',
    lineType: 'installment',
    lineId: 'cli-proj-1-inst-2',
    lineName: 'Anticipo 2',
    amount: 15000,
    date: new Date('2026-05-24'),
    status: 'paid',
  },
  {
    id: 'fin-rec-3',
    type: 'receivable',
    projectId: 'proj-3',
    clientId: 'client-3',
    lineType: 'installment',
    lineId: 'cli-proj-3-inst-1',
    lineName: 'Anticipo 1',
    amount: 10000,
    date: new Date('2026-04-21'),
    status: 'paid',
  },
  {
    id: 'fin-rec-4',
    type: 'payable',
    projectId: 'proj-1',
    contractorId: 'contr-1',
    lineType: 'phase',
    lineId: 'phase-cutting',
    lineName: 'Cortado',
    amount: 7000,
    date: new Date('2026-05-06'),
    status: 'paid',
  },
  {
    id: 'fin-rec-5',
    type: 'payable',
    projectId: 'proj-1',
    contractorId: 'contr-1',
    lineType: 'advance',
    lineId: 'special-advance',
    lineName: 'Anticipo Especial',
    amount: 5000,
    date: new Date('2026-05-02'),
    status: 'paid',
  },
  {
    id: 'fin-rec-6',
    type: 'payable',
    projectId: 'proj-3',
    contractorId: 'contr-2',
    lineType: 'phase',
    lineId: 'phase-installation',
    lineName: 'Instalación',
    amount: 4000,
    date: new Date('2026-06-18'),
    status: 'paid',
  },
];

export const FINANCE_CHANGE_LOG: FinanceChangeLog[] = [
  {
    id: 'fin-log-1',
    type: 'receivable',
    projectId: 'proj-1',
    clientId: 'client-1',
    field: 'Anticipo 3 monto',
    previousValue: '14000',
    nextValue: '15000',
    changedAt: new Date('2026-05-20'),
  },
  {
    id: 'fin-log-2',
    type: 'payable',
    projectId: 'proj-3',
    contractorId: 'contr-2',
    field: 'Entrega monto fase',
    previousValue: '3500',
    nextValue: '4000',
    changedAt: new Date('2026-06-10'),
  },
];

export const DEFAULT_CONTRACTOR_PHASES = [
  { id: 'phase-cutting', name: 'Cortado' },
  { id: 'phase-edging', name: 'Canteado' },
  { id: 'phase-assembly', name: 'Ensamblado' },
  { id: 'phase-installation', name: 'Instalación' },
  { id: 'phase-delivery', name: 'Entrega' },
];

function getDateBoundsByPreset(preset: DateRangePreset, now: Date) {
  const end = new Date(now);
  const start = new Date(now);

  if (preset === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(11, 31);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getProjectsByClientId(clientId: string) {
  return PROJECTS.filter((project) => project.clientId === clientId);
}

export function getProjectsByContractorId(contractorId: string) {
  const projectIds = new Set(
    PRODUCTION_ORDERS.filter((order) => order.assignedContractorId === contractorId).map(
      (order) => order.projectId,
    ),
  );
  return PROJECTS.filter((project) => projectIds.has(project.id));
}

export function getClientPlanByProjectId(projectId: string) {
  return CLIENT_PROJECT_PAYMENT_PLANS.find((plan) => plan.projectId === projectId);
}

export function getContractorPlanByProjectId(projectId: string, contractorId: string) {
  return CONTRACTOR_PROJECT_PAYMENT_PLANS.find(
    (plan) => plan.projectId === projectId && plan.contractorId === contractorId,
  );
}

export function getFinancialBalanceSummary(
  totalAgreedAmount: number,
  paymentRecords: FinancePaymentRecord[],
): FinanceBalanceSummary {
  const totalPaid = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    totalAgreedAmount,
    totalPaid,
    remainingBalance: Math.max(totalAgreedAmount - totalPaid, 0),
  };
}

export function getHistoryByType(type: 'receivable' | 'payable') {
  return FINANCE_PAYMENT_HISTORY.filter((record) => record.type === type);
}

export function filterFinanceHistory(
  records: FinancePaymentRecord[],
  filter: FinanceHistoryFilter,
  now: Date = new Date(),
) {
  return records.filter((record) => {
    if (filter.entityId) {
      const isEntityMatch =
        record.clientId === filter.entityId || record.contractorId === filter.entityId;
      if (!isEntityMatch) {
        return false;
      }
    }

    if (typeof filter.minAmount === 'number' && record.amount < filter.minAmount) {
      return false;
    }

    if (typeof filter.maxAmount === 'number' && record.amount > filter.maxAmount) {
      return false;
    }

    const preset = filter.datePreset;
    if (preset && preset !== 'custom') {
      const { start, end } = getDateBoundsByPreset(preset, now);
      if (record.date < start || record.date > end) {
        return false;
      }
      return true;
    }

    if (filter.startDate && record.date < filter.startDate) {
      return false;
    }

    if (filter.endDate && record.date > filter.endDate) {
      return false;
    }

    return true;
  });
}

export function getInstallmentAlerts(referenceDate: Date = new Date()) {
  const dueSoonThreshold = 5;
  const startOfReferenceDay = new Date(referenceDate);
  startOfReferenceDay.setHours(0, 0, 0, 0);

  return CLIENT_PROJECT_PAYMENT_PLANS.flatMap((plan) => {
    const project = PROJECTS.find((item) => item.id === plan.projectId);
    const client = CLIENTS.find((item) => item.id === plan.clientId);

    return plan.installments
      .filter((installment) => installment.status === 'pending')
      .map((installment) => {
        const dueDate = new Date(installment.estimatedPaymentDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffMs = dueDate.getTime() - startOfReferenceDay.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return {
          projectId: plan.projectId,
          projectName: project?.name ?? 'Proyecto',
          clientId: plan.clientId,
          clientName: client?.name ?? 'Cliente',
          installmentId: installment.id,
          installmentName: installment.name,
          dueDate: installment.estimatedPaymentDate,
          type: diffDays < 0 ? 'overdue' : diffDays <= dueSoonThreshold ? 'due-soon' : 'ok',
          diffDays,
        };
      })
      .filter((entry) => entry.type !== 'ok');
  });
}
