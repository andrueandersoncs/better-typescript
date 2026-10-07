type Customer = {
  readonly email: string
  readonly active: boolean
}

const customerNotice = (customer: Customer): string => {
  const address = customer.email.trim().toLowerCase()
  const status = customer.active ? "active" : "paused"
  return `${address}:${status}`
}

const customerAudit = (customer: Customer): string => {
  const address = customer.email.trim().toLowerCase()
  const status = customer.active ? "active" : "paused"
  return `${address}:${status}`
}

export const customerReport = (customer: Customer): string => {
  return `${customerNotice(customer)}|${customerAudit(customer)}`
}
