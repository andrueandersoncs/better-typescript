type Allocation = { readonly department: string; readonly amount: number }

export const totalAllocations = (
  allocations: ReadonlyArray<Allocation>
): Readonly<Record<string, number>> => {
  let totals: Readonly<Record<string, number>> = {}
  for (const allocation of allocations) {
    const previous = totals[allocation.department] ?? 0
    totals = { ...totals, [allocation.department]: previous + allocation.amount }
  }
  return totals
}
