type Submission = { readonly accountId: string; readonly amount: number }
type Adjustment = { readonly accountId: string; readonly amount: number }

export const applyAdjustments = (
  submissions: ReadonlyArray<Submission>,
  adjustments: ReadonlyArray<Adjustment>
): ReadonlyArray<number> => {
  const adjustmentsByAccount = new Map<string, Array<Adjustment>>()
  for (const adjustment of adjustments) {
    const accountAdjustments = adjustmentsByAccount.get(adjustment.accountId)
    if (accountAdjustments === undefined) {
      adjustmentsByAccount.set(adjustment.accountId, [adjustment])
    } else {
      accountAdjustments.push(adjustment)
    }
  }
  const balances: Array<number> = []
  for (const submission of submissions) {
    const accountAdjustments = adjustmentsByAccount.get(submission.accountId) ?? []
    const adjustmentTotal = accountAdjustments.reduce((total, adjustment) => total + adjustment.amount, 0)
    balances.push(submission.amount + adjustmentTotal)
  }
  return balances
}
