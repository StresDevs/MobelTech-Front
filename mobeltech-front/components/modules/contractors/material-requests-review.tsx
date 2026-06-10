"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PROJECTS } from '@/lib/mock-data';
import { useLocalData } from '@/lib/contexts/LocalDataContext';
import { STATUS_LABELS } from '@/lib/constants';
import { Check, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RequestState {
  [key: string]: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionComments?: string;
  };
}

export function MaterialRequestsReview() {
  const { materialRequests: requests, materials, contractors, updateMaterialRequest } = useLocalData();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectionComments, setRejectionComments] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const handleApprove = (requestId: string) => {
    updateMaterialRequest(requestId, { status: 'approved' });
    setSelectedRequest(null);
  };

  const handleReject = (requestId: string) => {
    if (!rejectionComments.trim()) {
      alert('Por favor ingresa un comentario sobre el rechazo');
      return;
    }

    updateMaterialRequest(requestId, { status: 'rejected', rejectionComments });
    setRejectionComments('');
    setSelectedRequest(null);
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const RequestCard = ({ request }: { request: typeof requests[0] }) => {
    const contractor = contractors.find(c => c.id === request.contractorId);
    const project = request.projectId ? PROJECTS.find(p => p.id === request.projectId) : null;

    const total = request.items.reduce((sum, item) => {
      const material = materials.find(m => m.id === item.materialId);
      return sum + (material?.unitPrice || 0) * item.quantity;
    }, 0);

    return (
      <Card
        className="p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
        style={{ borderLeftColor: getStatusColor(request.status) }}
        onClick={() => setSelectedRequest(request.id)}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{contractor?.name}</h3>
            {project && <p className="text-sm text-muted-foreground">{project.name}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Solicitado: {new Date(request.requestDate).toLocaleDateString('es-BO')}
            </p>
          </div>
          <Badge style={{ backgroundColor: getStatusColor(request.status) }}>
            {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Materiales ({request.items.length}):</p>
          <div className="text-xs text-muted-foreground space-y-1">
            {request.items.map(item => {
              const material = materials.find(m => m.id === item.materialId);
              return (
                <p key={item.materialId}>
                  • {material?.name} - {item.quantity} {material?.unit}
                </p>
              );
            })}
          </div>
        </div>

        {/* Totals/prices are omitted in the admin review per user request */}
      </Card>
    );
  };

  const selectedReq = requests.find(r => r.id === selectedRequest);
  const contractor = selectedReq ? contractors.find(c => c.id === selectedReq.contractorId) : null;
  const project = selectedReq?.projectId ? PROJECTS.find(p => p.id === selectedReq.projectId) : null;

  const total = selectedReq
    ? selectedReq.items.reduce((sum, item) => {
        const material = materials.find(m => m.id === item.materialId);
        return sum + (material?.unitPrice || 0) * item.quantity;
      }, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitudes de Material - Contratistas</h1>
        <p className="text-muted-foreground mt-2">Revisa y aprueba las solicitudes de materiales de los contratistas</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Pendientes ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="w-4 h-4" />
            Aprobadas ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="w-4 h-4" />
            Rechazadas ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6 space-y-4">
          {approvedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes aprobadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6 space-y-4">
          {rejectedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <X className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes rechazadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalles */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Solicitud de Material</DialogTitle>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Contratista</p>
                  <p className="font-semibold">{contractor?.name}</p>
                </div>
                {project && (
                  <div>
                    <p className="text-xs text-muted-foreground">Proyecto</p>
                    <p className="font-semibold">{project.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Solicitud</p>
                  <p className="font-semibold">{new Date(selectedReq.requestDate).toLocaleDateString('es-BO')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge style={{ backgroundColor: getStatusColor(selectedReq.status) }}>
                    {STATUS_LABELS[selectedReq.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-3">Materiales Solicitados:</h4>
                <div className="space-y-2">
                  {selectedReq.items.map(item => {
                    const material = materials.find(m => m.id === item.materialId);
                    const subtotal = (material?.unitPrice || 0) * item.quantity;
                    
                    return (
                      <div key={item.materialId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{material?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {material?.unit} × {CURRENCY_FORMAT}{material?.unitPrice}
                          </p>
                          {item.notes && (
                            <p className="text-xs italic text-muted-foreground mt-1">Notas: {item.notes}</p>
                          )}
                        </div>
                        <span className="font-semibold">{CURRENCY_FORMAT}{subtotal}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-3 pt-3 border-t border-border">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total:</p>
                    <p className="text-2xl font-bold">{CURRENCY_FORMAT}{total}</p>
                  </div>
                </div>
              </div>

              {selectedReq.status === 'rejected' && selectedReq.rejectionComments && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Motivo del Rechazo:</p>
                  <p className="text-sm text-red-600">{selectedReq.rejectionComments}</p>
                </div>
              )}

              {selectedReq.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comentarios (si rechazas):</label>
                    <Textarea
                      placeholder="Especifica qué necesita ser modificado en la solicitud..."
                      value={rejectionComments}
                      onChange={(e) => setRejectionComments(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedReq.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedReq.id)}
                      style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
