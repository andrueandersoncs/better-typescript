// Subprocess tests still need wall-clock failure deadlines: a hung child has no
// fake clock to advance, while readiness is synchronized through stdout/stderr
// and close events instead of sleeps.
export const withTimeout = async <A>(
  promise: Promise<A>,
  description: string,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<A> => {
  let timeout: NodeJS.Timeout | undefined
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.()
      reject(new Error(`${description} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timedOut])
  } finally {
    clearTimeout(timeout)
  }
}
