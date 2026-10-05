type Delivery = {
  readonly reference: string
  readonly status: string
}

type Timeline = ReadonlyArray<{ readonly at: string; readonly state: string }>

export const loadOverview = async (trackingCode: string) => {
  const [delivery, timeline] = await Promise.all([
    fetch(`/service/deliveries/${trackingCode}`).then((response) => response.json() as Promise<Delivery>),
    fetch(`/service/events/${trackingCode}`).then((response) => response.json() as Promise<Timeline>)
  ])

  return {
    reference: delivery.reference,
    status: delivery.status,
    timeline
  }
}
