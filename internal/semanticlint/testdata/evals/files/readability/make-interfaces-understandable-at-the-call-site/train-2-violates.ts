import type { Clinic, Appointment } from "./model"

export interface SlotQuery {
  readonly clinic: Clinic
  readonly day: Date
  readonly durationMinutes: number
}

const overlaps = (aStart: number, aEnd: number, b: Appointment): boolean =>
  aStart < b.endsAt.getTime() && b.startsAt.getTime() < aEnd

export function nextOpenSlot(query: SlotQuery, booked: ReadonlyArray<Appointment>): string | undefined {
  const step = query.durationMinutes * 60_000
  const open = new Date(query.day)
  open.setHours(query.clinic.opensAtHour, 0, 0, 0)
  const close = new Date(query.day)
  close.setHours(query.clinic.closesAtHour, 0, 0, 0)
  for (let start = open.getTime(); start + step <= close.getTime(); start += step) {
    if (!booked.some((appointment) => overlaps(start, start + step, appointment))) {
      return `${query.clinic.id}:${start}:${start + step}`
    }
  }
  return undefined
}

export function describeAvailability(query: SlotQuery, booked: ReadonlyArray<Appointment>): string {
  const slot = nextOpenSlot(query, booked)
  return slot === undefined ? "Fully booked" : `Next opening: ${slot}`
}
