'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, BellRing, CalendarClock, CheckCircle2, HandCoins, Plus, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CURRENCY_FORMAT } from '@/lib/constants';
import {
  CLIENTS,
  CLIENT_PROJECT_PAYMENT_PLANS,
  CONTRACTORS,
  CONTRACTOR_PROJECT_PAYMENT_PLANS,
  DEFAULT_CONTRACTOR_PHASES,
  FINANCE_CHANGE_LOG,
  FINANCE_PAYMENT_HISTORY,
  PROJECTS,
  filterFinanceHistory,
  getFinancialBalanceSummary,
  getInstallmentAlerts,
  getProjectsByClientId,
  getProjectsByContractorId,
} from '@/lib/mock-data';
import {
  ClientProjectPaymentPlan,
  ContractorProjectPaymentPlan,
  DateRangePreset,
  FinanceChangeLog,
  FinancePaymentRecord,
  FinanceHistoryFilter,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const currency = (value: number) => `${CURRENCY_FORMAT}${value.toLocaleString('es-BO')}`;

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function parseDateInput(value: string) {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function FinanceAccounts() {
  const { toast } = useToast();

  const [clientPlans, setClientPlans] = useState<ClientProjectPaymentPlan[]>(
    CLIENT_PROJECT_PAYMENT_PLANS.map((plan) => ({
      ...plan,
      installments: plan.installments.map((installment) => ({ ...installment })),
    })),
  );
  const [contractorPlans, setContractorPlans] = useState<ContractorProjectPaymentPlan[]>(
    CONTRACTOR_PROJECT_PAYMENT_PLANS.map((plan) => ({
      ...plan,
      phases: plan.phases.map((phase) => ({ ...phase })),
    })),
  );
  const [paymentHistory, setPaymentHistory] = useState<FinancePaymentRecord[]>(
    FINANCE_PAYMENT_HISTORY.map((entry) => ({ ...entry })),
  );
  const [changeLog, setChangeLog] = useState<FinanceChangeLog[]>(
    FINANCE_CHANGE_LOG.map((entry) => ({ ...entry })),
  );

  const [clientId, setClientId] = useState<string>('');
  const [clientProjectId, setClientProjectId] = useState<string>('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');
  const [clientPaymentAmount, setClientPaymentAmount] = useState<string>('');
  const [clientPaymentDate, setClientPaymentDate] = useState<string>(toDateInputValue(new Date()));

  const [contractorId, setContractorId] = useState<string>('');
  const [contractorProjectId, setContractorProjectId] = useState<string>('');
  const [selectedContractorLine, setSelectedContractorLine] = useState<string>('');
  const [contractorPaymentAmount, setContractorPaymentAmount] = useState<string>('');
  const [contractorPaymentDate, setContractorPaymentDate] = useState<string>(toDateInputValue(new Date()));

  const [clientFilterEntity, setClientFilterEntity] = useState<string>('all');
  const [clientFilterPreset, setClientFilterPreset] = useState<DateRangePreset>('month');
  const [clientFilterMinAmount, setClientFilterMinAmount] = useState<string>('');
  const [clientFilterMaxAmount, setClientFilterMaxAmount] = useState<string>('');
  const [clientFilterStartDate, setClientFilterStartDate] = useState<string>('');
  const [clientFilterEndDate, setClientFilterEndDate] = useState<string>('');

  const [contractorFilterEntity, setContractorFilterEntity] = useState<string>('all');
  const [contractorFilterPreset, setContractorFilterPreset] = useState<DateRangePreset>('month');
  const [contractorFilterMinAmount, setContractorFilterMinAmount] = useState<string>('');
  const [contractorFilterMaxAmount, setContractorFilterMaxAmount] = useState<string>('');
  const [contractorFilterStartDate, setContractorFilterStartDate] = useState<string>('');
  const [contractorFilterEndDate, setContractorFilterEndDate] = useState<string>('');

  const clientProjects = useMemo(() => {
    if (!clientId) {
      return [];
    }
    return getProjectsByClientId(clientId);
  }, [clientId]);

  const contractorProjects = useMemo(() => {
    if (!contractorId) {
      return [];
    }
    return getProjectsByContractorId(contractorId);
  }, [contractorId]);

  const selectedClientPlan = useMemo(() => {
    return clientPlans.find((plan) => plan.projectId === clientProjectId);
  }, [clientPlans, clientProjectId]);

  const selectedContractorPlan = useMemo(() => {
    return contractorPlans.find(
      (plan) => plan.contractorId === contractorId && plan.projectId === contractorProjectId,
    );
  }, [contractorId, contractorPlans, contractorProjectId]);

  const selectedClientProject = useMemo(
    () => PROJECTS.find((project) => project.id === clientProjectId),
    [clientProjectId],
  );

  const selectedContractorProject = useMemo(
    () => PROJECTS.find((project) => project.id === contractorProjectId),
    [contractorProjectId],
  );

  const selectedClientHistory = useMemo(
    () =>
      paymentHistory.filter(
        (entry) => entry.type === 'receivable' && entry.clientId === clientId && entry.projectId === clientProjectId,
      ),
    [clientId, clientProjectId, paymentHistory],
  );

  const selectedContractorHistory = useMemo(
    () =>
      paymentHistory.filter(
        (entry) =>
          entry.type === 'payable' &&
          entry.contractorId === contractorId &&
          entry.projectId === contractorProjectId,
      ),
    [contractorId, contractorProjectId, paymentHistory],
  );

  const selectedClientBalance = useMemo(() => {
    if (!selectedClientPlan) {
      return undefined;
    }
    return getFinancialBalanceSummary(selectedClientPlan.totalProjectAmount, selectedClientHistory);
  }, [selectedClientHistory, selectedClientPlan]);

  const selectedContractorBalance = useMemo(() => {
    if (!selectedContractorPlan) {
      return undefined;
    }
    return getFinancialBalanceSummary(selectedContractorPlan.totalAgreedAmount, selectedContractorHistory);
  }, [selectedContractorHistory, selectedContractorPlan]);

  const installmentAlerts = useMemo(() => {
    return getInstallmentAlerts().sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [clientPlans]);

  const clientHistoryFilter: FinanceHistoryFilter = useMemo(
    () => ({
      entityId: clientFilterEntity === 'all' ? undefined : clientFilterEntity,
      minAmount: clientFilterMinAmount ? Number(clientFilterMinAmount) : undefined,
      maxAmount: clientFilterMaxAmount ? Number(clientFilterMaxAmount) : undefined,
      datePreset: clientFilterPreset,
      startDate: clientFilterPreset === 'custom' ? parseDateInput(clientFilterStartDate) : undefined,
      endDate: clientFilterPreset === 'custom' ? parseDateInput(clientFilterEndDate) : undefined,
    }),
    [
      clientFilterEndDate,
      clientFilterEntity,
      clientFilterMaxAmount,
      clientFilterMinAmount,
      clientFilterPreset,
      clientFilterStartDate,
    ],
  );

  const contractorHistoryFilter: FinanceHistoryFilter = useMemo(
    () => ({
      entityId: contractorFilterEntity === 'all' ? undefined : contractorFilterEntity,
      minAmount: contractorFilterMinAmount ? Number(contractorFilterMinAmount) : undefined,
      maxAmount: contractorFilterMaxAmount ? Number(contractorFilterMaxAmount) : undefined,
      datePreset: contractorFilterPreset,
      startDate: contractorFilterPreset === 'custom' ? parseDateInput(contractorFilterStartDate) : undefined,
      endDate: contractorFilterPreset === 'custom' ? parseDateInput(contractorFilterEndDate) : undefined,
    }),
    [
      contractorFilterEndDate,
      contractorFilterEntity,
      contractorFilterMaxAmount,
      contractorFilterMinAmount,
      contractorFilterPreset,
      contractorFilterStartDate,
    ],
  );

  const filteredClientHistory = useMemo(
    () => filterFinanceHistory(paymentHistory.filter((entry) => entry.type === 'receivable'), clientHistoryFilter),
    [clientHistoryFilter, paymentHistory],
  );

  const filteredContractorHistory = useMemo(
    () => filterFinanceHistory(paymentHistory.filter((entry) => entry.type === 'payable'), contractorHistoryFilter),
    [contractorHistoryFilter, paymentHistory],
  );

  const globalClientBalance = useMemo(() => {
    const totalAgreedAmount = clientPlans.reduce((sum, plan) => sum + plan.totalProjectAmount, 0);
    const clientPayments = paymentHistory.filter((entry) => entry.type === 'receivable');
    return getFinancialBalanceSummary(totalAgreedAmount, clientPayments);
  }, [clientPlans, paymentHistory]);

  const globalContractorBalance = useMemo(() => {
    const totalAgreedAmount = contractorPlans.reduce((sum, plan) => sum + plan.totalAgreedAmount, 0);
    const contractorPayments = paymentHistory.filter((entry) => entry.type === 'payable');
    return getFinancialBalanceSummary(totalAgreedAmount, contractorPayments);
  }, [contractorPlans, paymentHistory]);

  const saveChangeLog = (entry: Omit<FinanceChangeLog, 'id' | 'changedAt'>) => {
    setChangeLog((prev) => [
      {
        id: makeId('change'),
        changedAt: new Date(),
        ...entry,
      },
      ...prev,
    ]);
  };

  const handleClientSelection = (nextClientId: string) => {
    setClientId(nextClientId);
    setClientProjectId('');
    setSelectedInstallmentId('');
  };

  const handleClientProjectSelection = (projectId: string) => {
    setClientProjectId(projectId);
    const plan = clientPlans.find((item) => item.projectId === projectId);
    setSelectedInstallmentId(plan?.installments[0]?.id ?? '');
  };

  const handleClientInstallmentEdit = (
    installmentId: string,
    field: 'name' | 'amount' | 'estimatedPaymentDate' | 'status',
    value: string,
  ) => {
    if (!selectedClientPlan) {
      return;
    }

    const previousInstallment = selectedClientPlan.installments.find((item) => item.id === installmentId);
    if (!previousInstallment) {
      return;
    }

    setClientPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedClientPlan.projectId) {
          return plan;
        }

        return {
          ...plan,
          installments: plan.installments.map((installment) => {
            if (installment.id !== installmentId) {
              return installment;
            }

            if (field === 'name') {
              return { ...installment, name: value };
            }
            if (field === 'amount') {
              return { ...installment, amount: Number(value) || 0 };
            }
            if (field === 'status') {
              return { ...installment, status: value as 'pending' | 'paid' };
            }
            const nextDate = parseDateInput(value);
            return { ...installment, estimatedPaymentDate: nextDate ?? installment.estimatedPaymentDate };
          }),
        };
      }),
    );

    let nextValue = value;
    let previousValue = '';
    if (field === 'amount') {
      previousValue = String(previousInstallment.amount);
      nextValue = String(Number(value) || 0);
    } else if (field === 'estimatedPaymentDate') {
      previousValue = toDateInputValue(previousInstallment.estimatedPaymentDate);
      nextValue = value;
    } else if (field === 'status') {
      previousValue = previousInstallment.status;
    } else {
      previousValue = previousInstallment.name;
    }

    if (previousValue !== nextValue) {
      saveChangeLog({
        type: 'receivable',
        projectId: selectedClientPlan.projectId,
        clientId: selectedClientPlan.clientId,
        field: `${previousInstallment.name} ${field}`,
        previousValue,
        nextValue,
      });
    }
  };

  const handleAddInstallment = () => {
    if (!selectedClientPlan) {
      toast({
        title: 'Selecciona un proyecto',
        description: 'Debes elegir un proyecto antes de agregar anticipos.',
      });
      return;
    }

    const nextIndex = selectedClientPlan.installments.length + 1;
    const newInstallment = {
      id: makeId('client-installment'),
      name: `Anticipo ${nextIndex}`,
      amount: 0,
      estimatedPaymentDate: new Date(),
      status: 'pending' as const,
    };

    setClientPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedClientPlan.projectId) {
          return plan;
        }
        return {
          ...plan,
          installments: [...plan.installments, newInstallment],
        };
      }),
    );

    saveChangeLog({
      type: 'receivable',
      projectId: selectedClientPlan.projectId,
      clientId: selectedClientPlan.clientId,
      field: 'Nuevo anticipo',
      previousValue: '-',
      nextValue: newInstallment.name,
    });

    setSelectedInstallmentId(newInstallment.id);
  };

  const handleRegisterClientPayment = () => {
    if (!clientProjectId || !clientId || !selectedClientPlan) {
      toast({
        title: 'Falta información',
        description: 'Selecciona cliente y proyecto para registrar el pago.',
      });
      return;
    }

    if (!selectedInstallmentId) {
      toast({
        title: 'Selecciona un anticipo',
        description: 'Debes elegir el anticipo a pagar.',
      });
      return;
    }

    const amount = Number(clientPaymentAmount);
    const date = parseDateInput(clientPaymentDate);
    if (!amount || amount <= 0 || !date) {
      toast({
        title: 'Datos inválidos',
        description: 'Ingresa un monto válido y una fecha de pago.',
      });
      return;
    }

    const installment = selectedClientPlan.installments.find((item) => item.id === selectedInstallmentId);
    if (!installment) {
      return;
    }

    setPaymentHistory((prev) => [
      {
        id: makeId('pay-rec'),
        type: 'receivable',
        projectId: clientProjectId,
        clientId,
        lineType: 'installment',
        lineId: selectedInstallmentId,
        lineName: installment.name,
        amount,
        date,
        status: 'paid',
      },
      ...prev,
    ]);

    setClientPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedClientPlan.projectId) {
          return plan;
        }

        return {
          ...plan,
          installments: plan.installments.map((current) =>
            current.id === selectedInstallmentId ? { ...current, status: 'paid' } : current,
          ),
        };
      }),
    );

    toast({
      title: 'Pago registrado',
      description: `Se registró ${currency(amount)} para ${installment.name}.`,
    });

    setClientPaymentAmount('');
  };

  const handleContractorSelection = (nextContractorId: string) => {
    setContractorId(nextContractorId);
    setContractorProjectId('');
    setSelectedContractorLine('');
  };

  const handleContractorProjectSelection = (projectId: string) => {
    setContractorProjectId(projectId);
    const plan = contractorPlans.find(
      (item) => item.projectId === projectId && item.contractorId === contractorId,
    );
    setSelectedContractorLine(plan ? plan.phases[0]?.id ?? 'advance' : 'advance');
  };

  const handleContractorAgreedAmountChange = (value: string) => {
    if (!selectedContractorPlan) {
      return;
    }

    const previousValue = selectedContractorPlan.totalAgreedAmount;
    const parsedValue = Number(value) || 0;

    setContractorPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedContractorPlan.projectId || plan.contractorId !== selectedContractorPlan.contractorId) {
          return plan;
        }
        return {
          ...plan,
          totalAgreedAmount: parsedValue,
        };
      }),
    );

    if (previousValue !== parsedValue) {
      saveChangeLog({
        type: 'payable',
        projectId: selectedContractorPlan.projectId,
        contractorId: selectedContractorPlan.contractorId,
        field: 'Monto total acordado',
        previousValue: String(previousValue),
        nextValue: String(parsedValue),
      });
    }
  };

  const handleContractorPhaseEdit = (
    phaseId: string,
    field: 'name' | 'amount' | 'status',
    value: string,
  ) => {
    if (!selectedContractorPlan) {
      return;
    }

    const previousPhase = selectedContractorPlan.phases.find((phase) => phase.id === phaseId);
    if (!previousPhase) {
      return;
    }

    setContractorPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedContractorPlan.projectId || plan.contractorId !== selectedContractorPlan.contractorId) {
          return plan;
        }

        return {
          ...plan,
          phases: plan.phases.map((phase) => {
            if (phase.id !== phaseId) {
              return phase;
            }

            if (field === 'name') {
              return { ...phase, name: value };
            }
            if (field === 'amount') {
              return { ...phase, amount: Number(value) || 0 };
            }
            return { ...phase, status: value as 'pending' | 'paid' };
          }),
        };
      }),
    );

    const previousValue = field === 'amount' ? String(previousPhase.amount) : field === 'status' ? previousPhase.status : previousPhase.name;
    const nextValue = field === 'amount' ? String(Number(value) || 0) : value;

    if (previousValue !== nextValue) {
      saveChangeLog({
        type: 'payable',
        projectId: selectedContractorPlan.projectId,
        contractorId: selectedContractorPlan.contractorId,
        field: `${previousPhase.name} ${field}`,
        previousValue,
        nextValue,
      });
    }
  };

  const handleAddDefaultPhases = () => {
    if (!selectedContractorPlan) {
      toast({
        title: 'Selecciona un proyecto',
        description: 'Debes elegir proyecto y contratista para añadir fases.',
      });
      return;
    }

    if (selectedContractorPlan.phases.length > 0) {
      toast({
        title: 'Fases ya definidas',
        description: 'Este proyecto ya tiene una estructura de fases configurada.',
      });
      return;
    }

    const phases = DEFAULT_CONTRACTOR_PHASES.map((phase) => ({
      ...phase,
      amount: 0,
      status: 'pending' as const,
    }));

    setContractorPlans((prev) =>
      prev.map((plan) => {
        if (plan.projectId !== selectedContractorPlan.projectId || plan.contractorId !== selectedContractorPlan.contractorId) {
          return plan;
        }

        return {
          ...plan,
          phases,
        };
      }),
    );

    saveChangeLog({
      type: 'payable',
      projectId: selectedContractorPlan.projectId,
      contractorId: selectedContractorPlan.contractorId,
      field: 'Estructura de fases',
      previousValue: 'Sin fases',
      nextValue: 'Fases por defecto cargadas',
    });

    setSelectedContractorLine(phases[0]?.id ?? 'advance');
  };

  const handleRegisterContractorPayment = () => {
    if (!contractorProjectId || !contractorId || !selectedContractorPlan) {
      toast({
        title: 'Falta información',
        description: 'Selecciona contratista y proyecto para registrar el pago.',
      });
      return;
    }

    if (!selectedContractorLine) {
      toast({
        title: 'Selecciona fase o anticipo',
        description: 'Debes indicar qué se está pagando.',
      });
      return;
    }

    const amount = Number(contractorPaymentAmount);
    const date = parseDateInput(contractorPaymentDate);
    if (!amount || amount <= 0 || !date) {
      toast({
        title: 'Datos inválidos',
        description: 'Ingresa un monto válido y una fecha de pago.',
      });
      return;
    }

    const isAdvance = selectedContractorLine === 'advance';
    const selectedPhase = selectedContractorPlan.phases.find((phase) => phase.id === selectedContractorLine);
    const lineName = isAdvance ? 'Anticipo Especial' : selectedPhase?.name ?? 'Fase';

    setPaymentHistory((prev) => [
      {
        id: makeId('pay-pay'),
        type: 'payable',
        projectId: contractorProjectId,
        contractorId,
        lineType: isAdvance ? 'advance' : 'phase',
        lineId: isAdvance ? 'special-advance' : selectedContractorLine,
        lineName,
        amount,
        date,
        status: 'paid',
      },
      ...prev,
    ]);

    if (!isAdvance) {
      setContractorPlans((prev) =>
        prev.map((plan) => {
          if (plan.projectId !== selectedContractorPlan.projectId || plan.contractorId !== selectedContractorPlan.contractorId) {
            return plan;
          }

          return {
            ...plan,
            phases: plan.phases.map((phase) =>
              phase.id === selectedContractorLine ? { ...phase, status: 'paid' } : phase,
            ),
          };
        }),
      );
    }

    toast({
      title: 'Pago registrado',
      description: `Se registró ${currency(amount)} para ${lineName}.`,
    });

    setContractorPaymentAmount('');
  };

  return (
    <Tabs defaultValue="clients" className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="clients" className="gap-2">
          <HandCoins className="w-4 h-4" />
          Clientes (Cuentas por Cobrar)
        </TabsTrigger>
        <TabsTrigger value="contractors" className="gap-2">
          <Save className="w-4 h-4" />
          Contratistas (Cuentas por Pagar)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="clients" className="space-y-6">
        <Card className="p-4 border border-border bg-muted">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total acordado</p>
              <p className="text-2xl font-bold">{currency(globalClientBalance.totalAgreedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total cobrado</p>
              <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                {currency(globalClientBalance.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                {currency(globalClientBalance.remainingBalance)}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-4 border border-border">
            <h3 className="text-lg font-semibold">Paso 1: Selección</h3>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={handleClientSelection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTS.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proyecto</Label>
              <Select value={clientProjectId} onValueChange={handleClientProjectSelection} disabled={!clientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {clientProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Monto total</p>
                <p className="font-semibold">{currency(selectedClientPlan?.totalProjectAmount ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total pagado</p>
                <p className="font-semibold" style={{ color: '#10b981' }}>
                  {currency(selectedClientBalance?.totalPaid ?? 0)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p className="font-semibold" style={{ color: '#ef4444' }}>
                  {currency(selectedClientBalance?.remainingBalance ?? 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Paso 2: Anticipos</h3>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleAddInstallment}>
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3 max-h-85 overflow-y-auto pr-1">
              {selectedClientPlan?.installments.map((installment) => (
                <div key={installment.id} className="border rounded-md p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={installment.name}
                      onChange={(event) =>
                        handleClientInstallmentEdit(installment.id, 'name', event.target.value)
                      }
                      placeholder="Nombre del anticipo"
                    />
                    <Input
                      type="number"
                      value={String(installment.amount)}
                      onChange={(event) =>
                        handleClientInstallmentEdit(installment.id, 'amount', event.target.value)
                      }
                      placeholder="Monto"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={toDateInputValue(installment.estimatedPaymentDate)}
                      onChange={(event) =>
                        handleClientInstallmentEdit(
                          installment.id,
                          'estimatedPaymentDate',
                          event.target.value,
                        )
                      }
                    />
                    <Select
                      value={installment.status}
                      onValueChange={(value) =>
                        handleClientInstallmentEdit(installment.id, 'status', value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {!selectedClientPlan && (
                <p className="text-sm text-muted-foreground">Selecciona un proyecto para definir anticipos.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-4 space-y-4 border border-border">
          <h3 className="text-lg font-semibold">Paso 3: Registrar pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Anticipo</Label>
              <Select value={selectedInstallmentId} onValueChange={setSelectedInstallmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona anticipo" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClientPlan?.installments.map((installment) => (
                    <SelectItem key={installment.id} value={installment.id}>
                      {installment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={clientPaymentAmount}
                onChange={(event) => setClientPaymentAmount(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={clientPaymentDate}
                onChange={(event) => setClientPaymentDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={handleRegisterClientPayment}>
                <CheckCircle2 className="w-4 h-4" />
                Guardar pago
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4 border border-border">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4" />
            <h3 className="text-lg font-semibold">Recordatorios y vencimientos</h3>
          </div>
          <div className="space-y-2">
            {installmentAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay alertas de vencimiento pendientes.</p>
            )}
            {installmentAlerts.map((alert) => (
              <Alert key={alert.installmentId} variant={alert.type === 'overdue' ? 'destructive' : 'default'}>
                {alert.type === 'overdue' ? <AlertCircle /> : <CalendarClock />}
                <AlertTitle>
                  {alert.type === 'overdue' ? 'Pago vencido' : 'Pago próximo a vencer'}
                </AlertTitle>
                <AlertDescription>
                  <p>
                    {alert.clientName} - {alert.projectName} - {alert.installmentName}
                  </p>
                  <p>
                    Fecha estimada: {alert.dueDate.toLocaleDateString('es-BO')} (
                    {alert.type === 'overdue' ? `${Math.abs(alert.diffDays)} días de retraso` : `${alert.diffDays} días`})
                  </p>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-4 border border-border">
          <h3 className="text-lg font-semibold">Historial de cobros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Select value={clientFilterEntity} onValueChange={setClientFilterEntity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {CLIENTS.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={clientFilterPreset}
              onValueChange={(value) => setClientFilterPreset(value as DateRangePreset)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Día</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="year">Año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={clientFilterMinAmount}
              onChange={(event) => setClientFilterMinAmount(event.target.value)}
              placeholder="Monto mínimo"
            />
            <Input
              type="number"
              value={clientFilterMaxAmount}
              onChange={(event) => setClientFilterMaxAmount(event.target.value)}
              placeholder="Monto máximo"
            />
            <Input
              type="date"
              value={clientFilterStartDate}
              onChange={(event) => setClientFilterStartDate(event.target.value)}
              disabled={clientFilterPreset !== 'custom'}
            />
            <Input
              type="date"
              value={clientFilterEndDate}
              onChange={(event) => setClientFilterEndDate(event.target.value)}
              disabled={clientFilterPreset !== 'custom'}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Anticipo</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Monto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientHistory.map((entry) => {
                  const client = CLIENTS.find((item) => item.id === entry.clientId);
                  const project = PROJECTS.find((item) => item.id === entry.projectId);

                  return (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{client?.name ?? '-'}</td>
                      <td className="py-3 px-4">{project?.name ?? '-'}</td>
                      <td className="py-3 px-4">{entry.lineName}</td>
                      <td className="py-3 px-4 text-right font-mono">{currency(entry.amount)}</td>
                      <td className="py-3 px-4">{entry.date.toLocaleDateString('es-BO')}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-green-100 text-green-800">Pagado</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredClientHistory.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay registros para los filtros seleccionados.</p>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="contractors" className="space-y-6">
        <Card className="p-4 border border-border bg-muted">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total acordado</p>
              <p className="text-2xl font-bold">{currency(globalContractorBalance.totalAgreedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total pagado</p>
              <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                {currency(globalContractorBalance.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                {currency(globalContractorBalance.remainingBalance)}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="p-4 space-y-4 border border-border">
            <h3 className="text-lg font-semibold">Paso 1: Selección</h3>
            <div className="space-y-2">
              <Label>Contratista</Label>
              <Select value={contractorId} onValueChange={handleContractorSelection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona contratista" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACTORS.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proyecto</Label>
              <Select
                value={contractorProjectId}
                onValueChange={handleContractorProjectSelection}
                disabled={!contractorId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {contractorProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paso 2: Monto total acordado</Label>
              <Input
                type="number"
                value={selectedContractorPlan?.totalAgreedAmount ?? 0}
                onChange={(event) => handleContractorAgreedAmountChange(event.target.value)}
                disabled={!selectedContractorPlan}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Acordado</p>
                <p className="font-semibold">{currency(selectedContractorBalance?.totalAgreedAmount ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="font-semibold" style={{ color: '#10b981' }}>
                  {currency(selectedContractorBalance?.totalPaid ?? 0)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="font-semibold" style={{ color: '#ef4444' }}>
                  {currency(selectedContractorBalance?.remainingBalance ?? 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Paso 3: Fases de pago</h3>
              <Button size="sm" variant="outline" onClick={handleAddDefaultPhases}>
                Cargar fases por defecto
              </Button>
            </div>

            <div className="space-y-3 max-h-85 overflow-y-auto pr-1">
              {selectedContractorPlan?.phases.map((phase) => (
                <div key={phase.id} className="border rounded-md p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={phase.name}
                      onChange={(event) =>
                        handleContractorPhaseEdit(phase.id, 'name', event.target.value)
                      }
                      placeholder="Nombre de fase"
                    />
                    <Input
                      type="number"
                      value={String(phase.amount)}
                      onChange={(event) =>
                        handleContractorPhaseEdit(phase.id, 'amount', event.target.value)
                      }
                      placeholder="Monto"
                    />
                  </div>
                  <Select
                    value={phase.status}
                    onValueChange={(value) => handleContractorPhaseEdit(phase.id, 'status', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {!selectedContractorPlan && (
                <p className="text-sm text-muted-foreground">Selecciona un proyecto para configurar fases.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-4 space-y-4 border border-border">
          <h3 className="text-lg font-semibold">Paso 4: Registrar pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Tipo / Fase</Label>
              <Select value={selectedContractorLine} onValueChange={setSelectedContractorLine}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">Anticipo especial</SelectItem>
                  {selectedContractorPlan?.phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={contractorPaymentAmount}
                onChange={(event) => setContractorPaymentAmount(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={contractorPaymentDate}
                onChange={(event) => setContractorPaymentDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={handleRegisterContractorPayment}>
                <CheckCircle2 className="w-4 h-4" />
                Guardar pago
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4 border border-border">
          <h3 className="text-lg font-semibold">Historial de pagos a contratistas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Select value={contractorFilterEntity} onValueChange={setContractorFilterEntity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Contratista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los contratistas</SelectItem>
                {CONTRACTORS.map((contractor) => (
                  <SelectItem key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={contractorFilterPreset}
              onValueChange={(value) => setContractorFilterPreset(value as DateRangePreset)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Día</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="year">Año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={contractorFilterMinAmount}
              onChange={(event) => setContractorFilterMinAmount(event.target.value)}
              placeholder="Monto mínimo"
            />
            <Input
              type="number"
              value={contractorFilterMaxAmount}
              onChange={(event) => setContractorFilterMaxAmount(event.target.value)}
              placeholder="Monto máximo"
            />
            <Input
              type="date"
              value={contractorFilterStartDate}
              onChange={(event) => setContractorFilterStartDate(event.target.value)}
              disabled={contractorFilterPreset !== 'custom'}
            />
            <Input
              type="date"
              value={contractorFilterEndDate}
              onChange={(event) => setContractorFilterEndDate(event.target.value)}
              disabled={contractorFilterPreset !== 'custom'}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Contratista</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fase</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Monto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractorHistory.map((entry) => {
                  const contractor = CONTRACTORS.find((item) => item.id === entry.contractorId);
                  const project = PROJECTS.find((item) => item.id === entry.projectId);
                  const typeLabel = entry.lineType === 'advance' ? 'Anticipo' : 'Fase';

                  return (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{contractor?.name ?? '-'}</td>
                      <td className="py-3 px-4">{project?.name ?? '-'}</td>
                      <td className="py-3 px-4">{typeLabel}</td>
                      <td className="py-3 px-4">{entry.lineType === 'phase' ? entry.lineName : '-'}</td>
                      <td className="py-3 px-4 text-right font-mono">{currency(entry.amount)}</td>
                      <td className="py-3 px-4">{entry.date.toLocaleDateString('es-BO')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredContractorHistory.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay registros para los filtros seleccionados.</p>
          )}
        </Card>
      </TabsContent>

      <Card className="p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Trazabilidad de cambios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Módulo</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Campo</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Antes</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Después</th>
              </tr>
            </thead>
            <tbody>
              {changeLog.map((entry) => {
                const project = PROJECTS.find((item) => item.id === entry.projectId);
                return (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">{entry.changedAt.toLocaleDateString('es-BO')}</td>
                    <td className="py-3 px-4">
                      <Badge className={entry.type === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                        {entry.type === 'receivable' ? 'Clientes' : 'Contratistas'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{project?.name ?? '-'}</td>
                    <td className="py-3 px-4">{entry.field}</td>
                    <td className="py-3 px-4">{entry.previousValue}</td>
                    <td className="py-3 px-4">{entry.nextValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Tabs>
  );
}
