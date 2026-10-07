import { describe, expect, it } from "vitest";

type Reminder = {
  readonly state: string;
};

const isReminderReady = (reminder: Reminder): boolean => reminder.state === "ready";

describe("isReminderReady", () => {
  it("when ready, returns true", () => {
    const readyReminder: Reminder = { state: "ready" };
    const ready = isReminderReady(readyReminder);
    expect(ready).toBe(true);
  });
});
