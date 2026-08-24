export const messageOf = (error: Error): string => error.message
export type Failure = Error | { readonly code: string }
export type QualifiedFailure = globalThis.Error
export interface ErrorSink {
  readonly push: (error: Error) => void
}
