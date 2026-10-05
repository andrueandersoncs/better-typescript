type DriverFault = {
  readonly schema: string
  readonly relation: string
  readonly detail: string
}

type ApiResponse = {
  readonly status: number
  readonly message: string
}

export const updateAddress = (fault: DriverFault | undefined): ApiResponse => {
  if (fault === undefined) {
    return { status: 204, message: "" }
  }
  return {
    status: 500,
    message: `${fault.schema}.${fault.relation}: ${fault.detail}`
  }
}
