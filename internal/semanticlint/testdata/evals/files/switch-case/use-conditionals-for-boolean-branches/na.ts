type DeliveryWindow = {
  start: Date;
  end: Date;
};

export const durationMinutes = (window: DeliveryWindow): number => {
  return (window.end.getTime() - window.start.getTime()) / 60_000;
};

export const startsAt = (window: DeliveryWindow): string => {
  return window.start.toISOString();
};

export const endsAt = (window: DeliveryWindow): string => {
  return window.end.toISOString();
};
