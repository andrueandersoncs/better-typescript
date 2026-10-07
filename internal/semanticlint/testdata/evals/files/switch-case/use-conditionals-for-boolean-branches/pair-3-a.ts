type ApiResponse = {
  status: number;
  isRetryable: boolean;
};

export const retryGuidance = (response: ApiResponse): string => {
  switch (response.isRetryable) {
    case true:
      return `Retry request after status ${response.status}`;
    case false:
      return `Do not retry status ${response.status}`;
    default:
      return "Unknown retry state";
  }
};

export const responseStatus = (response: ApiResponse): number => {
  return response.status;
};
