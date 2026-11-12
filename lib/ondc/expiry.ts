/** An order nobody collects must not hold stock forever. */
export const DEFAULT_EXPIRY_HOURS = 48;
/** Hours after the buyer's pickup window closes before the order is treated as abandoned. */
export const PICKUP_GRACE_HOURS = 2;

const HOUR = 3600_000;

/** When an open order is considered abandoned: end of the pickup window + grace, else created + expiry hours. */
export function expiryDeadline(
  order: { createdAt: Date; fulfillment?: unknown },
  expiryHours: number = DEFAULT_EXPIRY_HOURS
): Date {
  const end = (order.fulfillment as { end?: { time?: { range?: { end?: string } } } } | undefined)?.end?.time?.range?.end;
  const windowEnd = end ? Date.parse(end) : NaN;
  if (Number.isFinite(windowEnd)) return new Date(windowEnd + PICKUP_GRACE_HOURS * HOUR);
  return new Date(order.createdAt.getTime() + expiryHours * HOUR);
}

export const isAbandoned = (
  order: { createdAt: Date; fulfillment?: unknown },
  now: Date = new Date(),
  expiryHours: number = DEFAULT_EXPIRY_HOURS
) => now.getTime() > expiryDeadline(order, expiryHours).getTime();
