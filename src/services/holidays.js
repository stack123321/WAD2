// Singapore public holidays from data.gov.sg (collection 691), callable from the browser with no key.
// The collection's last two datasets are this year's and next year's holidays.
import axios from 'axios'

const COLLECTION_URL = 'https://api-production.data.gov.sg/v2/public/api/collections/691/metadata'
const DATASTORE_URL = 'https://data.gov.sg/api/action/datastore_search?resource_id='

let datasetIds = null
const holidaysByYear = new Map() // year → Promise of { 'YYYY-MM-DD': 'Holiday name' }

async function getDatasetIds() {
  if (!datasetIds) {
    const response = await axios.get(COLLECTION_URL)
    datasetIds = response.data.data.collectionMetadata.childDatasets
  }
  return datasetIds
}

/** The holidays of one year as { '2026-01-01': "New Year's Day" }, or {} for years data.gov.sg doesn't have. */
async function loadYear(year) {
  const ids = await getDatasetIds()
  const thisYear = new Date().getFullYear()
  const id = { [thisYear]: ids.at(-2), [thisYear + 1]: ids.at(-1) }[year]
  if (!id) return {}

  const response = await axios.get(DATASTORE_URL + id)
  const holidays = {}
  for (const record of response.data.result.records) {
    holidays[record.date] = record.holiday
  }
  return holidays
}

/**
 * The public holiday's name when the date (Singapore time) is one, otherwise null.
 * Also null when the holidays can't be loaded, so the page just skips the notice.
 * @param {string|Date} date e.g. hangout.starts_at
 * @returns {Promise<string|null>}
 */
export async function getPublicHoliday(date) {
  // "2026-10-16" in Singapore time, whatever timezone the browser is in
  const day = new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const year = Number(day.slice(0, 4))

  if (!holidaysByYear.has(year)) {
    holidaysByYear.set(
      year,
      loadYear(year).catch(() => {
        holidaysByYear.delete(year) // try again next time
        return {}
      }),
    )
  }
  return (await holidaysByYear.get(year))[day] ?? null
}
