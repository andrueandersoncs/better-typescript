import { Array } from "effect"

declare const projectFiles: ReadonlyArray<string>
declare const emptyClassifications: Record<string, number>

declare const folder: (
  state: Record<string, number>,
  file: string
) => Record<string, number>

export const spacedNeighbors = (): number => {
  const left = 1

  const right = 2

  return left + right
}

export const spacedBeforeMultiline = (): Record<string, number> => {
  const seed = emptyClassifications

  const mid = 1

  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )

  return classifications
}

export const nestedBlockGap = (): number => {
  if (true) {
    const innerLeft = 1

    const innerRight = 2

    return innerLeft + innerRight
  }

  return 0
}
