interface PublishedDraft {
  readonly title: string
}

export const publishedDraftTitle = (draft: PublishedDraft): string => draft.title
