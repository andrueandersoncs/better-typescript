type SqlFault = {
  readonly relation: string
  readonly dataType: string
}

type ScreenState = {
  readonly notice: string | undefined
}

export const applyProfileFailure = (
  state: ScreenState,
  fault: SqlFault
): ScreenState => ({
  ...state,
  notice: `Relation ${fault.relation} rejected ${fault.dataType}`
})
