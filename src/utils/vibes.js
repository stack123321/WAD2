// Owner: Surya. Which kinds of places fit each hangout vibe, for the spots shown near a station
// (08 Midpoint: MidpointSpots). The categories are the ones /api/places understands.

export const VIBE_CATEGORIES = {
  chill: ['cafe', 'outdoor'],
  food: ['food'],
  study: ['cafe'],
  celebrate: ['food', 'activity'],
  active: ['outdoor', 'activity'],
}

export const CATEGORY_EMOJI = { cafe: '☕', food: '🍜', activity: '🎳', outdoor: '🌳' }

/** The categories for a hangout's vibes, each once (cafe, food and activity if no vibe was picked). */
export function categoriesForVibes(vibes) {
  const result = []
  for (const vibe of vibes) {
    const cats = VIBE_CATEGORIES[vibe] || []
    for (const cat of cats) {
      if (!result.includes(cat)) {
        result.push(cat)
      }
    }
  }
  if (result.length === 0) {
    return ['cafe', 'food', 'activity']
  }
  return result
}
