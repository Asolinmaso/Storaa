/**
 * Storaa's `stock` is what is still *available to sell*: units reserved by customer holds and
 * ONDC orders have already been taken off it. A POS reports what is physically on its shelf, so the
 * reserved units must be taken off again, otherwise a POS push would resell them.
 */
export const availableFromOnHand = (onHand: number, reserved: number): number =>
  Math.max(0, Math.floor(onHand) - Math.max(0, Math.floor(reserved || 0)));

/** Stock after a relative adjustment (sale = negative delta); never below zero. */
export const applyDelta = (stock: number, delta: number): number => Math.max(0, Math.floor(stock + Math.floor(delta)));
