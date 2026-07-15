import { Array } from "effect"

declare const projectFiles: ReadonlyArray<string>
declare const emptyClassifications: Record<string, number>

declare const folder: (
  state: Record<string, number>,
  file: string
) => Record<string, number>

export const contiguousNeighbors = (): number => {
  const left = 1
  const right = 2

  return left + right
}

export const blankAroundMultiline = (): Record<string, number> => {
  const seed = emptyClassifications

  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )

  const count = Object.keys(classifications).length

  return classifications
}

export const moduleLevelGap = 1

export const moduleLevelAfterGap = 2

export const nestedContiguous = (): number => {
  if (true) {
    const innerLeft = 1
    const innerRight = 2

    return innerLeft + innerRight
  }

  return 0
}
