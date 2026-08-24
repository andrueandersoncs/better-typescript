interface Draft {
  readonly title: string
  readonly forecast: number
}

export const draftTitle = (draft: Draft): string => draft.title
