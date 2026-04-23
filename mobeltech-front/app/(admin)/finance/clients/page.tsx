"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, X } from "lucide-react";
import { CURRENCY_FORMAT } from '@/lib/constants';

type Payment = {
  id: number;
  clientName: string;
  project: string;
  date: string;
  amount: number;
  installment?: number; // 1-based
};

type Plan = {
  clientName: string;
  project: string;
  installments: { id: number; label: string; amount: number }[];
};

const keyFor = (clientName: string, project?: string) => `${clientName}::${(project || 'default')}`;

function formatCurrency(n: number) {
  if (!n) return `${CURRENCY_FORMAT}0.00`;
  return `${CURRENCY_FORMAT}${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

export default function ClientsFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Record<string, Plan>>({});

  // Plan creation inputs
  const [clientNameInput, setClientNameInput] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [installmentAmounts, setInstallmentAmounts] = useState<string[]>(["", "", ""]);

  // Inline payment UI state
  const [openPayment, setOpenPayment] = useState<{ key: string; installment: number } | null>(null);
  const [openPaymentAmount, setOpenPaymentAmount] = useState<string>("");

  // Filters (used only in Historial tab)
  const [search, setSearch] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("finance_clients_payments");
    if (raw) setPayments(JSON.parse(raw));
    const rawPlans = localStorage.getItem("finance_clients_plans");
    if (rawPlans) setPlans(JSON.parse(rawPlans));
  }, []);

  useEffect(() => localStorage.setItem("finance_clients_payments", JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem("finance_clients_plans", JSON.stringify(plans)), [plans]);

  function addPlan() {
    if (!clientNameInput) return;
    const key = keyFor(clientNameInput, projectInput);
    const plan: Plan = {
      clientName: clientNameInput,
      project: projectInput,
      installments: installmentAmounts.map((amt, i) => ({ id: i + 1, label: `Anticipo ${i + 1}`, amount: Number(amt) || 0 })),
    };
    setPlans((p) => ({ ...p, [key]: plan }));
    setClientNameInput("");
    setProjectInput("");
    setInstallmentAmounts(["", "", ""]);
  }

  function addInstallmentInput() {
    setInstallmentAmounts((s) => [...s, ""]);
  }

  function addPaymentForInstallment(key: string, installment: number) {
    const [clientName, projectKey] = key.split("::");
    const project = projectKey === 'default' ? '' : projectKey;
    if (!openPaymentAmount) return;
    const p: Payment = { id: Date.now(), clientName, project, date: new Date().toISOString().slice(0, 10), amount: Number(openPaymentAmount), installment };
    setPayments((s) => [p, ...s]);
    setOpenPayment(null);
    setOpenPaymentAmount("");
  }

  const rows = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(plans).forEach((k) => keys.add(k));
    payments.forEach((p) => keys.add(keyFor(p.clientName, p.project)));

    const array = Array.from(keys).map((k) => {
      const [clientName, projectKey] = k.split("::");
      const plan = plans[k] || {
        clientName,
        project: projectKey === 'default' ? '' : projectKey,
        installments: [{ id: 1, label: 'Anticipo 1', amount: 0 }, { id: 2, label: 'Anticipo 2', amount: 0 }, { id: 3, label: 'Anticipo 3', amount: 0 }],
      };

      const paidByInstallment = plan.installments.map((inst, idx) => {
        return payments
          .filter((pay) => pay.clientName === clientName && (pay.project || 'default') === (projectKey || 'default') && pay.installment === inst.id)
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      });

      return { key: k, clientName, project: plan.project, plan, paidByInstallment };
    });

    const maxInstallments = Math.max(3, ...array.map((r) => r.plan.installments.length));
    return { array, maxInstallments };
  }, [plans, payments]);

  function formatDate(d: string) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  }

  const filteredHistory = payments.filter((p) => {
    const matchName = !search || p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !rangeFrom || new Date(p.date) >= new Date(rangeFrom);
    const matchTo = !rangeTo || new Date(p.date) <= new Date(rangeTo);
    return matchName && matchFrom && matchTo;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-2">Tabla de anticipos y registro por anticipo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside className="md:col-span-1 border border-border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-medium">Crear / editar plan de anticipos</h2>
            <div>
              <label className="text-sm">Cliente</label>
              <Input value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)} placeholder="Nombre del cliente" className="mt-1" />
            </div>
            <div>
              <label className="text-sm">Proyecto / Mueble</label>
              <Input value={projectInput} onChange={(e) => setProjectInput(e.target.value)} placeholder="Proyecto o mueble" className="mt-1" />
            </div>

            <div>
              <label className="text-sm">Montos por anticipo</label>
              <div className="space-y-2 mt-2">
                {installmentAmounts.map((amt, idx) => (
                  <Input key={idx} type="number" value={amt} onChange={(e) => { const copy = [...installmentAmounts]; copy[idx] = e.target.value; setInstallmentAmounts(copy); }} placeholder={`Anticipo ${idx + 1}`} />
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addInstallmentInput} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Añadir anticipo</Button>
                  <Button onClick={addPlan}>Guardar plan</Button>
                </div>
              </div>
            </div>
          </aside>

          <section className="md:col-span-2 space-y-4">
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payments">Pagos</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="payments" className="mt-4">
                <div className="border border-border rounded-lg p-4 overflow-x-auto">
                  <h3 className="font-medium mb-3">Pagos a Clientes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Proyecto</TableHead>
                        {Array.from({ length: rows.maxInstallments }).map((_, i) => (
                          <TableHead key={i}>Anticipo {i + 1}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.array.map((r) => (
                        <TableRow key={r.key}>
                          <TableCell className="align-top">
                            <div className="font-medium">{r.clientName}</div>
                          </TableCell>
                          <TableCell className="align-top">{r.project}</TableCell>
                          {Array.from({ length: rows.maxInstallments }).map((_, idx) => {
                            const inst = r.plan.installments[idx] || { id: idx + 1, label: `Anticipo ${idx + 1}`, amount: 0 };
                            const paid = r.paidByInstallment[idx] || 0;

                            return (
                              <TableCell key={idx} className="align-top">
                                <div className="text-xs text-muted-foreground">Plan: {formatCurrency(inst.amount)}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="font-medium">{formatCurrency(paid)}</div>
                                  <div>
                                    {openPayment && openPayment.key === r.key && openPayment.installment === inst.id ? (
                                      <div className="flex items-center gap-2">
                                        <Input type="number" value={openPaymentAmount} onChange={(e) => setOpenPaymentAmount(e.target.value)} className="w-28" />
                                        <Button onClick={() => addPaymentForInstallment(r.key, inst.id)}>Agregar</Button>
                                        <Button variant="ghost" onClick={() => { setOpenPayment(null); setOpenPaymentAmount(''); }}><X className="w-4 h-4" /></Button>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" onClick={() => { setOpenPayment({ key: r.key, installment: inst.id }); setOpenPaymentAmount(''); }}>Agregar</Button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-between mb-4">
                  <div className="flex gap-2 flex-1">
                    <Input placeholder="Buscar por cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Button variant="outline" onClick={() => { setSearch(''); setRangeFrom(''); setRangeTo(''); }}>Limpiar</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                    <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                    <Button variant="ghost" onClick={() => { const today = new Date(); setRangeFrom(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); setRangeTo(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); }}>Hoy</Button>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Historial de anticipos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Anticipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.clientName}</TableCell>
                          <TableCell>{p.project}</TableCell>
                          <TableCell>{p.installment ? `Anticipo ${p.installment}` : '-'}</TableCell>
                          <TableCell>{formatDate(p.date)}</TableCell>
                          <TableCell>{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
