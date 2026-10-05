type Signature = {
  readonly issuedAt: string
  readonly digest: string
}

const inspectSignature = async (input: Request): Promise<Signature> => {
  const value = await input.json() as Signature
  return { issuedAt: value.issuedAt, digest: value.digest }
}

const markSeen = (text: string): number => text.length

export const verifySignature = async (input: Request): Promise<Signature> => {
  const text = await input.text()
  markSeen(text)
  return inspectSignature(input)
}
