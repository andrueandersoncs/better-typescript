type Booking = {
  readonly guest: string
  readonly nights: number
}

const recordBooking = async (booking: Booking): Promise<string> =>
  `${booking.guest}:${booking.nights}`

const sendReceipt = (booking: Booking): string =>
  `${booking.guest}-${booking.nights}`

export const acceptBooking = async (input: Request): Promise<string> => {
  const booking = await input.json() as Booking
  const saved = booking
  sendReceipt(booking)
  return recordBooking(saved)
}
