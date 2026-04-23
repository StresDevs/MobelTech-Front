'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { ContractorWarehouse } from '@/components/modules/contractors/contractor-warehouse';
import { useRole } from '@/hooks/use-role-context';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export default function MyMaterialsPage() {
  const { userName } = useRole();

  // En una aplicación real, obtendrías el ID del contratista del usuario autenticado
  // Por ahora usamos el primer contratista (contr-1) para la demostración
  const contractorId = 'contr-1';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mi Almacén - Solicitar Materiales</h1>
            <p className="text-muted-foreground mt-2">Selecciona los materiales que necesitas y envía tu solicitud para aprobación</p>
          </div>
          <Link href="/my-finance">
            <Button variant="outline" className="gap-2">
              <Wallet className="w-4 h-4" />
              Mis Finanzas
            </Button>
          </Link>
        </div>
        <ContractorWarehouse contractorId={contractorId} />
      </div>
    </AppLayout>
  );
}
