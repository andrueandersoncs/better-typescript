type Receipt = {
  readonly reference: string
}

const requestReceipt = async (invoiceId: string): Promise<Receipt> => ({
  reference: invoiceId,
})

export const loadReceipt = async (invoiceId: string): Promise<Receipt> => {
  try {
    const receipt = await requestReceipt(invoiceId)
    return receipt
  } catch (error) {
    throw new Error("Could not load receipt", { cause: error })
  }
}
