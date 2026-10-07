export type RefundViewer = {
  readonly id: string
  readonly displayName: string
  readonly permissions: ReadonlyArray<string>
}

export type RefundRequest = {
  readonly invoiceId: string
}

export type RefundButton = {
  readonly label: string
  readonly disabled: boolean
}

export interface RefundGateway {
  issueRefund(request: RefundRequest): Promise<void>
}

const viewerCanIssueRefund = (viewer: RefundViewer): boolean =>
  viewer.permissions.includes("refunds:issue")

export const issueAuthorizedRefund = (
  viewer: RefundViewer,
  request: RefundRequest,
  gateway: RefundGateway
): Promise<void> => {
  const permitted = viewerCanIssueRefund(viewer)

  if (!permitted) {
    return Promise.reject(new Error("Refund access denied"))
  }

  return gateway.issueRefund(request)
}

export const createRefundButton = (viewer: RefundViewer): RefundButton => {
  const label = `Issue refund for ${viewer.displayName}`

  return { label, disabled: false }
}
