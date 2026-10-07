type QueueEntry = Readonly<{
  id: string
  position: number
}>

export const createQueueEntry = (): QueueEntry => {
  const entry = {
    id: "shipment-42",
    position: 1,
  }

  entry.position = 2

  return {
    id: entry.id,
    position: entry.position,
  }
}
