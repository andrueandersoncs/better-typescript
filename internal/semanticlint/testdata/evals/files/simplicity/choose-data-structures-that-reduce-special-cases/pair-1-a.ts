type Article = {
  title: string
  isDraft: boolean
  isPublished: boolean
  isArchived: boolean
}

export function articleLabel(article: Article): string {
  if (article.isArchived) {
    return "Archived"
  }

  if (article.isPublished && article.isDraft) {
    return "Published with edits"
  }

  if (article.isPublished) {
    return "Published"
  }

  if (article.isDraft) {
    return "Draft"
  }

  return "Untitled"
}

export function canEdit(article: Article): boolean {
  return !article.isArchived
}
