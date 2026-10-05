type TransactionFault = {
  readonly sqlState: string
  readonly constraint: string
}

type Submission = {
  readonly accepted: boolean
  readonly error?: string
}

export const submitOrder = (fault: TransactionFault | undefined): Submission => {
  if (fault === undefined) {
    return { accepted: true }
  }
  return {
    accepted: false,
    error: `Transaction ${fault.sqlState} on constraint ${fault.constraint}`
  }
}
