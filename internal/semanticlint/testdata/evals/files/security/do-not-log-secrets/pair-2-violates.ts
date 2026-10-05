type RequestContext = {
  readonly requestId: string
  readonly authorization: string | undefined
  readonly clientIp: string
}

const emit = (name: string, fields: Record<string, unknown>): void => {
  console.info(name, fields)
}

export const recordRequest = (context: RequestContext): void => {
  emit("request_received", {
    requestId: context.requestId,
    clientIp: context.clientIp,
    authorization: context.authorization
  })
}
