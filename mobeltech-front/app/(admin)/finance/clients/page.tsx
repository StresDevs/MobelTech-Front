"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDays, Coins, Plus, Search, X } from "lucide-react";
import { CURRENCY_FORMAT } from '@/lib/constants';
import { useRole } from '@/hooks/use-role-context';

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
  const { currentRole } = useRole();
  const isReadOnly = currentRole === 'partner';
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

  const summary = useMemo(() => {
    const plannedTotal = rows.array.reduce(
      (sum, row) => sum + row.plan.installments.reduce((planSum, installment) => planSum + installment.amount, 0),
      0,
    );
    const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingTotal = Math.max(plannedTotal - paidTotal, 0);
    const activePlans = rows.array.length;
    const historyCount = payments.length;

    return { plannedTotal, paidTotal, pendingTotal, activePlans, historyCount };
  }, [payments, rows.array]);

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
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(214,168,90,0.18),rgba(255,255,255,0.96))] p-6 shadow-sm dark:bg-[linear-gradient(135deg,rgba(214,168,90,0.16),rgba(24,24,24,0.96))]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a6b2f]">Finanzas · Clientes</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Anticipos y pagos de clientes</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Diseñado para revisar planes, registrar abonos y seguir historial sin saturar la pantalla.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <MiniMetric icon={<Coins className="h-4 w-4" />} label="Planes" value={String(summary.activePlans)} />
              <MiniMetric icon={<CalendarDays className="h-4 w-4" />} label="Movimientos" value={String(summary.historyCount)} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total planificado" value={formatCurrency(summary.plannedTotal)} />
          <MetricCard label="Total cobrado" value={formatCurrency(summary.paidTotal)} />
          <MetricCard label="Saldo pendiente" value={formatCurrency(summary.pendingTotal)} />
          <MetricCard label="Pagos registrados" value={String(summary.historyCount)} />
        </div>

        <div className={isReadOnly ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 gap-6 xl:grid-cols-[330px_minmax(0,1fr)]'}>
          {!isReadOnly ? (
            <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <Card className="border-border/70 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold">Nuevo plan</p>
                  <p className="text-xs text-muted-foreground">Mantén el formulario corto y directo.</p>
                </div>

                <div className="space-y-3">
                  <Field label="Cliente" placeholder="Nombre del cliente" value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)} />
                  <Field label="Proyecto / mueble" placeholder="Proyecto o mueble" value={projectInput} onChange={(e) => setProjectInput(e.target.value)} />

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Montos por anticipo</label>
                    <div className="space-y-2">
                      {installmentAmounts.map((amt, idx) => (
                        <Input
                          key={idx}
                          type="number"
                          value={amt}
                          onChange={(e) => {
                            const copy = [...installmentAmounts];
                            copy[idx] = e.target.value;
                            setInstallmentAmounts(copy);
                          }}
                          placeholder={`Anticipo ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={addInstallmentInput} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Añadir
                      </Button>
                      <Button onClick={addPlan}>Guardar plan</Button>
                    </div>
                  </div>
                </div>
              </Card>
            </aside>
          ) : null}

          <section className="space-y-4">
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1">
                <TabsTrigger value="payments">Pagos</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="payments" className="mt-4">
                <Card className="border-border/70 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Pagos a clientes</h3>
                      <p className="text-xs text-muted-foreground">Cada fila concentra un plan, con pagos compactos por anticipo.</p>
                    </div>
                    <Badge variant="outline">{rows.array.length} planes</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Cliente</TableHead>
                          <TableHead className="w-[220px]">Proyecto</TableHead>
                          {Array.from({ length: rows.maxInstallments }).map((_, i) => (
                            <TableHead key={i} className="min-w-[180px]">
                              Anticipo {i + 1}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.array.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="align-top">
                              <div className="font-semibold">{r.clientName}</div>
                            </TableCell>
                            <TableCell className="align-top text-muted-foreground">{r.project || 'Sin proyecto'}</TableCell>
                            {Array.from({ length: rows.maxInstallments }).map((_, idx) => {
                              const inst = r.plan.installments[idx] || { id: idx + 1, label: `Anticipo ${idx + 1}`, amount: 0 };
                              const paid = r.paidByInstallment[idx] || 0;

                              return (
                                <TableCell key={idx} className="align-top">
                                  <div className="space-y-2">
                                    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Plan</p>
                                      <p className="mt-1 font-semibold">{formatCurrency(inst.amount)}</p>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cobrado</p>
                                        <p className="font-semibold">{formatCurrency(paid)}</p>
                                      </div>
                                      {!isReadOnly && openPayment && openPayment.key === r.key && openPayment.installment === inst.id ? (
                                        <div className="flex items-center gap-2">
                                          <Input type="number" value={openPaymentAmount} onChange={(e) => setOpenPaymentAmount(e.target.value)} className="w-24" />
                                          <Button size="sm" onClick={() => addPaymentForInstallment(r.key, inst.id)}>OK</Button>
                                          <Button variant="ghost" size="sm" onClick={() => { setOpenPayment(null); setOpenPaymentAmount(''); }}>
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : !isReadOnly ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setOpenPayment({ key: r.key, installment: inst.id });
                                            setOpenPaymentAmount('');
                                          }}
                                        >
                                          Agregar
                                        </Button>
                                      ) : (
                                        <Badge variant="secondary">Solo lectura</Badge>
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
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card className="border-border/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar por cliente" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Button variant="outline" onClick={() => { setSearch(''); setRangeFrom(''); setRangeTo(''); }}>
                        Limpiar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-auto" />
                      <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-auto" />
                      <Button variant="ghost" onClick={() => { const today = new Date(); setRangeFrom(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); setRangeTo(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10)); }}>
                        Hoy
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
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
                            <TableCell className="font-medium">{p.clientName}</TableCell>
                            <TableCell className="text-muted-foreground">{p.project || 'Sin proyecto'}</TableCell>
                            <TableCell>{p.installment ? `Anticipo ${p.installment}` : '-'}</TableCell>
                            <TableCell>{formatDate(p.date)}</TableCell>
                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </Card>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eab676]/15 text-[#9a6b2f]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
