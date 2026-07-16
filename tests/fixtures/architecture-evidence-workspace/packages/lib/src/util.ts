export const usedByApp = (value: number): number => value + 1

export const usedOnlyByTest = (value: number): number => value * 2

// Same-file reference must not count for exportSurface (home file excluded).
export const localWrapper = (value: number): number => usedByApp(value)
