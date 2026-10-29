// Owner: Eashvar (testing). Fake Google Places answers for 09 Nearby spots and 10 Spot details, so
// those tests never call Google or need a key: the list (/api/places?lat=&lng=), one spot by id
// (?id=) and Google's AI summary (&summary=1, none here). Also switches the "Google Places calls"
// switch on, which those pages need.

const BISHAN = { lat: 1.3508, lng: 103.8485 }

/** A place shaped like api/places.js's reply, `east` metres east of Bishan MRT. */
export function place(id, name, extra = {}, east = 200) {
  const lng = BISHAN.lng + east / 111000
  return {
    source: 'google',
    source_place_id: id,
    name,
    category: 'cafe',
    types: ['cafe'],
    primary_type: null,
    lat: BISHAN.lat,
    lng,
    rating: 4.2,
    review_count: 50,
    price_level: 2,
    image_url: null,
    distance_m: east,
    address: `${east} Bishan Street, Singapore`,
    google_maps_uri: `https://maps.google.com/?cid=${id}`,
    open_now: null,
    opening_hours: null,
    wheelchair_accessible: null,
    description: null,
    tags: [],
    nearest_station_name: 'Bishan',
    station_distance_m: east,
    ...extra,
  }
}

export async function stubPlaces(page, places) {
  await page.addInitScript(() =>
    window.localStorage.setItem('fairpoint.googlePlacesEnabled', 'true'),
  )
  await page.route('**/api/places**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('summary')) return route.fulfill({ json: null })
    const id = url.searchParams.get('id')
    if (!id) return route.fulfill({ json: places })
    const found = places.find((p) => p.source_place_id === id)
    return found
      ? route.fulfill({ json: found })
      : route.fulfill({ status: 502, json: { error: 'Google Places 404: not found' } })
  })
}
