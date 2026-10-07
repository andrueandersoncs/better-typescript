type Subscription = { id: string; renewsOn: Date; cardExpiresOn: Date }

export function decideRenewal(subscription: Subscription, today: Date) {
  const daysUntilRenewal = Math.ceil(
    (subscription.renewsOn.getTime() - today.getTime()) / 86_400_000,
  )

  if (subscription.cardExpiresOn < subscription.renewsOn) {
    return { shouldCharge: false, reason: "expired-card" }
  }

  return daysUntilRenewal > 3
    ? { shouldCharge: false, reason: "too-early" }
    : { shouldCharge: true, reason: "due" }
}

export async function prepareRenewal(subscriptionId: string) {
  const subscription = await subscriptions.get(subscriptionId)
  const decision = decideRenewal(subscription, await clock.today())

  if (decision.reason === "expired-card") {
    await notifications.send(subscription.id, "Update your payment card")
  } else if (decision.shouldCharge) {
    await billing.queueCharge(subscription.id)
  }

  return decision
}

declare const subscriptions: { get(id: string): Promise<Subscription> }
declare const clock: { today(): Promise<Date> }
declare const notifications: { send(id: string, text: string): Promise<void> }
declare const billing: { queueCharge(id: string): Promise<void> }
