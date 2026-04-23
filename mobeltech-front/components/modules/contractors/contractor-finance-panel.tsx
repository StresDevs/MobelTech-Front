'use client';

import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CONTRACTORS, CONTRACTOR_PROJECT_PAYMENT_PLANS, FINANCE_PAYMENT_HISTORY, PROJECTS, CLIENTS } from '@/lib/mock-data';
import { CURRENCY_FORMAT } from '@/lib/constants';
import { useRole } from '@/hooks/use-role-context';
import { ContractorInternalPaymentRecord, ContractorPaymentPdfSnapshot, ContractorPaymentType } from '@/lib/types';

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatCurrency(amount: number) {
  return `${CURRENCY_FORMAT}${amount.toLocaleString('es-BO')}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-BO');
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function combineDateWithCurrentTime(baseDate: Date, now = new Date()) {
  const next = new Date(baseDate);
  next.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return next;
}

async function loadLogoDataUrl() {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.src = '/icon-light-32x32.png';
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
  });
}

export function ContractorFinancePanel({ contractorId }: { contractorId: string }) {
  const { userName } = useRole();
  const contractor = CONTRACTORS.find((item) => item.id === contractorId);

  const contractorPlans = useMemo(
    () => CONTRACTOR_PROJECT_PAYMENT_PLANS.filter((plan) => plan.contractorId === contractorId),
    [contractorId],
  );

  const contractorProjects = useMemo(
    () => PROJECTS.filter((project) => contractorPlans.some((plan) => plan.projectId === project.id)),
    [contractorPlans],
  );

  const initialRecords = useMemo(() => {
    return FINANCE_PAYMENT_HISTORY
      .filter((item) => item.type === 'payable' && item.contractorId === contractorId)
      .map((item) => {
        const project = PROJECTS.find((p) => p.id === item.projectId);
        const client = project ? CLIENTS.find((c) => c.id === project.clientId) : undefined;
        const plan = contractorPlans.find((p) => p.projectId === item.projectId);
        const historicPaid = FINANCE_PAYMENT_HISTORY
          .filter(
            (entry) =>
              entry.type === 'payable' &&
              entry.contractorId === contractorId &&
              entry.projectId === item.projectId &&
              entry.date.getTime() <= item.date.getTime(),
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
        const totalAgreed = plan?.totalAgreedAmount ?? historicPaid;

        const snapshot: ContractorPaymentPdfSnapshot = {
          companyName: 'MobileTech',
          title: 'Comprobante de Pago a Contratista',
          paymentDate: formatDate(item.date),
          paymentTime: formatTime(item.date),
          registeredBy: 'Sistema',
          contractorName: contractor?.name ?? 'Contratista',
          projectName: project?.name ?? 'Proyecto',
          clientName: client?.name,
          paymentType: item.lineType === 'advance' ? 'advance' : 'phase',
          phaseName: item.lineType === 'phase' ? item.lineName : undefined,
          amountPaid: item.amount,
          totalAgreedAmount: totalAgreed,
          totalPaidSoFar: historicPaid,
          remainingBalance: Math.max(totalAgreed - historicPaid, 0),
          snapshotCreatedAt: item.date,
        };

        const record: ContractorInternalPaymentRecord = {
          id: item.id,
          contractorId,
          projectId: item.projectId,
          paymentType: snapshot.paymentType,
          phaseName: snapshot.phaseName,
          amount: item.amount,
          paymentDateTime: item.date,
          registeredBy: 'Sistema',
          status: 'confirmed',
          pdfSnapshot: snapshot,
        };

        return record;
      })
      .sort((a, b) => b.paymentDateTime.getTime() - a.paymentDateTime.getTime());
  }, [contractor?.name, contractorId, contractorPlans]);

  const [records, setRecords] = useState<ContractorInternalPaymentRecord[]>(initialRecords);
  const [projectId, setProjectId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<ContractorPaymentType>('phase');
  const [phaseName, setPhaseName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [observations, setObservations] = useState<string>('');
  const [lastRecordId, setLastRecordId] = useState<string>('');

  const selectedPlan = useMemo(
    () => contractorPlans.find((plan) => plan.projectId === projectId),
    [contractorPlans, projectId],
  );

  const selectedProject = useMemo(
    () => PROJECTS.find((project) => project.id === projectId),
    [projectId],
  );

  const selectedClient = useMemo(
    () => (selectedProject ? CLIENTS.find((client) => client.id === selectedProject.clientId) : undefined),
    [selectedProject],
  );

  const selectedPhaseOptions = selectedPlan?.phases ?? [];

  const selectedProjectRecords = useMemo(
    () => records.filter((record) => record.projectId === projectId && record.status === 'confirmed'),
    [projectId, records],
  );

  const selectedProjectTotals = useMemo(() => {
    const totalAgreed = selectedPlan?.totalAgreedAmount ?? 0;
    const totalPaid = selectedProjectRecords.reduce((sum, record) => sum + record.amount, 0);
    return {
      totalAgreed,
      totalPaid,
      remaining: Math.max(totalAgreed - totalPaid, 0),
    };
  }, [selectedPlan, selectedProjectRecords]);

  const lastRecord = useMemo(
    () => records.find((record) => record.id === lastRecordId),
    [lastRecordId, records],
  );

  const generatePdf = async (record: ContractorInternalPaymentRecord, mode: 'view' | 'download') => {
    const snapshot = record.pdfSnapshot;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadLogoDataUrl();

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 10, 14, 14);
    } else {
      doc.setDrawColor(120, 120, 120);
      doc.rect(14, 10, 14, 14);
      doc.setFontSize(8);
      doc.text('MT', 19, 18);
    }

    doc.setFontSize(14);
    doc.text(snapshot.companyName, 32, 15);
    doc.setFontSize(12);
    doc.text(snapshot.title, 32, 22);

    let y = 34;

    doc.setFontSize(11);
    doc.text('Información general', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Fecha del pago: ${snapshot.paymentDate}`, 14, y);
    y += 6;
    doc.text(`Hora del pago: ${snapshot.paymentTime}`, 14, y);
    y += 6;
    doc.text(`Usuario: ${snapshot.registeredBy}`, 14, y);

    y += 10;
    doc.setFontSize(11);
    doc.text('Datos del contratista', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Contratista: ${snapshot.contractorName}`, 14, y);
    y += 6;
    doc.text(`Proyecto: ${snapshot.projectName}`, 14, y);
    y += 6;
    doc.text(`Cliente final: ${snapshot.clientName ?? 'N/A'}`, 14, y);

    y += 10;
    doc.setFontSize(11);
    doc.text('Detalle del pago', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Tipo: ${snapshot.paymentType === 'advance' ? 'Adelanto' : 'Fase'}`, 14, y);
    y += 6;
    doc.text(`Fase: ${snapshot.phaseName ?? 'No aplica'}`, 14, y);
    y += 6;
    doc.text(`Monto pagado: ${formatCurrency(snapshot.amountPaid)}`, 14, y);

    y += 10;
    doc.setFontSize(11);
    doc.text('Estado financiero del proyecto', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Monto total acordado: ${formatCurrency(snapshot.totalAgreedAmount)}`, 14, y);
    y += 6;
    doc.text(`Total pagado hasta el momento: ${formatCurrency(snapshot.totalPaidSoFar)}`, 14, y);
    y += 6;
    doc.text(`Saldo pendiente: ${formatCurrency(snapshot.remainingBalance)}`, 14, y);

    if (snapshot.observations) {
      y += 10;
      doc.setFontSize(11);
      doc.text('Observaciones', 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(snapshot.observations, 14, y, { maxWidth: 180 });
    }

    const footerY = 280;
    doc.setFontSize(9);
    doc.text('Documento generado automáticamente por el sistema MobileTech', 14, footerY);
    doc.text(`Fecha de generación del PDF: ${new Date().toLocaleString('es-BO')}`, 14, footerY + 5);

    const safeProject = snapshot.projectName.replace(/[^a-zA-Z0-9-_]+/g, '_');
    const filename = `comprobante_pago_${safeProject}_${record.id}.pdf`;

    if (mode === 'download') {
      doc.save(filename);
      return;
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleRegisterPayment = () => {
    if (!projectId || !selectedPlan) {
      alert('Selecciona un proyecto antes de registrar el pago.');
      return;
    }

    if (paymentType === 'phase' && !phaseName) {
      alert('Selecciona una fase para registrar este pago.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    const parsedDate = new Date(paymentDate);
    if (Number.isNaN(parsedDate.getTime())) {
      alert('Selecciona una fecha de pago válida.');
      return;
    }

    const paymentDateTime = combineDateWithCurrentTime(parsedDate);
    const currentPaid = records
      .filter((record) => record.projectId === projectId && record.status === 'confirmed')
      .reduce((sum, record) => sum + record.amount, 0);
    const totalPaidSoFar = currentPaid + parsedAmount;

    const snapshot: ContractorPaymentPdfSnapshot = {
      companyName: 'MobileTech',
      title: 'Comprobante de Pago a Contratista',
      paymentDate: formatDate(paymentDateTime),
      paymentTime: formatTime(paymentDateTime),
      registeredBy: userName,
      contractorName: contractor?.name ?? 'Contratista',
      projectName: selectedProject?.name ?? 'Proyecto',
      clientName: selectedClient?.name,
      paymentType,
      phaseName: paymentType === 'phase' ? phaseName : undefined,
      amountPaid: parsedAmount,
      totalAgreedAmount: selectedPlan.totalAgreedAmount,
      totalPaidSoFar,
      remainingBalance: Math.max(selectedPlan.totalAgreedAmount - totalPaidSoFar, 0),
      observations: observations.trim() || undefined,
      snapshotCreatedAt: new Date(paymentDateTime),
    };

    const record: ContractorInternalPaymentRecord = {
      id: makeId('contr-pay'),
      contractorId,
      projectId,
      paymentType,
      phaseName: paymentType === 'phase' ? phaseName : undefined,
      amount: parsedAmount,
      paymentDateTime,
      registeredBy: userName,
      observations: observations.trim() || undefined,
      status: 'confirmed',
      pdfSnapshot: snapshot,
    };

    setRecords((prev) => [record, ...prev]);
    setLastRecordId(record.id);
    setAmount('');
    setObservations('');
  };

  const handleVoidPayment = (recordId: string) => {
    const reason = window.prompt('Motivo de anulación (se guardará en historial):', 'Anulación administrativa');
    if (reason === null) {
      return;
    }

    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId || record.status === 'voided') {
          return record;
        }

        return {
          ...record,
          status: 'voided',
          voidedAt: new Date(),
          voidedBy: userName,
          observations: record.observations
            ? `${record.observations} | ANULADO: ${reason}`
            : `ANULADO: ${reason}`,
        };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border border-border bg-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Contratista</p>
            <p className="text-lg font-semibold">{contractor?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pagos confirmados</p>
            <p className="text-lg font-semibold">
              {records.filter((record) => record.status === 'confirmed').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Registros anulados</p>
            <p className="text-lg font-semibold">
              {records.filter((record) => record.status === 'voided').length}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4 border border-border">
        <h3 className="text-lg font-semibold">Registrar pago a contratista</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
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
            <Label>Tipo de pago</Label>
            <Select value={paymentType} onValueChange={(value) => setPaymentType(value as ContractorPaymentType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Fase</SelectItem>
                <SelectItem value="advance">Adelanto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === 'phase' && (
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={phaseName} onValueChange={setPhaseName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona fase" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPhaseOptions.map((phase) => (
                    <SelectItem key={phase.id} value={phase.name}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto pagado</Label>
            <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label>Fecha de pago</Label>
            <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observaciones (opcional)</Label>
            <Input
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Detalle interno del pago"
            />
          </div>
        </div>

        {projectId && selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Total acordado</p>
              <p className="font-semibold">{formatCurrency(selectedProjectTotals.totalAgreed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagado confirmado</p>
              <p className="font-semibold">{formatCurrency(selectedProjectTotals.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="font-semibold">{formatCurrency(selectedProjectTotals.remaining)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleRegisterPayment}>Guardar pago</Button>
          {lastRecord && (
            <Button variant="outline" onClick={() => generatePdf(lastRecord, 'download')}>
              Generar PDF
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-4 border border-border">
        <h3 className="text-lg font-semibold">Historial de pagos (solo lectura)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Proyecto</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fase</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Monto</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Hora</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Usuario</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">PDF</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const project = PROJECTS.find((item) => item.id === record.projectId);
                return (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">{project?.name ?? '-'}</td>
                    <td className="py-3 px-4">{record.paymentType === 'advance' ? 'Adelanto' : 'Fase'}</td>
                    <td className="py-3 px-4">{record.phaseName ?? '-'}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(record.amount)}</td>
                    <td className="py-3 px-4">{formatDate(record.paymentDateTime)}</td>
                    <td className="py-3 px-4">{formatTime(record.paymentDateTime)}</td>
                    <td className="py-3 px-4">{record.registeredBy}</td>
                    <td className="py-3 px-4">
                      <Badge className={record.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {record.status === 'confirmed' ? 'Confirmado' : 'Anulado'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => generatePdf(record, 'view')}>
                          Ver PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => generatePdf(record, 'download')}>
                          Descargar PDF
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={record.status !== 'confirmed'}
                        onClick={() => handleVoidPayment(record.id)}
                      >
                        Anular
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
