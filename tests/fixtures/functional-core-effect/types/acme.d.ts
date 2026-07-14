declare module "@acme/sdk" {
  export class PaymentClient {
    charge(amount: number): Promise<string>
    close(): void
  }

  export const createClient: () => PaymentClient
}
