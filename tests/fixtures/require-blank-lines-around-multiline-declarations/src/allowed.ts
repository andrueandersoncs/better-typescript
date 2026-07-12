import { Array } from "effect"

declare const projectFiles: ReadonlyArray<string>
declare const emptyClassifications: Record<string, number>

declare const folder: (
  state: Record<string, number>,
  file: string
) => Record<string, number>

export const spacedReduce = (): Record<string, number> => {
  const seed = emptyClassifications

  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )

  const count = Object.keys(classifications).length

  return classifications
}

export const singleLineNeighbors = (): number => {
  const left = 1
  const right = 2

  return left + right
}

type SpacedAlias = {
  readonly name: string
  readonly value: number
}

export const afterSpacedAlias = 1

interface SpacedInterface {
  readonly ready: boolean
}

export const afterSpacedInterface = 2

export const soleMultiLine = (): number => {
  const value = Array.reduce(projectFiles, 0, (sum, file) => sum + file.length)

  return value
}
