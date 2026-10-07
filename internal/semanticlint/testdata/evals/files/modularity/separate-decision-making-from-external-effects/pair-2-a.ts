type Subscription = { id: string; renewsOn: Date; cardExpiresOn: Date }

export async function prepareRenewal(subscriptionId: string) {
  const subscription = await subscriptions.get(subscriptionId)
  const today = await clock.today()
  const daysUntilRenewal = Math.ceil(
    (subscription.renewsOn.getTime() - today.getTime()) / 86_400_000,
  )

  if (subscription.cardExpiresOn < subscription.renewsOn) {
    await notifications.send(subscription.id, "Update your payment card")
    return { shouldCharge: false, reason: "expired-card" }
  }

  if (daysUntilRenewal > 3) {
    return { shouldCharge: false, reason: "too-early" }
  }

  await billing.queueCharge(subscription.id)
  return { shouldCharge: true, reason: "due" }
}

declare const subscriptions: { get(id: string): Promise<Subscription> }
declare const clock: { today(): Promise<Date> }
declare const notifications: { send(id: string, text: string): Promise<void> }
declare const billing: { queueCharge(id: string): Promise<void> }
