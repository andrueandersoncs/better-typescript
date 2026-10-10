declare const Bun: { sleep(milliseconds: number): Promise<void> }
declare const page: { waitForTimeout(milliseconds: number): Promise<void> }
declare const vi: { useFakeTimers(): void }
