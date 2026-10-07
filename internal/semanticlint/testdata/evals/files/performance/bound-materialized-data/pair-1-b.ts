type Receipt = {
  readonly invoiceId: string
  readonly total: number
}

const maximumReceiptBytes = 128 * 1024

export const loadReceipt = async (url: string): Promise<Receipt> => {
  const response = await fetch(url)
  const length = Number(response.headers.get("content-length"))
  if (!response.ok || !Number.isSafeInteger(length) || length > maximumReceiptBytes) {
    throw new Error(`Receipt request failed: ${response.status}`)
  }

  const receipt = (await response.json()) as Receipt
  return receipt
}
