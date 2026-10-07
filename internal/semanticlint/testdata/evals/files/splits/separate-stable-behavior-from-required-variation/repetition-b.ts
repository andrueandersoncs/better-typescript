type Customer = {
  readonly email: string
  readonly active: boolean
}

const customerRecord = (customer: Customer): string => {
  const address = customer.email.trim().toLowerCase()
  const status = customer.active ? "active" : "paused"
  return `${address}:${status}`
}

const customerNotice = (customer: Customer): string => {
  return customerRecord(customer)
}

const customerAudit = (customer: Customer): string => {
  return customerRecord(customer)
}

export const customerReport = (customer: Customer): string => {
  return `${customerNotice(customer)}|${customerAudit(customer)}`
}
