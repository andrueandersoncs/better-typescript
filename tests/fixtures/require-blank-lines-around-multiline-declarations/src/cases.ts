import { Array } from "effect"

declare const projectFiles: ReadonlyArray<string>
declare const emptyClassifications: Record<string, number>

declare const folder: (
  state: Record<string, number>,
  file: string
) => Record<string, number>

export const crowdedReduce = (): Record<string, number> => {
  const seed = emptyClassifications
  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )
  const count = Object.keys(classifications).length

  return classifications
}

type CrowdedAlias = {
  readonly name: string
  readonly value: number
}
export const afterCrowdedAlias = 1

interface CrowdedInterface {
  readonly ready: boolean
}
export const afterCrowdedInterface = 2
