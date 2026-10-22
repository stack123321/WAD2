// Owner: Nicole
// One-time script: download LTA's mall / attraction / hotel car park rates (data.gov.sg) and save
// them as { name: dollars per hour } in api/_data/carparkRates.js. Run: node scripts/build-carpark-rates.js
// The rates are from 2018, so they're a rough guide, not today's exact price.
import axios from 'axios'
import fs from 'node:fs'

const url = 'https://data.gov.sg/api/action/datastore_search'
const DATASET_ID = 'd_9f6056bdb6b1dfba57f063593e4f34ae'

// Turn the rate text into dollars per hour, or null if it isn't an hourly rate:
// "$1.30 / 30 Mins" → 2.6, "$1.12 per hr" → 1.12, "$0.04 per min" → 2.4, "$1.20 for 1st hr" → 1.2
function toHourly(text) {
  const match = text.match(/\$(\d+(\.\d+)?)/)
  if (!match) return null
  const dollars = Number(match[1])
  if (/1st ?(hr|hour)/i.test(text)) return dollars // first price is for the 1st hour
  if (/(\/|per)\s*min/i.test(text)) return dollars * 60
  if (/30 ?mins|½ ?hr/i.test(text)) return dollars * 2
  if (/hr|hour/i.test(text)) return dollars
  return null // e.g. "$2 per entry"
}

async function doBuild() {
  try {
    const response = await axios.get(url, { params: { resource_id: DATASET_ID, limit: 500 } })
    const rates = {}
    for (const row of response.data.result.records) {
      const hourly = toHourly(row.weekdays_rate_1)
      if (hourly !== null) {
        rates[row.carpark.toLowerCase()] = Math.round(hourly * 100) / 100
      }
    }
    const file =
      '// Made by scripts/build-carpark-rates.js, do not edit by hand.\n' +
      '// Mall / attraction / hotel car park rates in dollars per hour (LTA via data.gov.sg, 2018)\n' +
      `export const CARPARK_RATES = ${JSON.stringify(rates, null, 2)}\n`
    fs.writeFileSync('api/_data/carparkRates.js', file)
    console.log(`Saved ${Object.keys(rates).length} car park rates`)
  } catch (error) {
    console.log(error.message)
  }
}

doBuild()
