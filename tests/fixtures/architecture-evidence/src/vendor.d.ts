declare module "@acme/payments" {
  export class PaymentClient {
    charge(): string
  }

  export class AuditClient {
    record(): string
  }
}

declare module "@acme/payments/src/checkout.js" {
  export const packageSource: string
}
