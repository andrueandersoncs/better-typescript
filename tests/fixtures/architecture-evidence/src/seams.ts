export interface PaymentPort {
  charge(amount: number): string
}

export class LivePayment implements PaymentPort {
  charge(amount: number): string {
    return `live:${amount}`
  }
}

export const submitPayment = (
  amount: number,
  payments: PaymentPort
): string => payments.charge(amount)

export interface StablePort {
  load(): string
}

export class LiveStable implements StablePort {
  load(): string {
    return "live"
  }
}

export const loadStable = (stable: StablePort): string => stable.load()
