'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { PrequotationsModule } from '@/components/modules/prequotations/prequotations-module';
import { LocalDataProvider } from '@/lib/contexts/LocalDataContext';

export default function PrequotationsPage() {
  return (
    <AppLayout>
      <LocalDataProvider>
        <PrequotationsModule />
      </LocalDataProvider>
    </AppLayout>
  );
}
