type CheckoutInput = {
  email: string
  quantity: number
}

const prepareCheckout = (input: CheckoutInput) => {
  const normalizedEmail = input.email.trim().toLowerCase()
  const validatedQuantity = Math.max(1, input.quantity)
  const orderId = crypto.randomUUID()
  const totalCents = validatedQuantity * 2500
  const receipt = `${orderId}:${normalizedEmail}:${totalCents}`
  return { orderId, normalizedEmail, totalCents, receipt }
}

export { prepareCheckout }
