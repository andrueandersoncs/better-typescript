type Delivery = {
  readonly reference: string
  readonly status: string
}

type Timeline = ReadonlyArray<{ readonly at: string; readonly state: string }>

export const loadOverview = async (trackingCode: string) => {
  const delivery = await fetch(`/service/deliveries/${trackingCode}`).then((response) => response.json() as Promise<Delivery>)
  const timeline = await fetch(`/service/events/${trackingCode}`).then((response) => response.json() as Promise<Timeline>)

  return {
    reference: delivery.reference,
    status: delivery.status,
    timeline
  }
}
