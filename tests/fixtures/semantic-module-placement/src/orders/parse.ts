export type OrderInput = {
  readonly id: string
}

export function parseOrder(input: OrderInput): string {
  return input.id
}

export function formatOrderError(message: string): string {
  return message
}
