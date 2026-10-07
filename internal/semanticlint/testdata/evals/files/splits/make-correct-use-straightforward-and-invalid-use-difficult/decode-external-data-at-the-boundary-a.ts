export type Announcement = {
  readonly recipient: string
  readonly subject: string
}

export type DeliveryNotice = {
  readonly recipient: string
  readonly subject: string
}

export const receiveAnnouncement = (body: unknown): DeliveryNotice => {
  const subject = body as string
  return { recipient: "subscribers", subject }
}

export const formatDeliveryNotice = (notice: DeliveryNotice): string => {
  return `${notice.subject} for ${notice.recipient}`
}
