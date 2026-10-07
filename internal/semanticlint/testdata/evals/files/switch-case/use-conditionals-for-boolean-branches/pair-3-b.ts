type ApiResponse = {
  status: number;
  isRetryable: boolean;
};

export const retryGuidance = (response: ApiResponse): string => {
  if (response.isRetryable) {
    return `Retry request after status ${response.status}`;
  }

  return `Do not retry status ${response.status}`;
};

export const responseStatus = (response: ApiResponse): number => {
  return response.status;
};
