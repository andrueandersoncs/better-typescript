declare const params: {
  readonly query: string | null
  readonly page: number | null
}

export const queryParameters = {
  ...(params.query ? { query: params.query } : {}),
  ...(params.page ? { page: params.page } : {})
}
