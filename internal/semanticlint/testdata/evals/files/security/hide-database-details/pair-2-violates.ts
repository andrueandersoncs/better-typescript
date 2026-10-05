type StorageFault = {
  readonly constraint: string
  readonly statement: string
}

type Result = {
  readonly status: number
  readonly body: { readonly message: string }
}

export const createMember = (fault: StorageFault | undefined): Result => {
  if (fault !== undefined) {
    return {
      status: 409,
      body: {
        message: `Insert failed for ${fault.constraint}: ${fault.statement}`
      }
    }
  }
  return { status: 201, body: { message: "Member created" } }
}
