interface PublishedDraft {
  readonly title: string
}

export const publishedDraftTitle = (draft: PublishedDraft): string => draft.title

interface GenericDefinition<Tag, Payload> {
  readonly tag: Tag
  readonly payload: Payload
}

export const readGenericDefinition = <Tag, Payload>(
  definition: GenericDefinition<Tag, Payload>,
): readonly [Tag, Payload] => [definition.tag, definition.payload]
