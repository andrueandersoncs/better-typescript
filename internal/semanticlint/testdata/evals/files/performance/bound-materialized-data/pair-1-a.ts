type Receipt = {
  readonly invoiceId: string
  readonly total: number
}

export const loadReceipt = async (url: string): Promise<Receipt> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Receipt request failed: ${response.status}`)
  }

  const receipt = (await response.json()) as Receipt
  return receipt
}
