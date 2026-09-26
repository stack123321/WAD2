// Distance helpers for the sample responses. Not an endpoint (files starting with _ are skipped).

/** Straight-line distance in km between two { lat, lng } points. */
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/** Small stable number 0–1 from a string, so sample data varies but is the same every run. */
export function seeded(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (h % 1000) / 1000
}
