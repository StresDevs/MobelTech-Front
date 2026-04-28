'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CLIENTS } from '@/lib/mock-data';
import { Phone, MapPin, Mail } from 'lucide-react';

interface ClientDetailsModalProps {
  clientId: string;
}

export function ClientDetailsModal({ clientId }: ClientDetailsModalProps) {
  const client = CLIENTS.find(c => c.id === clientId);

  if (!client) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium">Dirección</p>
              <p className="text-sm text-muted-foreground">{client.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
}
