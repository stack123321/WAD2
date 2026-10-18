// Owner: Ryan
// sample mrt crowd levels for api/crowd.js when there's no lta key or lta is down

// approximate station positions (sample data)
const STATIONS = [
  { name: 'Jurong East', lat: 1.3331, lng: 103.7423, interchange: true },
  { name: 'Clementi', lat: 1.3151, lng: 103.7652, interchange: false },
  { name: 'Buona Vista', lat: 1.3072, lng: 103.7903, interchange: true },
  { name: 'HarbourFront', lat: 1.2653, lng: 103.822, interchange: true },
  { name: 'Outram Park', lat: 1.2803, lng: 103.8395, interchange: true },
  { name: 'Raffles Place', lat: 1.284, lng: 103.8515, interchange: true },
  { name: 'City Hall', lat: 1.2931, lng: 103.852, interchange: true },
  { name: 'Dhoby Ghaut', lat: 1.299, lng: 103.8456, interchange: true },
  { name: 'Bugis', lat: 1.3009, lng: 103.8559, interchange: true },
  { name: 'Orchard', lat: 1.304, lng: 103.8318, interchange: false },
  { name: 'Novena', lat: 1.3204, lng: 103.8438, interchange: false },
  { name: 'Toa Payoh', lat: 1.3327, lng: 103.8474, interchange: false },
  { name: 'Bishan', lat: 1.3508, lng: 103.8485, interchange: true },
  { name: 'Ang Mo Kio', lat: 1.37, lng: 103.8496, interchange: false },
  { name: 'Serangoon', lat: 1.3498, lng: 103.8737, interchange: true },
  { name: 'Paya Lebar', lat: 1.3177, lng: 103.8926, interchange: true },
  { name: 'Bedok', lat: 1.324, lng: 103.93, interchange: false },
  { name: 'Tampines', lat: 1.3547, lng: 103.9452, interchange: true },
  { name: 'Punggol', lat: 1.4052, lng: 103.9024, interchange: false },
  { name: 'Yishun', lat: 1.4295, lng: 103.835, interchange: false },
  { name: 'Woodlands', lat: 1.437, lng: 103.7865, interchange: true },
  { name: 'Choa Chu Kang', lat: 1.3853, lng: 103.7443, interchange: false },
]

// at: slider time (Date), gives back [{ station, lat, lng, level }] like lta
export function sampleCrowd(at) {
  // singapore time in hours (18.5 = 6:30 pm), vercel runs in utc so add 8
  const sg = new Date(at.getTime() + 8 * 60 * 60 * 1000)
  const hour = sg.getUTCHours() + sg.getUTCMinutes() / 60
  const peak = (hour >= 7 && hour < 9.5) || (hour >= 17 && hour < 20)
  const daytime = hour >= 9.5 && hour < 17

  let result = []
  for (let s of STATIONS) {
    let level = 'l'
    if (peak && s.interchange) level = 'h'
    else if (peak || (daytime && s.interchange)) level = 'm'
    result.push({ station: `${s.name} (sample)`, lat: s.lat, lng: s.lng, level: level })
  }
  return result
}
