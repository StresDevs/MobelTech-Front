'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { UsersModule } from '@/components/modules/users/users-module';

export default function UsersPage() {
  return (
    <AppLayout>
      <UsersModule />
    </AppLayout>
  );
}
