/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Pulls "lat, lng" out of whatever a shop owner pastes: "13.0827, 80.2707", "13.0827 80.2707",
 * or a Google Maps link (`@lat,lng,17z`, `?q=lat,lng`, `!3dLAT!4dLNG`). Null if nothing usable.
 */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent((text ?? "").trim().replace(/%(?![0-9a-f]{2})/gi, "%25"));
  if (!s) return null;
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/,
    /^\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?$/,
  ];
  for (const re of patterns) {
    const m = re.exec(s);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (inRange(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** "lat,lng" string (ONDC gps format) -> numbers, or null. */
export function parseGps(gps: unknown): { lat: number; lng: number } | null {
  if (typeof gps !== "string") return null;
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(gps);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return inRange(lat, lng) ? { lat, lng } : null;
}
