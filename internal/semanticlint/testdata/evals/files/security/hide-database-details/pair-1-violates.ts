type QueryFailure = {
  readonly code: string
  readonly relation: string
}

const respond = (failure: QueryFailure): Response => {
  return Response.json(
    {
      message: `Could not load invoice from ${failure.relation} (${failure.code})`
    },
    { status: 500 }
  )
}

export const invoiceFailure = (failure: QueryFailure): Response => respond(failure)
