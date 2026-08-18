import type { SharedDraft } from "./data.js"

const draftTitle = (draft: SharedDraft): string => draft.visibleDraftTitle
const draftHeading = (draft: SharedDraft): string =>
  `Draft: ${draft.visibleDraftTitle}`

void draftTitle
void draftHeading
