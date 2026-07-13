export const describeOrder = (id: string, qty: number): string => {
  const label = `order:${id}`
  const amount = qty * 10
  return `${label}:${amount}`
}
