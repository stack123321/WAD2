// Owner: Eashvar. What the whole group needs from a spot, for the Ask box on 09, from everyone's
// saved preferences on 03: a spot "fits us" only if it works for everyone, so one halal member
// means a halal search, and the lowest budget anyone picked (1 = under $15, 2 = $15–30,
// 3 = $30+) is the limit. No names leave the page, only these totals.

/**
 * @param {Array<{ dietary?: string[], budget?: number | null }>} members the store's members
 * @returns {{ size: number, dietary: string[], maxPrice: number | null }}
 */
export function groupNeeds(members) {
  const budgets = members.map((m) => m.budget).filter((b) => b != null)
  return {
    size: members.length,
    dietary: [...new Set(members.flatMap((m) => m.dietary ?? []))],
    maxPrice: budgets.length ? Math.min(...budgets) : null,
  }
}
