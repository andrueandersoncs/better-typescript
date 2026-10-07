type Article = { id: string; title: string }

interface ArticleRepository {
  find(id: string): Promise<Article | undefined>
}

export class SqlArticleRepository implements ArticleRepository {
  async find(id: string) {
    return { id, title: "Release notes" }
  }

  async remove(id: string) {
    await database.delete(id)
  }
}

export class ArchiveArticleRepository implements ArticleRepository {
  async find(id: string) {
    return archive.get(id)
  }
}

export async function removeArticle(id: string) {
  await database.delete(id)
}

declare const database: { delete(id: string): Promise<void> }
declare const archive: { get(id: string): Promise<Article | undefined> }
