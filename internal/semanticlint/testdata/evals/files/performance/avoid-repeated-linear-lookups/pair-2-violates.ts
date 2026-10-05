type Submission = { readonly accountId: string; readonly amount: number }
type Adjustment = { readonly accountId: string; readonly amount: number }

export const applyAdjustments = (
  submissions: ReadonlyArray<Submission>,
  adjustments: ReadonlyArray<Adjustment>
): ReadonlyArray<number> => {
  const balances: Array<number> = []
  for (const submission of submissions) {
    const accountAdjustments = adjustments.filter(
      (adjustment) => adjustment.accountId === submission.accountId
    )
    const adjustmentTotal = accountAdjustments.reduce((total, adjustment) => total + adjustment.amount, 0)
    balances.push(submission.amount + adjustmentTotal)
  }
  return balances
}
