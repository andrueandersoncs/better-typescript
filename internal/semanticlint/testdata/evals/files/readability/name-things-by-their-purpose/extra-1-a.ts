type SubscriptionRequest = {
  customerId: string
  planId: string
  startsOn: string
}

type Subscription = SubscriptionRequest & {
  id: string
}

const saveSubscription = (subscriptionRequest: SubscriptionRequest): Subscription => ({
  id: crypto.randomUUID(),
  ...subscriptionRequest,
})

const data: SubscriptionRequest = {
  customerId: "cus_12",
  planId: "pro",
  startsOn: "2026-10-01",
}

export const subscription = saveSubscription(data)
