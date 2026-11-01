// Owner: Eashvar (testing). Fake Google Places answers for 09 Nearby spots and 10 Spot details.
// Every other API in the app has its own sample data when there's no key, but nearby places
// don't, so these tests answer /api/places themselves: the list (?lat=&lng=), one spot by id
// (?id=) and Google's AI summary (&summary=1, none here). page.route isn't covered in the course;
// it's only used through this file.

const BISHAN = { lat: 1.3508, lng: 103.8485 }

// A place shaped like api/places.js's reply, `east` metres east of Bishan MRT
export function place(id, name, extra = {}, east = 200) {
  return {
    source: 'google',
    source_place_id: id,
    name,
    category: 'cafe',
    types: ['cafe'],
    lat: BISHAN.lat,
    lng: BISHAN.lng + east / 111000,
    rating: 4.2,
    review_count: 50,
    price_level: 2,
    image_url: null,
    distance_m: east,
    address: `${east} Bishan Street, Singapore`,
    google_maps_uri: `https://maps.google.com/?cid=${id}`,
    tags: [],
    nearest_station_name: 'Bishan',
    station_distance_m: east,
    ...extra,
  }
}

export async function stubPlaces(page, places) {
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

// Google Places calls are off until the user turns them on (the switch on 09)
export async function turnOnGooglePlaces(page) {
  await page.getByRole('switch', { name: 'Google Places calls' }).click()
}
