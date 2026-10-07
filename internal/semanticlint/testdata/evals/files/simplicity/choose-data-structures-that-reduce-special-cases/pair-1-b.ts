type Article = {
  title: string
  status: "draft" | "published" | "archived"
}

export function articleLabel(article: Article): string {
  switch (article.status) {
    case "archived":
      return "Archived"
    case "published":
      return "Published"
    case "draft":
      return article.title === "" ? "Untitled" : "Draft"
  }
}

export function canEdit(article: Article): boolean {
  return article.status !== "archived"
}

export function publish(article: Article): Article {
  return { ...article, status: "published" }
}
