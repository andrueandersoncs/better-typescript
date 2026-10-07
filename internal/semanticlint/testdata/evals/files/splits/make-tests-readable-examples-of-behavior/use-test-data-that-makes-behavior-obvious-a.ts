import { describe, expect, it } from "vitest";

type Reminder = {
  readonly state: string;
};

const isReminderReady = (reminder: Reminder): boolean => reminder.state === "r";

describe("isReminderReady", () => {
  it("when ready, returns true", () => {
    const reminder: Reminder = { state: "r" };
    const ready = isReminderReady(reminder);
    expect(ready).toBe(true);
  });
});
