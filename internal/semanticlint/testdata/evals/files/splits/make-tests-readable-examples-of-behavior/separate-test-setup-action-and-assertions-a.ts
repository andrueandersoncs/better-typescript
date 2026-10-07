import { describe, expect, it } from "vitest";

type Subscription = {
  readonly active: boolean;
};

const cancelSubscription = (subscription: Subscription): Subscription => ({
  ...subscription,
  active: false,
});

describe("cancelSubscription", () => {
  it("when active, marks the subscription inactive", () => {
    const activeSubscription: Subscription = { active: true };
    expect(activeSubscription.active).toBe(true);
    const canceledSubscription = cancelSubscription(activeSubscription);
    expect(canceledSubscription.active).toBe(false);
  });
});
