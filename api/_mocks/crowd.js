// Sample MRT crowd levels for api/crowd.js. LTA DataMall gives l / m / h per station;
// this fakes the same thing, busier at peak hours and at interchanges, so the time slider shows change.
import { seeded } from './geo.js'

// Approximate station positions (sample data)
const STATIONS = [
  ['Jurong East', 1.3331, 103.7423, true],
  ['Clementi', 1.3151, 103.7652, false],
  ['Buona Vista', 1.3072, 103.7903, true],
  ['HarbourFront', 1.2653, 103.822, true],
  ['Outram Park', 1.2803, 103.8395, true],
  ['Raffles Place', 1.284, 103.8515, true],
  ['City Hall', 1.2931, 103.852, true],
  ['Dhoby Ghaut', 1.299, 103.8456, true],
  ['Bugis', 1.3009, 103.8559, true],
  ['Orchard', 1.304, 103.8318, false],
  ['Novena', 1.3204, 103.8438, false],
  ['Toa Payoh', 1.3327, 103.8474, false],
  ['Bishan', 1.3508, 103.8485, true],
  ['Ang Mo Kio', 1.37, 103.8496, false],
  ['Serangoon', 1.3498, 103.8737, true],
  ['Paya Lebar', 1.3177, 103.8926, true],
  ['Bedok', 1.324, 103.93, false],
  ['Tampines', 1.3547, 103.9452, true],
  ['Punggol', 1.4052, 103.9024, false],
  ['Yishun', 1.4295, 103.835, false],
  ['Woodlands', 1.437, 103.7865, true],
  ['Choa Chu Kang', 1.3853, 103.7443, false],
]

/**
 * @param {Date} at the time to show (the heat map's time slider)
 * @returns {Array<{ station: string, lat: number, lng: number, level: 'l' | 'm' | 'h' }>}
 */
export function sampleCrowd(at) {
  // Singapore time, as hours with minutes (e.g. 18.5 = 6:30 pm)
  const sg = new Date(at.getTime() + 8 * 60 * 60 * 1000)
  const hour = sg.getUTCHours() + sg.getUTCMinutes() / 60
  const peak = (hour >= 7 && hour < 9.5) || (hour >= 17 && hour < 20)
  const day = hour >= 9.5 && hour < 17
  const night = hour >= 23 || hour < 6

  return STATIONS.map(([station, lat, lng, interchange]) => {
    let score = seeded(station) * 0.4 // 0–0.4 random-looking but stable per station
    if (peak) score += interchange ? 0.8 : 0.5
    else if (day) score += interchange ? 0.4 : 0.2
    else if (!night) score += 0.3
    const level = score >= 0.8 ? 'h' : score >= 0.45 ? 'm' : 'l'
    return { station, lat, lng, level }
  })
}
