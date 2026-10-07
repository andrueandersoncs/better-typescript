export type RetrySchedule = {
  readonly delay: number;
  readonly hasPendingAttempt: boolean;
};

export const createRetrySchedule = (delayMilliseconds: number): RetrySchedule => {
  const hasPendingAttempt = delayMilliseconds > 0;
  return {
    delay: delayMilliseconds,
    hasPendingAttempt,
  };
};

export const isScheduleReady = (schedule: RetrySchedule): boolean => {
  return !schedule.hasPendingAttempt;
};
