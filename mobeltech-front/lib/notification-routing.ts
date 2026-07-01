import type { UserRole } from './types';

type NotificationLike = {
  message: string;
  relatedJobId?: string | null;
};

function normalizeMessage(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function withJobContext(path: string, relatedJobId?: string | null) {
  if (!relatedJobId) return path;
  const params = new URLSearchParams({ jobId: relatedJobId });
  return `${path}?${params.toString()}`;
}

export function getNotificationTarget(notification: NotificationLike, role?: UserRole | null) {
  const message = normalizeMessage(notification.message);

  if (message.includes('solicitud de materiales')) {
    return withJobContext('/contractor-requests', notification.relatedJobId);
  }

  if (
    message.includes('solicitud de pago de mano de obra') ||
    message.includes('solicitud de mano de obra') ||
    message.includes('solicitud de anticipo') ||
    message.includes('anticipo de mano de obra')
  ) {
    return role === 'contractor'
      ? withJobContext('/assigned-jobs', notification.relatedJobId)
      : withJobContext('/contractor-payment-requests', notification.relatedJobId);
  }

  if (message.includes('trabajo asignado') || message.includes('ambiente asignado')) {
    return withJobContext('/assigned-jobs', notification.relatedJobId);
  }

  return null;
}
