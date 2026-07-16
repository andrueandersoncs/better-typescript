export class PaymentClient {
  charge(amount: number): string {
    return `charged:${amount}`
  }
}
