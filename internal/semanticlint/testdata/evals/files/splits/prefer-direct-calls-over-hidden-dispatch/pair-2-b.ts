type Payment = {
  readonly id: string
}

const confirmationForPayment = (payment: Payment): string =>
  `Confirmation ${payment.id}`

const confirmationActions = {
  publish: confirmationForPayment,
}

export const publishConfirmation = (payment: Payment): string =>
  confirmationForPayment(payment)
