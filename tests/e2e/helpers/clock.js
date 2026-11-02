// Owner: Eashvar (testing). The sample hangouts are dated October 2026: the Friday hangout is on
// 16 Oct at 7 pm and its vote closes on 15 Oct at 9 pm. Tests that depend on the date set the
// browser's clock first, or those pages would always show the hangout as over.
// page.clock isn't covered in the course. It's the one extra Playwright feature these tests need,
// and it's only used through this file.

export const VOTING_OPEN = '2026-10-14T22:00:00+08:00' // the night before voting closes
export const HANGOUT_STARTED = '2026-10-16T21:00:00+08:00' // 2 hours into the Friday hangout

// The browser's date and time stay at `time` for the whole test
export async function setTime(page, time) {
  await page.clock.setFixedTime(new Date(time))
}

// The browser's clock starts at `time` and keeps running, so moveTimeForward() can skip ahead
export async function startClockAt(page, time) {
  await page.clock.install({ time: new Date(time) })
}

export async function moveTimeForward(page, hours) {
  await page.clock.fastForward(hours * 60 * 60 * 1000)
}
