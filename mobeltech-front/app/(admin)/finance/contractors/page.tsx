"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PRODUCTION_PHASES, CURRENCY_FORMAT } from "@/lib/constants";
import { Plus, X } from 'lucide-react';

type Payment = {
  id: number;
  contractorName: string;
  project: string;
  specialty?: string;
  date: string;
  amount: number;
  installment?: number;
  phaseAtPayment?: string;
};

type Plan = {
  contractorName: string;
  project: string;
  specialty?: string;
  currentPhase: string;
  allowAdvance?: boolean;
  installments: { id: number; label: string; amount: number; requiredPhase: string }[];
};

const keyFor = (name: string, project?: string) => `${name}::${(project || 'default')}`;

function formatCurrency(n: number) {
  if (!n) return `${CURRENCY_FORMAT}0.00`;
  return `${CURRENCY_FORMAT}${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

function phaseOrder(id: string) {
  const ph = PRODUCTION_PHASES.find((x) => x.id === id);
  return ph ? ph.order : 0;
}

export default function ContractorsFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Record<string, Plan>>({});

  // plan creation
  const [contractorInput, setContractorInput] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [installmentsInput, setInstallmentsInput] = useState(() => [
    { label: 'Pago 1', amount: '', requiredPhase: PRODUCTION_PHASES[0].id },
    { label: 'Pago 2', amount: '', requiredPhase: PRODUCTION_PHASES[1].id },
    { label: 'Pago 3', amount: '', requiredPhase: PRODUCTION_PHASES[2].id },
  ] as { label: string; amount: string; requiredPhase: string }[]);

  // inline payment state
  const [openPayment, setOpenPayment] = useState<{ key: string; installment: number } | null>(null);
  const [openPaymentAmount, setOpenPaymentAmount] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem('finance_contractors_payments');
    if (raw) setPayments(JSON.parse(raw));
    const rawPlans = localStorage.getItem('finance_contractors_plans');
    if (rawPlans) setPlans(JSON.parse(rawPlans));
  }, []);

  useEffect(() => localStorage.setItem('finance_contractors_payments', JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem('finance_contractors_plans', JSON.stringify(plans)), [plans]);

  function addInstallmentInput() {
    setInstallmentsInput((s) => [...s, { label: `Pago ${s.length + 1}`, amount: '', requiredPhase: PRODUCTION_PHASES[Math.min(s.length, PRODUCTION_PHASES.length - 1)].id }]);
  }

  function savePlan() {
    if (!contractorInput) return;
    const key = keyFor(contractorInput, projectInput);
    const plan: Plan = {
      contractorName: contractorInput,
      project: projectInput,
      specialty: specialtyInput,
      currentPhase: PRODUCTION_PHASES[0].id,
      allowAdvance: false,
      installments: installmentsInput.map((it, i) => ({ id: i + 1, label: it.label || `Pago ${i + 1}`, amount: Number(it.amount) || 0, requiredPhase: it.requiredPhase })),
    };
    setPlans((p) => ({ ...p, [key]: plan }));
    setContractorInput(''); setProjectInput(''); setSpecialtyInput('');
    setInstallmentsInput([
      { label: 'Pago 1', amount: '', requiredPhase: PRODUCTION_PHASES[0].id },
      { label: 'Pago 2', amount: '', requiredPhase: PRODUCTION_PHASES[1].id },
      { label: 'Pago 3', amount: '', requiredPhase: PRODUCTION_PHASES[2].id },
    ]);
  }

  const rows = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(plans).forEach((k) => keys.add(k));
    payments.forEach((p) => keys.add(keyFor(p.contractorName, p.project)));

    const array = Array.from(keys).map((k) => {
      const [contractorName, projectKey] = k.split('::');
      const saved = plans[k];
      const plan: Plan = saved || {
        contractorName,
        project: projectKey === 'default' ? '' : projectKey,
        specialty: '',
        currentPhase: PRODUCTION_PHASES[0].id,
        allowAdvance: false,
        installments: [
          { id: 1, label: 'Pago 1', amount: 0, requiredPhase: PRODUCTION_PHASES[0].id },
          { id: 2, label: 'Pago 2', amount: 0, requiredPhase: PRODUCTION_PHASES[1].id },
          { id: 3, label: 'Pago 3', amount: 0, requiredPhase: PRODUCTION_PHASES[2].id },
        ],
      };

      const paidByInstallment = plan.installments.map((inst) => payments.filter((pay) => pay.contractorName === contractorName && (pay.project || 'default') === (projectKey || 'default') && pay.installment === inst.id).reduce((s, r) => s + (Number(r.amount) || 0), 0));

      return { key: k, contractorName, project: plan.project, specialty: plan.specialty, plan, paidByInstallment };
    });

    const maxInstallments = Math.max(3, ...array.map((r) => r.plan.installments.length));
    return { array, maxInstallments };
  }, [plans, payments]);

  function addPaymentForInstallment(key: string, installment: number) {
    const [contractorName, projectKey] = key.split('::');
    const project = projectKey === 'default' ? '' : projectKey;
    if (!openPaymentAmount) return;
    const plan = plans[key];
    const phase = plan?.currentPhase || PRODUCTION_PHASES[0].id;
    const p: Payment = { id: Date.now(), contractorName, project, specialty: plan?.specialty, date: new Date().toISOString().slice(0, 10), amount: Number(openPaymentAmount), installment, phaseAtPayment: phase };
    setPayments((s) => [p, ...s]);
    setOpenPayment(null); setOpenPaymentAmount('');
  }

  function canPay(plan: Plan, installmentId: number) {
    const inst = plan.installments.find((i) => i.id === installmentId);
    if (!inst) return true;
    if (plan.allowAdvance && installmentId === 1) return true;
    return phaseOrder(plan.currentPhase) >= phaseOrder(inst.requiredPhase);
  }

  function formatDate(d: string) { if (!d) return ''; try { return new Date(d).toLocaleDateString(); } catch { return d; } }

  const filteredHistory = payments.filter((p) => {
    const matchName = !search || p.contractorName.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !rangeFrom || new Date(p.date) >= new Date(rangeFrom);
    const matchTo = !rangeTo || new Date(p.date) <= new Date(rangeTo);
    return matchName && matchFrom && matchTo;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contratistas</h1>
          <p className="text-muted-foreground mt-2">Tabla de pagos por fases y registro por anticipo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside className="md:col-span-1 border border-border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-medium">Crear / editar plan de pagos</h2>
            <div>
              <label className="text-sm">Contratista</label>
              <Input value={contractorInput} onChange={(e) => setContractorInput(e.target.value)} placeholder="Nombre contratista" className="mt-1" />
            </div>
            <div>
              <label className="text-sm">Especialidad</label>
              <Input value={specialtyInput} onChange={(e) => setSpecialtyInput(e.target.value)} placeholder="Carpintería, Tapizado..." className="mt-1" />
            </div>
            <div>
              <label className="text-sm">Proyecto</label>
              <Input value={projectInput} onChange={(e) => setProjectInput(e.target.value)} placeholder="Proyecto" className="mt-1" />
            </div>

            <div>
              <label className="text-sm">Plan de pagos (montos y fase requerida)</label>
              <div className="space-y-2 mt-2">
                {installmentsInput.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={it.amount} onChange={(e) => { const c = [...installmentsInput]; c[idx].amount = e.target.value; setInstallmentsInput(c); }} placeholder={it.label} />
                    <select className="w-44 border border-input rounded-md p-2" value={it.requiredPhase} onChange={(e) => { const c = [...installmentsInput]; c[idx].requiredPhase = e.target.value; setInstallmentsInput(c); }}>
                      {PRODUCTION_PHASES.map((ph) => (<option key={ph.id} value={ph.id}>{ph.label}</option>))}
                    </select>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addInstallmentInput} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Añadir pago</Button>
                  <Button onClick={savePlan}>Guardar plan</Button>
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
                  <h3 className="font-medium mb-3">Pagos a Contratistas</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contratista</TableHead>
                        <TableHead>Especialidad</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Fase</TableHead>
                        {Array.from({ length: rows.maxInstallments }).map((_, i) => (
                          <TableHead key={i}>Anticipo {i + 1}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.array.map((r) => (
                        <TableRow key={r.key}>
                          <TableCell className="align-top"><div className="font-medium">{r.contractorName}</div></TableCell>
                          <TableCell className="align-top">{r.specialty}</TableCell>
                          <TableCell className="align-top">{r.project}</TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <select className="border border-input rounded-md p-1 text-sm" value={r.plan.currentPhase} onChange={(e) => { const copy = { ...r.plan }; copy.currentPhase = e.target.value; setPlans((p) => ({ ...p, [r.key]: copy })); }}>
                                {PRODUCTION_PHASES.map((ph) => (<option key={ph.id} value={ph.id}>{ph.label}</option>))}
                              </select>
                              <label className="text-xs"><input type="checkbox" checked={!!r.plan.allowAdvance} onChange={(e) => { const copy = { ...r.plan }; copy.allowAdvance = e.target.checked; setPlans((p) => ({ ...p, [r.key]: copy })); }} /> Permitir anticipo</label>
                            </div>
                          </TableCell>

                          {Array.from({ length: rows.maxInstallments }).map((_, idx) => {
                            const inst = r.plan.installments[idx] || { id: idx + 1, label: `Pago ${idx + 1}`, amount: 0, requiredPhase: PRODUCTION_PHASES[Math.min(idx, PRODUCTION_PHASES.length - 1)].id };
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
                                      <Button variant="outline" size="sm" disabled={!canPay(r.plan, inst.id)} onClick={() => { setOpenPayment({ key: r.key, installment: inst.id }); setOpenPaymentAmount(''); }}>Agregar</Button>
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
                    <Input placeholder="Buscar por contratista" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Button variant="outline" onClick={() => { setSearch(''); setRangeFrom(''); setRangeTo(''); }}>Limpiar</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                    <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                    <Button variant="ghost" onClick={() => { const today = new Date(); setRangeFrom(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); setRangeTo(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); }}>Hoy</Button>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Historial de pagos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contratista</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Anticipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.contractorName}</TableCell>
                          <TableCell>{p.project}</TableCell>
                          <TableCell>{p.installment ? `Pago ${p.installment}` : '-'}</TableCell>
                          <TableCell>{formatDate(p.date)}</TableCell>
                          <TableCell>{formatCurrency(p.amount)}</TableCell>
                          <TableCell>{p.phaseAtPayment || '-'}</TableCell>
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
