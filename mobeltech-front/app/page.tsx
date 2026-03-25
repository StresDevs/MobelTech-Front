'use client';

import { AppLayout } from '@/components/layout/app-layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-2xl px-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-6xl mx-auto mb-6"
            style={{ backgroundColor: '#d6a85a' }}
          >
            🛋️
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#2e2e2e' }}>
            Bienvenido a MobelTech
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Sistema administrativo integrado para la gestión completa de proyectos de mobiliario personalizado
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold mb-2">Panel Ejecutivo</h3>
              <p className="text-sm text-muted-foreground">KPIs, reportes y análisis financiero</p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold mb-2">Clientes y Cotizaciones</h3>
              <p className="text-sm text-muted-foreground">Gestión de clientes y presupuestos</p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-2">⚙️</div>
              <h3 className="font-semibold mb-2">Producción</h3>
              <p className="text-sm text-muted-foreground">Seguimiento de órdenes y contratistas</p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-2">📦</div>
              <h3 className="font-semibold mb-2">Inventario y Almacén</h3>
              <p className="text-sm text-muted-foreground">Materiales, proveedores y stock</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button 
                size="lg"
                className="text-white"
                style={{ backgroundColor: '#2e2e2e' }}
              >
                Ir al Panel
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Ver Documentación
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            Sistema en modo demostración - Todos los datos son ficticios
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
