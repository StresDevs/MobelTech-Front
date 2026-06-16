'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

type PageLoadingStateProps = {
  title: string;
  description: string;
  preview?: ReactNode;
};

export function PageLoadingState({
  title,
  description,
  preview,
}: PageLoadingStateProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/95 px-8 py-12">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#eab676] via-[#f4d19f] to-[#d4a263]" />
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#eab676]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#eab676] animate-spin" />
          <div className="absolute inset-4 rounded-full bg-[#eab676]/15" />
        </div>
        <p className="mt-5 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {preview ? <div className="mt-6 w-full max-w-3xl">{preview}</div> : null}
      </div>
    </Card>
  );
}
