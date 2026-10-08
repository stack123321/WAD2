// Owner: Ryan. MRT station positions, keyed by LTA station code. LTA's crowd API returns only the
// code (e.g. "NS1"), so api/crowd.js looks it up here. Interchanges have one entry per code.
// Only the 22 stations from the sample data so far; add more as needed.
const JURONG_EAST = { name: 'Jurong East', lat: 1.3331, lng: 103.7423 }
const BUONA_VISTA = { name: 'Buona Vista', lat: 1.3072, lng: 103.7903 }
const HARBOURFRONT = { name: 'HarbourFront', lat: 1.2653, lng: 103.822 }
const OUTRAM_PARK = { name: 'Outram Park', lat: 1.2803, lng: 103.8395 }
const RAFFLES_PLACE = { name: 'Raffles Place', lat: 1.284, lng: 103.8515 }
const CITY_HALL = { name: 'City Hall', lat: 1.2931, lng: 103.852 }
const DHOBY_GHAUT = { name: 'Dhoby Ghaut', lat: 1.299, lng: 103.8456 }
const BUGIS = { name: 'Bugis', lat: 1.3009, lng: 103.8559 }
const ORCHARD = { name: 'Orchard', lat: 1.304, lng: 103.8318 }
const BISHAN = { name: 'Bishan', lat: 1.3508, lng: 103.8485 }
const SERANGOON = { name: 'Serangoon', lat: 1.3498, lng: 103.8737 }
const PAYA_LEBAR = { name: 'Paya Lebar', lat: 1.3177, lng: 103.8926 }
const TAMPINES = { name: 'Tampines', lat: 1.3547, lng: 103.9452 }
const WOODLANDS = { name: 'Woodlands', lat: 1.437, lng: 103.7865 }

export const STATIONS = {
  NS1: JURONG_EAST,
  EW24: JURONG_EAST,
  EW23: { name: 'Clementi', lat: 1.3151, lng: 103.7652 },
  EW21: BUONA_VISTA,
  CC22: BUONA_VISTA,
  NE1: HARBOURFRONT,
  CC29: HARBOURFRONT,
  EW16: OUTRAM_PARK,
  NE3: OUTRAM_PARK,
  TE17: OUTRAM_PARK,
  NS26: RAFFLES_PLACE,
  EW14: RAFFLES_PLACE,
  NS25: CITY_HALL,
  EW13: CITY_HALL,
  NS24: DHOBY_GHAUT,
  NE6: DHOBY_GHAUT,
  CC1: DHOBY_GHAUT,
  EW12: BUGIS,
  DT14: BUGIS,
  NS22: ORCHARD,
  TE14: ORCHARD,
  NS20: { name: 'Novena', lat: 1.3204, lng: 103.8438 },
  NS19: { name: 'Toa Payoh', lat: 1.3327, lng: 103.8474 },
  NS17: BISHAN,
  CC15: BISHAN,
  NS16: { name: 'Ang Mo Kio', lat: 1.37, lng: 103.8496 },
  NE12: SERANGOON,
  CC13: SERANGOON,
  EW8: PAYA_LEBAR,
  CC9: PAYA_LEBAR,
  EW5: { name: 'Bedok', lat: 1.324, lng: 103.93 },
  EW2: TAMPINES,
  DT32: TAMPINES,
  NE17: { name: 'Punggol', lat: 1.4052, lng: 103.9024 },
  NS13: { name: 'Yishun', lat: 1.4295, lng: 103.835 },
  NS9: WOODLANDS,
  TE2: WOODLANDS,
  NS4: { name: 'Choa Chu Kang', lat: 1.3853, lng: 103.7443 },
}
