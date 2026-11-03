// Shared step for tests that close the vote on the sample hangout (11 Group voting).
// The pop-up's button says "Confirm", or "Close anyway" when someone hasn't voted yet.
export async function closeTheVote(page) {
  await page.getByRole('button', { name: 'Close vote' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Confirm|Close anyway/ })
    .click()
}
