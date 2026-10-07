export type RetrySchedule = {
  readonly delayMilliseconds: number;
  readonly hasPendingAttempt: boolean;
};

export const createRetrySchedule = (delayMilliseconds: number): RetrySchedule => {
  const hasPendingAttempt = delayMilliseconds > 0;
  return {
    delayMilliseconds,
    hasPendingAttempt,
  };
};

export const isScheduleReady = (schedule: RetrySchedule): boolean => {
  return !schedule.hasPendingAttempt;
};
