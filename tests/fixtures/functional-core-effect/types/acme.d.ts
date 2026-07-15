declare module "@acme/sdk" {
  export class PaymentClient {
    charge(amount: number): Promise<string>
    close(): void
  }

  export const createClient: () => PaymentClient
}

declare module "@effect/platform-browser/BrowserRuntime" {
  export const runMain: (effect: unknown) => void
}
