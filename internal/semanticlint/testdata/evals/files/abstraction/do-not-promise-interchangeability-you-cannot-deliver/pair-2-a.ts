type Payment = { id: string; amount: number }

interface PaymentGateway {
  capture(payment: Payment): Promise<void>
  refund(paymentId: string): Promise<void>
}

export class CardGateway implements PaymentGateway {
  async capture(payment: Payment) {
    await cards.capture(payment)
  }

  async refund(paymentId: string) {
    await cards.refund(paymentId)
  }
}

export class BankTransferGateway implements PaymentGateway {
  async capture(payment: Payment) {
    await transfers.request(payment)
  }

  async refund(_paymentId: string) {
    throw new Error("Transfers must be refunded by accounting")
  }
}

declare const cards: { capture(payment: Payment): Promise<void>; refund(id: string): Promise<void> }
declare const transfers: { request(payment: Payment): Promise<void> }
