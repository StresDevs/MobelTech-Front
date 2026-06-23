'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role-context';
import { CalendarDays, Check, CheckCircle2, ChevronsUpDown, Eye, Loader2, Plus, Search, Trash2, WalletCards } from 'lucide-react';

type ContractorOption = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

type JobOption = {
  id: string;
  contractorId: string | null;
  name: string;
  status: string;
  amount: number;
};

type PlanLine = {
  id?: string;
  phaseKey: string;
  phaseLabel: string;
  plannedAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  sortOrder: number;
  payments?: Payment[];
};

type Payment = {
  id: string;
  planId: string;
  lineId: string;
  amount: number;
  paymentDate: string;
  notes?: string | null;
};

type PaymentPlan = {
  id: string;
  contractorId: string;
  productionOrderId: string;
  contractorName: string;
  jobName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lines: PlanLine[];
  payments: Payment[];
};

const PHASE_TEMPLATE: PlanLine[] = [
  { phaseKey: 'corte', phaseLabel: 'Corte', plannedAmount: 0, sortOrder: 0 },
  { phaseKey: 'canteado', phaseLabel: 'Canteado', plannedAmount: 0, sortOrder: 1 },
  { phaseKey: 'ensamblado', phaseLabel: 'Ensamblado', plannedAmount: 0, sortOrder: 2 },
  { phaseKey: 'instalacion', phaseLabel: 'Instalación', plannedAmount: 0, sortOrder: 3 },
  { phaseKey: 'entrega', phaseLabel: 'Entrega', plannedAmount: 0, sortOrder: 4 },
];

