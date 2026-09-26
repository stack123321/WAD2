// Sample cafes and activities for api/places.js, placed around whatever centre is asked for,
// so pages 09 and 10 work for any midpoint. Names start with "Sample" so nobody mistakes them for real.
import { distanceKm, seeded } from './geo.js'

// [name, category, rating, price_level (0 free – 3 pricey), lat offset, lng offset]
const TEMPLATES = [
  ['Sample Kopitiam', 'food', 4.1, 1, 0.0012, -0.0008],
  ['Sample Brunch Cafe', 'cafe', 4.5, 2, -0.0015, 0.0011],
  ['Sample Bubble Tea', 'cafe', 4.2, 1, 0.0006, 0.0019],
  ['Sample Board Game Cafe', 'activity', 4.6, 2, 0.0028, 0.0004],
  ['Sample Bouldering Gym', 'activity', 4.7, 3, -0.0031, -0.0022],
  ['Sample Karaoke', 'activity', 4.0, 2, 0.0019, -0.0035],
  ['Sample Park', 'outdoor', 4.4, 0, -0.0045, 0.0033],
  ['Sample Hawker Centre', 'food', 4.3, 1, -0.0009, -0.0017],
  ['Sample Ramen Bar', 'food', 4.4, 2, 0.0038, 0.0026],
  ['Sample Arcade', 'activity', 3.9, 2, -0.0024, 0.004],
  ['Sample Food Court', 'food', 3.8, 1, 0.0049, -0.0012],
  ['Sample Dessert Parlour', 'cafe', 4.5, 2, -0.0052, -0.0041],
]

/**
 * @param {{ lat: number, lng: number }} centre
 * @param {{ radiusM: number, categories: string[] }} options
 * @returns {Array<object>} shortlist-shaped places, nearest first
 */
export function samplePlaces(centre, { radiusM, categories }) {
  return TEMPLATES.map(([name, category, rating, price_level, dLat, dLng]) => {
    const lat = Math.round((centre.lat + dLat) * 1e6) / 1e6
    const lng = Math.round((centre.lng + dLng) * 1e6) / 1e6
    return {
      source: 'osm',
      source_place_id: `sample-${Math.round(seeded(name + lat + lng) * 1e6)}`,
      name,
      category,
      lat,
      lng,
      rating,
      price_level,
      image_url: null,
      distance_m: Math.round(distanceKm(centre, { lat, lng }) * 1000),
    }
  })
    .filter((p) => p.distance_m <= radiusM)
    .filter((p) => categories.length === 0 || categories.includes(p.category))
    .sort((a, b) => a.distance_m - b.distance_m)
}
