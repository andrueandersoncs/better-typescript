type Allocation = { readonly department: string; readonly amount: number }

export const totalAllocations = (): Readonly<Record<string, number>> => {
  const allocations = [
    { department: "research", amount: 40 },
    { department: "support", amount: 20 },
    { department: "sales", amount: 60 }
  ]
  let totals: Readonly<Record<string, number>> = {}
  for (const allocation of allocations) {
    const previous = totals[allocation.department] ?? 0
    totals = { ...totals, [allocation.department]: previous + allocation.amount }
  }
  return totals
}
