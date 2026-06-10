'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Client, Measurement, Prequotation, Quotation, Contractor, ProductionOrder, Notification, Material, MaterialRequest } from '@/lib/types';
import {
  CLIENTS as MOCK_CLIENTS,
  MEASUREMENTS as MOCK_MEASUREMENTS,
  PREQUOTATIONS as MOCK_PREQUOTATIONS,
  QUOTATIONS as MOCK_QUOTATIONS,
  CONTRACTORS as MOCK_CONTRACTORS,
  PRODUCTION_ORDERS as MOCK_PRODUCTION_ORDERS,
  MATERIALS as MOCK_MATERIALS,
  MATERIAL_REQUESTS as MOCK_MATERIAL_REQUESTS,
  DEMO_USER as MOCK_DEMO_USER,
} from '@/lib/mock-data';

type LocalDataContextType = {
  clients: Client[];
  measurements: Measurement[];
  prequotations: Prequotation[];
  quotations: Quotation[];
  contractors: Contractor[];
  productionOrders: ProductionOrder[];
  materials: Material[];
  materialRequests: MaterialRequest[];
  notifications: Notification[];
  addMaterialRequest: (r: Omit<MaterialRequest, 'id' | 'requestDate' | 'status'>) => MaterialRequest;
  updateMaterialRequest: (id: string, data: Partial<MaterialRequest>) => void;
  addClient: (c: Omit<Client, 'id' | 'registrationDate' | 'status'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  addMeasurement: (m: Omit<Measurement, 'id'>) => Measurement;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  addPrequotation: (p: Prequotation) => void;
  updatePrequotation: (id: string, data: Partial<Prequotation>) => void;
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, data: Partial<Quotation>) => void;
  addProductionOrder: (po: ProductionOrder) => ProductionOrder;
  updateProductionOrder: (id: string, data: Partial<ProductionOrder>) => void;
  addNotification: (n: Notification) => Notification;
  updateNotification: (id: string, data: Partial<Notification>) => void;
};

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

const CLIENTS_KEY = 'mobeltech_clients_v1';
const MEASUREMENTS_KEY = 'mobeltech_measurements_v1';
const PREQUOTATIONS_KEY = 'mobeltech_prequotations_v1';
const QUOTATIONS_KEY = 'mobeltech_quotations_v1';
const CONTRACTORS_KEY = 'mobeltech_contractors_v1';
const PRODUCTION_ORDERS_KEY = 'mobeltech_production_orders_v1';
const NOTIFICATIONS_KEY = 'mobeltech_notifications_v1';
const MATERIALS_KEY = 'mobeltech_materials_v1';
const MATERIAL_REQUESTS_KEY = 'mobeltech_material_requests_v1';

function parseClients(raw: any[]): Client[] {
  return raw.map((c) => ({ ...c, registrationDate: c.registrationDate ? new Date(c.registrationDate) : new Date() }));
}

function parseMeasurements(raw: any[]): Measurement[] {
  return raw.map((m) => ({
    ...m,
    date: m.date ? new Date(m.date) : new Date(),
    quotationDeliveryDate: m.quotationDeliveryDate ? new Date(m.quotationDeliveryDate) : undefined,
  }));
}

function parsePrequotations(raw: any[]): Prequotation[] {
  return raw.map((p) => ({
    ...p,
    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    versions: p.versions ? p.versions.map((v: any) => ({ ...v, uploadedAt: v.uploadedAt ? new Date(v.uploadedAt) : undefined })) : [],
    logs: p.logs ? p.logs.map((l: any) => ({ ...l, performedAt: l.performedAt ? new Date(l.performedAt) : undefined })) : [],
  }));
}

function parseQuotations(raw: any[]): Quotation[] {
  return raw.map((q) => ({
    ...q,
    createdDate: q.createdDate ? new Date(q.createdDate) : new Date(),
    auditLogs: q.auditLogs
      ? (q.auditLogs as any[]).map((a: any) => ({
          ...a,
          changedAt: a.changedAt ? new Date(a.changedAt) : new Date(),
        }))
      : [],
  }));
}

function parseContractors(raw: any[]): Contractor[] {
  return raw.map((c) => ({ ...c }));
}

function parseProductionOrders(raw: any[]): ProductionOrder[] {
  return raw.map((po: any) => ({
    ...po,
    startDate: po.startDate ? new Date(po.startDate) : new Date(),
    estimatedDeliveryDate: po.estimatedDeliveryDate ? new Date(po.estimatedDeliveryDate) : undefined,
    actualDeliveryDate: po.actualDeliveryDate ? new Date(po.actualDeliveryDate) : undefined,
    items: po.items ? po.items.map((it: any) => ({
      ...it,
      phases: it.phases ? it.phases.map((ph: any) => ({ ...ph, completedDate: ph.completedDate ? new Date(ph.completedDate) : undefined })) : [],
    })) : [],
  }));
}

