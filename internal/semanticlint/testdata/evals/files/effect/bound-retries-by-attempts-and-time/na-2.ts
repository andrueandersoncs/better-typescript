type Allocation = {
  readonly owner: string
  readonly units: number
}

const compareOwner = (left: Allocation, right: Allocation): number =>
  left.owner.localeCompare(right.owner)

export const groupAllocations = (allocations: ReadonlyArray<Allocation>) => {
  return [...allocations]
    .sort(compareOwner)
    .reduce<Record<string, number>>((result, allocation) => ({
      ...result,
      [allocation.owner]: (result[allocation.owner] ?? 0) + allocation.units
    }), {})
}
