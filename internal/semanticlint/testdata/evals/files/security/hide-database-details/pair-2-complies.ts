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
        message: "Member could not be created"
      }
    }
  }
  return { status: 201, body: { message: "Member created" } }
}
