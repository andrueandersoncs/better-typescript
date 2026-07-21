declare const status: "active" | "inactive" | "unknown"
declare const handleActive: () => string
declare const handleInactive: () => string
declare const handleUnknown: () => string

export const describeStatus = (): string => {
  switch (status) {
    case "active":
      return handleActive()
    case "inactive":
      return handleInactive()
    default:
      return handleUnknown()
  }
}
