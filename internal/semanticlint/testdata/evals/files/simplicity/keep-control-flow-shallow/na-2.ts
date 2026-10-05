export type Article = {
  readonly id: string
  readonly title: string
  readonly labels: ReadonlyArray<string>
}

export const indexArticles = (
  articles: ReadonlyArray<Article>
): ReadonlyMap<string, Article> =>
  new Map(articles.map((article) => [article.id, article]))

export const articleLabels = (
  articles: ReadonlyArray<Article>
): ReadonlyArray<string> =>
  [...new Set(articles.flatMap((article) => article.labels))]
    .toSorted((left, right) => left.localeCompare(right))

export const titles = (articles: ReadonlyArray<Article>): ReadonlyArray<string> =>
  articles.map((article) => article.title)
