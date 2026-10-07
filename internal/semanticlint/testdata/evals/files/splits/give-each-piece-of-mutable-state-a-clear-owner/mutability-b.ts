type QueueEntry = Readonly<{
  id: string
  position: number
}>

export const createQueueEntry = (): QueueEntry => ({
  id: "shipment-42",
  position: 2,
})

export const queuePositionFor = (entry: QueueEntry): number =>
  entry.position