const todayInput = () => new Date().toISOString().slice(0, 10);
const money = (value: number) =>
  `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readError(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const payload = data as { error?: string; detail?: string; message?: string };
    return payload.detail || payload.error || payload.message || fallback;
  }
  return fallback;
}

export default function ContractorsFinancePage() {
  const { toast } = useToast();
  const { currentRole } = useRole();
  const isReadOnly = currentRole === 'partner';
  const apiBase = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL?.trim();
    return value ? value.replace(/\/$/, '') : '';
  }, []);

  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contractorId, setContractorId] = useState('');
  const [jobId, setJobId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [phaseLines, setPhaseLines] = useState<PlanLine[]>(PHASE_TEMPLATE);
  const [contractorComboboxOpen, setContractorComboboxOpen] = useState(false);
  const [jobComboboxOpen, setJobComboboxOpen] = useState(false);

  const [paymentLineId, setPaymentLineId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [paymentNotes, setPaymentNotes] = useState('');

  const [tableSearch, setTableSearch] = useState('');
  const [tableContractor, setTableContractor] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementPlan, setMovementPlan] = useState<PaymentPlan | null>(null);
  const [activeTab, setActiveTab] = useState(isReadOnly ? 'table' : 'plan');
  const [switchingTab, setSwitchingTab] = useState(false);
  const tabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadAll() {
    if (!apiBase) {
      setError('Falta configurar NEXT_PUBLIC_API_URL en el front.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [optionsResponse, plansResponse] = await Promise.all([
        fetch(`${apiBase}/api/contractor-finance/options`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/contractor-finance/plans`, { cache: 'no-store' }),
      ]);

      const optionsData = await optionsResponse.json().catch(() => null);
      const plansData = await plansResponse.json().catch(() => null);

      if (!optionsResponse.ok) throw new Error(readError(optionsData, 'No se pudieron cargar contratistas y trabajos.'));
      if (!plansResponse.ok) throw new Error(readError(plansData, 'No se pudieron cargar los planes de pago.'));

      setContractors(optionsData.contractors ?? []);
      setJobs(optionsData.jobs ?? []);
      setPlans(plansData ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando pagos de contratistas.';
      setError(message);
      toast({ title: 'Error de carga', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [apiBase]);

  useEffect(() => () => {
    if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
  }, []);

  useEffect(() => {
    if (isReadOnly && activeTab !== 'table') setActiveTab('table');
  }, [activeTab, isReadOnly]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.contractorId === contractorId && plan.productionOrderId === jobId),
    [contractorId, jobId, plans],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === jobId),
    [jobId, jobs],
  );
  const selectedContractor = useMemo(
    () => contractors.find((contractor) => contractor.id === contractorId),
    [contractorId, contractors],
  );

  useEffect(() => {
    setPaymentLineId('');
    if (selectedPlan) {
      setTotalAmount(String(selectedPlan.totalAmount));
      setPhaseLines(selectedPlan.lines.map((line) => ({ ...line })));
      return;
    }

    setTotalAmount(selectedJob?.amount ? String(selectedJob.amount) : '');
    setPhaseLines(PHASE_TEMPLATE.map((line) => ({ ...line })));
  }, [selectedJob?.amount, selectedJob?.id, selectedPlan?.id]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const belongsToContractor = contractorId ? !job.contractorId || job.contractorId === contractorId : true;
      return belongsToContractor;
    });
  }, [contractorId, jobs]);

  const phaseTotal = phaseLines.reduce((sum, line) => sum + Number(line.plannedAmount || 0), 0);
  const selectedPlanPaid = selectedPlan?.paidAmount ?? 0;
  const selectedPlanRemaining = Math.max(numberValue(totalAmount) - selectedPlanPaid, 0);

  const filteredPlans = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesSearch = !query || [plan.contractorName, plan.jobName].some((value) => value.toLowerCase().includes(query));
      const matchesContractor = tableContractor === 'all' || plan.contractorId === tableContractor;
      const matchesDates = plan.payments.some((payment) => {
        const afterStart = !dateFrom || payment.paymentDate >= dateFrom;
        const beforeEnd = !dateTo || payment.paymentDate <= dateTo;
        return afterStart && beforeEnd;
      });
      const noDateFilter = !dateFrom && !dateTo;
      return matchesSearch && matchesContractor && (noDateFilter || matchesDates);
    });
  }, [dateFrom, dateTo, plans, tableContractor, tableSearch]);

  function updatePhase(index: number, field: 'phaseLabel' | 'plannedAmount', value: string) {
    setPhaseLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index
          ? { ...line, [field]: field === 'plannedAmount' ? numberValue(value) : value }
          : line,
      ),
    );
  }

  function addPhase() {
    setPhaseLines((current) => [
      ...current,
      {
        phaseKey: `otro-${Date.now()}`,
        phaseLabel: 'Otro',
        plannedAmount: 0,
        sortOrder: current.length,
      },
    ]);
  }

  function removePhase(index: number) {
    const line = phaseLines[index];
    if (!line) return;
    if ((line.paidAmount ?? 0) > 0 || (line.payments?.length ?? 0) > 0) {
      toast({
        title: 'Fase con pagos',
        description: 'No se puede eliminar una fase que ya tiene pagos registrados.',
        variant: 'destructive',
      });
      return;
    }
    if (phaseLines.length === 1) {
      toast({
        title: 'Debe quedar una fase',
        description: 'El plan necesita al menos una fase para registrar pagos.',
        variant: 'destructive',
      });
      return;
    }

    setPhaseLines((current) =>
      current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((entry, currentIndex) => ({ ...entry, sortOrder: currentIndex })),
    );
  }

  function handleTabChange(value: string) {
    if (isReadOnly && value !== 'table') return;
    if (value === activeTab || switchingTab) return;
    if (tabTimerRef.current) clearTimeout(tabTimerRef.current);

    setSwitchingTab(true);
    tabTimerRef.current = setTimeout(() => {
      setActiveTab(value);
      setSwitchingTab(false);
    }, 180);
  }

  async function handleSavePlan() {
    if (!contractorId) {
      toast({ title: 'Selecciona contratista', description: 'Primero elige a quién se le pagará.', variant: 'destructive' });
      return;
    }
    if (!jobId) {
      toast({ title: 'Selecciona trabajo', description: 'Elige el trabajo asociado al plan.', variant: 'destructive' });
      return;
    }
    if (numberValue(totalAmount) <= 0) {
      toast({ title: 'Monto inválido', description: 'El monto total debe ser mayor a 0.', variant: 'destructive' });
      return;
    }
    if (phaseLines.length === 0 || phaseLines.some((line) => !line.phaseLabel.trim())) {
      toast({ title: 'Fases incompletas', description: 'Cada fase debe tener un nombre.', variant: 'destructive' });
      return;
    }

    setSavingPlan(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          productionOrderId: jobId,
          totalAmount: numberValue(totalAmount),
          lines: phaseLines.map((line, index) => ({
            id: line.id,
            phaseKey: line.phaseKey,
            phaseLabel: line.phaseLabel || 'Otro',
            plannedAmount: line.plannedAmount,
            sortOrder: index,
          })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo guardar el plan de pago.'));

      await loadAll();
      toast({ title: 'Plan guardado', description: 'El plan de pago del contratista quedó actualizado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el plan.';
      toast({ title: 'Error al guardar', description: message, variant: 'destructive' });
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleRegisterPayment() {
    if (!selectedPlan?.id) {
      toast({ title: 'Guarda el plan primero', description: 'Necesitas un plan antes de registrar pagos.', variant: 'destructive' });
      return;
    }
    if (!paymentLineId) {
      toast({ title: 'Selecciona fase', description: 'Elige a qué fase corresponde el pago.', variant: 'destructive' });
      return;
    }
    if (numberValue(paymentAmount) <= 0) {
      toast({ title: 'Monto inválido', description: 'El pago debe ser mayor a 0.', variant: 'destructive' });
      return;
    }

    setSavingPayment(true);
    try {
      const response = await fetch(`${apiBase}/api/contractor-finance/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          lineId: paymentLineId,
          amount: numberValue(paymentAmount),
          paymentDate,
          notes: paymentNotes || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(data, 'No se pudo registrar el pago.'));

      setPaymentAmount('');
      setPaymentNotes('');
      await loadAll();
      toast({ title: 'Pago registrado', description: 'El saldo del contratista fue actualizado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el pago.';
      toast({ title: 'Error al registrar', description: message, variant: 'destructive' });
    } finally {
      setSavingPayment(false);
    }
  }

  function renderContextControls(readOnlyAmount = false) {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_180px]">
        <div className="min-w-0 space-y-1.5">
          <Label>Contratista</Label>
          <Popover open={contractorComboboxOpen} onOpenChange={setContractorComboboxOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" role="combobox" aria-expanded={contractorComboboxOpen} className="w-full justify-between font-normal">
                <span className="truncate">{selectedContractor?.name ?? 'Buscar o seleccionar contratista'}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar contratista..." />
                <CommandList>
                  <CommandEmpty>No se encontró contratista.</CommandEmpty>
                  <CommandGroup>
                    {contractors.map((contractor) => (
                      <CommandItem
                        key={contractor.id}
                        value={contractor.name}
                        onSelect={() => {
                          setContractorId(contractor.id);
                          setJobId('');
                          setContractorComboboxOpen(false);
                        }}
                      >
                        <Check className={`h-4 w-4 ${contractorId === contractor.id ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{contractor.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label>Trabajo</Label>
          <Popover open={jobComboboxOpen} onOpenChange={setJobComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={jobComboboxOpen}
                disabled={!contractorId}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{selectedJob?.name ?? 'Buscar o seleccionar trabajo'}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar trabajo..." />
                <CommandList>
                  <CommandEmpty>No se encontró trabajo.</CommandEmpty>
                  <CommandGroup>
                    {filteredJobs.map((job) => (
                      <CommandItem
                        key={job.id}
                        value={job.name}
                        onSelect={() => {
                          setJobId(job.id);
                          setJobComboboxOpen(false);
                        }}
                      >
                        <Check className={`h-4 w-4 ${jobId === job.id ? 'opacity-100' : 'opacity-0'}`} />
                        <div className="min-w-0">
                          <p className="truncate">{job.name}</p>
                          <p className="text-xs text-muted-foreground">{money(job.amount)}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label>Monto</Label>
          <Input
            type="number"
            value={totalAmount}
            onChange={(event) => setTotalAmount(event.target.value)}
            placeholder="0.00"
            readOnly={readOnlyAmount}
            className={readOnlyAmount ? 'bg-muted/40' : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="space-y-5 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos a contratistas</h1>
          <p className="text-sm text-muted-foreground">Planes por trabajo, fases y pagos registrados.</p>
        </div>

        {error ? <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card> : null}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className={`grid h-auto w-full grid-cols-1 gap-1 bg-muted/60 p-1 ${isReadOnly ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
            {!isReadOnly ? <TabsTrigger value="plan" className="py-2">Plan de pago</TabsTrigger> : null}
            {!isReadOnly ? <TabsTrigger value="payment" className="py-2">Registrar pago</TabsTrigger> : null}
            <TabsTrigger value="table" className="py-2">Tabla de pagos</TabsTrigger>
          </TabsList>

          {switchingTab ? (
            <Card className="flex min-h-[260px] items-center justify-center border-border/70 p-6">
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Cargando sección...</span>
              </div>
            </Card>
          ) : null}

          {!switchingTab ? (
            <>
          {!isReadOnly ? (
          <TabsContent value="plan" className="mt-0">
            <Card className="space-y-4 border-border/70 p-4">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Plan de pago</h2>
              </div>

              {renderContextControls()}

              <div className="overflow-x-auto rounded-md border border-border/70">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border/70">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fase</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Monto</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseLines.map((line, index) => (
                      <tr key={line.id ?? line.phaseKey} className="border-b border-border/60 last:border-b-0">
                        <td className="px-3 py-2">
                          <Input value={line.phaseLabel} onChange={(event) => updatePhase(index, 'phaseLabel', event.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <Input className="text-right" type="number" value={String(line.plannedAmount)} onChange={(event) => updatePhase(index, 'plannedAmount', event.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePhase(index)}
                            disabled={phaseLines.length === 1 || (line.paidAmount ?? 0) > 0 || (line.payments?.length ?? 0) > 0}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/70 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">Asignado por fases: {money(phaseTotal)} · Saldo general: {money(selectedPlanRemaining)}</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={addPhase} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar fase
                  </Button>
                  <Button onClick={handleSavePlan} disabled={savingPlan} className="gap-2">
                    {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Guardar plan
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
          ) : null}

          {!isReadOnly ? (
          <TabsContent value="payment" className="mt-0">
            <Card className="space-y-4 border-border/70 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Registrar pago</h2>
              </div>

              {renderContextControls(true)}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fase</Label>
                  <Select value={paymentLineId} onValueChange={setPaymentLineId} disabled={!selectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona fase" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlan?.lines.map((line) => (
                        <SelectItem key={line.id} value={line.id ?? ''}>{line.phaseLabel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monto pagado</Label>
                  <Input type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nota</Label>
                  <Input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Detalle opcional" />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedPlan ? `${selectedPlan.contractorName} · ${selectedPlan.jobName} · Saldo ${money(selectedPlan.remainingAmount)}` : 'Selecciona o guarda un plan para registrar pagos.'}
                </span>
                <Button onClick={handleRegisterPayment} disabled={savingPayment || !selectedPlan} className="gap-2">
                  {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Guardar pago
                </Button>
              </div>
            </Card>
          </TabsContent>
          ) : null}

          <TabsContent value="table" className="mt-0">
            <Card className="space-y-4 border-border/70 p-4">
              <h2 className="text-base font-semibold">Tabla de pagos</h2>

              <div className="grid gap-3 md:grid-cols-[1fr_220px_170px_170px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Buscar contratista o trabajo" className="pl-9" />
                </div>
                <Select value={tableContractor} onValueChange={setTableContractor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Contratista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los contratistas</SelectItem>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>{contractor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>

              <div className="overflow-x-auto rounded-md border border-border/70">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border/70">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Contratista</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trabajo</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Saldo</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td></tr>
                    ) : filteredPlans.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No hay pagos para mostrar.</td></tr>
                    ) : filteredPlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-border/60 align-top last:border-b-0">
                        <td className="px-3 py-3 font-medium">{plan.contractorName}</td>
                        <td className="px-3 py-3">{plan.jobName}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-xs font-semibold text-sky-700">
                            {money(plan.totalAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-amber-700">
                            {money(plan.remainingAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Button type="button" variant="outline" size="sm" onClick={() => setMovementPlan(plan)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
            </>
          ) : null}
        </Tabs>

        <Dialog open={!!movementPlan} onOpenChange={(open) => { if (!open) setMovementPlan(null); }}>
          <DialogContent className="max-w-xl p-0">
            {movementPlan ? (
              <div className="overflow-hidden rounded-lg">
                <div className="border-b border-border bg-muted/35 p-5">
                  <DialogHeader>
                    <DialogTitle>Movimientos del contratista</DialogTitle>
                    <DialogDescription>
                      {movementPlan.contractorName} · {movementPlan.jobName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                      <p className="text-xs font-medium text-sky-700">Total</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-sky-800">{money(movementPlan.totalAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-medium text-emerald-700">Pagado</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-emerald-800">{money(movementPlan.paidAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-medium text-amber-700">Saldo</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-amber-800">{money(movementPlan.remainingAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[55vh] overflow-y-auto p-5">
                  <div className="space-y-2">
                    {movementPlan.lines.map((line) => (
                      <div key={line.id ?? line.phaseKey} className="rounded-lg border border-border/70 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{line.phaseLabel}</p>
                            <p className="text-xs text-muted-foreground">Monto esperado según plan de pago</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-right">
                            <div className="rounded-md bg-sky-50 px-2 py-1.5">
                              <p className="text-[11px] font-medium text-sky-700">Esperado</p>
                              <p className="font-mono text-xs font-semibold text-sky-800">{money(line.plannedAmount)}</p>
                            </div>
                            <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                              <p className="text-[11px] font-medium text-emerald-700">Pagado</p>
                              <p className="font-mono text-xs font-semibold text-emerald-800">{money(line.paidAmount ?? 0)}</p>
                            </div>
                            <div className="rounded-md bg-amber-50 px-2 py-1.5">
                              <p className="text-[11px] font-medium text-amber-700">Saldo</p>
                              <p className="font-mono text-xs font-semibold text-amber-800">{money(Math.max(line.plannedAmount - (line.paidAmount ?? 0), 0))}</p>
                            </div>
                          </div>
                        </div>

                        {(line.payments?.length ?? 0) > 0 ? (
                          <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                            {line.payments?.map((payment) => (
                              <div key={payment.id} className="flex justify-between gap-3 text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(payment.paymentDate).toLocaleDateString('es-BO')}
                                  {payment.notes ? ` · ${payment.notes}` : ''}
                                </span>
                                <span className="font-mono font-medium">{money(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">Sin pagos registrados en esta fase.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}
