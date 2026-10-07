type Meeting = {
  startsAt: Date
  durationMinutes: number
}

export function formatMeetingTime(meeting: Meeting): string {
  const hour = meeting.startsAt.getHours().toString().padStart(2, "0")
  const minute = meeting.startsAt.getMinutes().toString().padStart(2, "0")
  const endsAt = new Date(meeting.startsAt)
  endsAt.setMinutes(endsAt.getMinutes() + meeting.durationMinutes)
  const endHour = endsAt.getHours().toString().padStart(2, "0")
  const endMinute = endsAt.getMinutes().toString().padStart(2, "0")

  return `${hour}:${minute}–${endHour}:${endMinute}`
}
