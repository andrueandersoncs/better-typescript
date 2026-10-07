export type RetrySchedule = {
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maximumDelayMs: number;
  readonly maximumAttempts: number;
};

export const delayForAttempt = (schedule: RetrySchedule, attempt: number): number => {
  const scaledDelay = schedule.initialDelayMs * schedule.multiplier ** attempt;

  return Math.min(scaledDelay, schedule.maximumDelayMs);
};
