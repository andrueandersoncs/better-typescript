export type ExchangeRate = {
  readonly base: string
  readonly quote: string
  readonly value: number
}

declare const fetch: (url: string) => Promise<{ json: () => Promise<ExchangeRate> }>

export const calculateExchangeRate = async (
  base: string,
  quote: string,
): Promise<ExchangeRate> => {
  const response = await fetch(`/rates/${base}/${quote}`)
  return response.json()
}
