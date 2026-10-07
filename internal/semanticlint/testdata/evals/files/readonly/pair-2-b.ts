export type RetrySchedule = Readonly<{
  initialDelayMs: number;
  multiplier: number;
  maximumDelayMs: number;
  maximumAttempts: number;
}>;

export const delayForAttempt = (schedule: RetrySchedule, attempt: number): number => {
  const scaledDelay = schedule.initialDelayMs * schedule.multiplier ** attempt;

  return Math.min(scaledDelay, schedule.maximumDelayMs);
};
