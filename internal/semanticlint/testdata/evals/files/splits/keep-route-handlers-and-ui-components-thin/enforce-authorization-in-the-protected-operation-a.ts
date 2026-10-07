export type RefundViewer = {
  readonly permissions: ReadonlyArray<string>
}

export type RefundButton = {
  readonly label: string
  readonly disabled: boolean
}

const viewerCanIssueRefund = (viewer: RefundViewer): boolean =>
  viewer.permissions.includes("refunds:issue")

export const createRefundButton = (viewer: RefundViewer): RefundButton => {
  const disabled = !viewerCanIssueRefund(viewer)
  const label = disabled ? "Refund unavailable" : "Issue refund"

  return { label, disabled }
}
