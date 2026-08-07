export const detectionIdentity = (detection: {
  readonly location: { readonly path: string; readonly line: number; readonly column: number }
  readonly message: string
}): string =>
  `${detection.location.path}:${detection.location.line}:${detection.location.column}:${detection.message}`