function parseMaterials(raw: any[]): Material[] {
  return raw.map((m) => ({ ...m, lastPurchaseDate: m.lastPurchaseDate ? new Date(m.lastPurchaseDate) : new Date() }));
}

function parseMaterialRequests(raw: any[]): MaterialRequest[] {
  return raw.map((r: any) => ({
    ...r,
    requestDate: r.requestDate ? new Date(r.requestDate) : new Date(),
  }));
}

function parseNotifications(raw: any[]): Notification[] {
  return raw.map((n) => ({ ...n, createdAt: n.createdAt ? new Date(n.createdAt) : new Date() }));
}

function loadOrSeed<T>(key: string, seed: T[], parser: (raw: any[]) => T[]) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If parsed is a non-empty array, use it; otherwise reseed with mock data.
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parser(parsed as any[]);
      }
    }
  } catch (e) {
    // ignore
  }
  try {
    localStorage.setItem(key, JSON.stringify(seed));
  } catch (e) {
    // ignore
  }
  return parser(JSON.parse(JSON.stringify(seed)));
}

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() => loadOrSeed(CLIENTS_KEY, MOCK_CLIENTS, parseClients));
  const [measurements, setMeasurements] = useState<Measurement[]>(() => loadOrSeed(MEASUREMENTS_KEY, MOCK_MEASUREMENTS, parseMeasurements));
  const [prequotations, setPrequotations] = useState<Prequotation[]>(() => loadOrSeed(PREQUOTATIONS_KEY, MOCK_PREQUOTATIONS, parsePrequotations));
  const [quotations, setQuotations] = useState<Quotation[]>(() => loadOrSeed(QUOTATIONS_KEY, MOCK_QUOTATIONS, parseQuotations));
  const [contractors, setContractors] = useState<Contractor[]>(() => loadOrSeed(CONTRACTORS_KEY, MOCK_CONTRACTORS, parseContractors));
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(() => loadOrSeed(PRODUCTION_ORDERS_KEY, MOCK_PRODUCTION_ORDERS, parseProductionOrders));
  const [notifications, setNotifications] = useState<Notification[]>(() => []);
  const [materials, setMaterials] = useState<Material[]>(() => loadOrSeed(MATERIALS_KEY, MOCK_MATERIALS, parseMaterials));
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(() => loadOrSeed(MATERIAL_REQUESTS_KEY, MOCK_MATERIAL_REQUESTS, parseMaterialRequests));

  useEffect(() => {
    try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients)); } catch {}
  }, [clients]);

  useEffect(() => {
    try { localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(measurements)); } catch {}
  }, [measurements]);

  useEffect(() => {
    try { localStorage.setItem(PREQUOTATIONS_KEY, JSON.stringify(prequotations)); } catch {}
  }, [prequotations]);

  useEffect(() => {
    try { localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotations)); } catch {}
  }, [quotations]);

  useEffect(() => { try { localStorage.setItem(CONTRACTORS_KEY, JSON.stringify(contractors)); } catch {} }, [contractors]);
  useEffect(() => { try { localStorage.setItem(PRODUCTION_ORDERS_KEY, JSON.stringify(productionOrders)); } catch {} }, [productionOrders]);
  // Ensure any previously seeded/mock notifications are removed on provider mount
  useEffect(() => {
    try {
      localStorage.removeItem(NOTIFICATIONS_KEY);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)); } catch {} }, [notifications]);
  useEffect(() => { try { localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials)); } catch {} }, [materials]);
  useEffect(() => { try { localStorage.setItem(MATERIAL_REQUESTS_KEY, JSON.stringify(materialRequests)); } catch {} }, [materialRequests]);

  // Normalize productionOrders assignedContractorId to user ids when possible
  useEffect(() => {
    if (!contractors.length) return;
    setProductionOrders((prev) => {
      let changed = false;
      const next = prev.map((po) => {
        const assigned = po.assignedContractorId;
        if (!assigned) return po;
        // if assigned looks like contractor id, map to contractor.userId if available
        if (assigned.startsWith('contr-')) {
          const c = contractors.find((ct) => ct.id === assigned);
          if (c?.userId) {
            changed = true;
            return { ...po, assignedContractorId: c.userId };
          }
        }
        return po;
      });
      if (changed) return next;
      return prev;
    });
  }, [contractors]);

  const addClient = (c: Omit<Client, 'id' | 'registrationDate' | 'status'>) => {
    const id = `client-${Date.now()}`;
    const next: Client = { id, registrationDate: new Date(), status: 'active', ...c };
    setClients((s) => [next, ...s]);
    return next;
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients((s) => s.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const addMeasurement = (m: Omit<Measurement, 'id'>) => {
    const id = `meas-${Date.now()}`;
    const next: Measurement = { id, ...m } as Measurement;
    setMeasurements((s) => [next, ...s]);
    return next;
  };

  const updateMeasurement = (id: string, data: Partial<Measurement>) => {
    setMeasurements((s) => s.map((m) => (m.id === id ? { ...m, ...data } : m)));
  };

  const addPrequotation = (p: Prequotation) => {
    setPrequotations((s) => [p, ...s]);
  };

  const updatePrequotation = (id: string, data: Partial<Prequotation>) => {
    setPrequotations((s) => s.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const addQuotation = (q: Quotation) => {
    setQuotations((s) => [q, ...s]);
  };

  const updateQuotation = (id: string, data: Partial<Quotation>) => {
    setQuotations((s) =>
      s.map((q) => {
        if (q.id !== id) return q;
        const existingLogs = (q as any).auditLogs ?? [];
        const newLogs = (data as any).auditLogs ? [...existingLogs, ...(data as any).auditLogs] : existingLogs;
        return { ...q, ...data, auditLogs: newLogs } as Quotation;
      }),
    );
  };

  const addProductionOrder = (po: ProductionOrder) => {
    const next = { ...po, id: po.id ?? `po-${Date.now()}` } as ProductionOrder;
    setProductionOrders((s) => [next, ...s]);
    return next;
  };

  const updateProductionOrder = (id: string, data: Partial<ProductionOrder>) => {
    setProductionOrders((s) => s.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const addNotification = (n: Notification) => {
    const next = { ...n, id: n.id ?? `noti-${Date.now()}`, createdAt: n.createdAt ?? new Date() } as Notification;
    setNotifications((s) => [next, ...s]);
    return next;
  };

  const updateNotification = (id: string, data: Partial<Notification>) => {
    setNotifications((s) => s.map((n) => (n.id === id ? { ...n, ...data } : n)));
  };

  const addMaterialRequest = (r: Omit<MaterialRequest, 'id' | 'requestDate' | 'status'>) => {
    const id = `mreq-${Date.now()}`;
    const next: MaterialRequest = { id, status: 'pending', requestDate: new Date(), ...r } as MaterialRequest;
    setMaterialRequests((s) => [next, ...s]);

    // notify admin (demo user) — best-effort: notify first admin user found in contractors or fallback to DEMO_USER id 'user-1'
    try {
      const adminId = MOCK_DEMO_USER?.id ?? 'user-1';
      addNotification({ recipientId: adminId, message: `Tienes una nueva solicitud de material`, createdAt: new Date(), relatedJobId: next.projectId });
    } catch {}

    return next;
  };

  const updateMaterialRequest = (id: string, data: Partial<MaterialRequest>) => {
    setMaterialRequests((s) => s.map((mr) => (mr.id === id ? { ...mr, ...data } : mr)));

    // if rejected, notify contractor user if available
    if (data.status === 'rejected') {
      const target = materialRequests.find((m) => m.id === id) ?? null;
      if (target) {
        const contractor = contractors.find((c) => c.id === target.contractorId);
        const recipientId = contractor?.userId ?? null;
        if (recipientId) {
          addNotification({ recipientId, message: `Tu solicitud ${id} ha sido devuelta: ${data.rejectionComments ?? ''}`, createdAt: new Date(), relatedJobId: target.projectId });
        }
      }
    }
  };

  return (
    <LocalDataContext.Provider
      value={{
        clients,
        measurements,
        prequotations,
        quotations,
        materials,
        materialRequests,
        addClient,
        updateClient,
        addMeasurement,
        updateMeasurement,
        addPrequotation,
        updatePrequotation,
        addQuotation,
        updateQuotation,
        contractors,
        productionOrders,
        addMaterialRequest,
        updateMaterialRequest,
        notifications,
        addProductionOrder,
        updateProductionOrder,
        addNotification,
        updateNotification,
      }}
    >
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const ctx = useContext(LocalDataContext);
  if (!ctx) throw new Error('useLocalData must be used within LocalDataProvider');
  return ctx;
}

export default LocalDataContext;
