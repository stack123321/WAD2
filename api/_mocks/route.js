// Sample travel times for api/route.js, estimated from straight-line distance.
// Good enough to build page 07 and test the midpoint algorithm; replaced by OneMap Routing later.
import { distanceKm } from './geo.js'

// detour: how much longer the real path is than a straight line; wait: walking to stops, waiting, parking
const MODES = {
  walk: { kmh: 5, detour: 1.25, wait: 0, fare: () => 0, via: 'Walk' },
  bus: {
    kmh: 18,
    detour: 1.35,
    wait: 7,
    fare: (km) => Math.min(1.09 + 0.08 * km, 2.37),
    via: 'Bus',
  },
  mrt: {
    kmh: 32,
    detour: 1.3,
    wait: 9,
    fare: (km) => Math.min(1.09 + 0.07 * km, 2.37),
    via: 'MRT',
  },
  car: { kmh: 35, detour: 1.3, wait: 4, fare: (km) => 0.6 * km + 2, via: 'Car' },
}

/**
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @param {'walk' | 'bus' | 'mrt' | 'car'} mode
 * @returns {{ mins: number, cost: number, steps: Array<{ instruction: string, mins: number }> }}
 */
export function sampleRoute(from, to, mode) {
  const m = MODES[mode]
  const km = distanceKm(from, to) * m.detour
  const rideMins = Math.round((km / m.kmh) * 60)
  const mins = rideMins + m.wait
  const cost = Math.round(m.fare(km) * 100) / 100

  const steps =
    mode === 'walk'
      ? [{ instruction: `Walk ${km.toFixed(1)} km`, mins }]
      : [
          {
            instruction: mode === 'car' ? 'Get to your car' : `Walk to the ${m.via} stop`,
            mins: Math.ceil(m.wait / 2),
          },
          { instruction: `${m.via} for ${km.toFixed(1)} km`, mins: rideMins },
          {
            instruction: mode === 'car' ? 'Park and walk over' : 'Walk to the meeting point',
            mins: Math.floor(m.wait / 2),
          },
        ]

  return { mins, cost, steps }
}

export const MODE_NAMES = Object.keys(MODES)
