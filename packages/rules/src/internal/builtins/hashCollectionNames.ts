// HashCollectionNames parameterizes Map/Set identity because both share one orchestration.
export interface HashCollectionNames {
  readonly collectionName: string
  readonly typeNames: ReadonlyArray<string>
  readonly mutableModuleName: string
  readonly mutableName: string
}
