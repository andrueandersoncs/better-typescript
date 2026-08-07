export type OrderInput = { readonly id: string }

export function parseOrder(input: OrderInput): string {
  return input.id
}

export class OrderParseError {
  constructor(readonly message: string) {}
}
