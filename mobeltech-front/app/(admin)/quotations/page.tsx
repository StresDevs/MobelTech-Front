'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { QuotationsModule } from '@/components/modules/quotations/quotations-module';

export default function QuotationsPage() {
  return (
    <AppLayout>
      <QuotationsModule />
    </AppLayout>
  );
}
