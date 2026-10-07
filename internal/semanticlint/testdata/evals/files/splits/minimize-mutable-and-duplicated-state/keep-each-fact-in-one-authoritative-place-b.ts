type Subscription = {
  readonly monthlyCents: number
}

const onboardingCreditCents = 1_000
const renewalCreditCents = onboardingCreditCents

export const initialCharge = (subscription: Subscription): number =>
  subscription.monthlyCents - onboardingCreditCents

export const renewalCharge = (subscription: Subscription): number =>
  subscription.monthlyCents - renewalCreditCents

export const subscriptionLabel = (subscription: Subscription): string =>
  `${subscription.monthlyCents} cents`
