export type Announcement = {
  readonly recipient: string
  readonly subject: string
}

export type DeliveryNotice = {
  readonly recipient: string
  readonly subject: string
}

const decodeSubject = (body: unknown): string => {
  if (typeof body !== "string") throw new Error("A subject is required")
  return body
}

export const receiveAnnouncement = (body: unknown): DeliveryNotice => {
  const subject = decodeSubject(body)
  return { recipient: "subscribers", subject }
}

export const formatDeliveryNotice = (notice: DeliveryNotice): string => {
  return `${notice.subject} for ${notice.recipient}`
}
