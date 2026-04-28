'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { PrequotationsModule } from '@/components/modules/prequotations/prequotations-module';

export default function PrequotationsPage() {
  return (
    <AppLayout>
      <PrequotationsModule />
    </AppLayout>
  );
}
