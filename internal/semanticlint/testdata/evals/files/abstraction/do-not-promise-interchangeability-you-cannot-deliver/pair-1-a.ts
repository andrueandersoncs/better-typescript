type Article = { id: string; title: string }

interface ArticleRepository {
  find(id: string): Promise<Article | undefined>
  remove(id: string): Promise<void>
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

  async remove(_id: string) {
    throw new Error("Archived articles cannot be removed")
  }
}

declare const database: { delete(id: string): Promise<void> }
declare const archive: { get(id: string): Promise<Article | undefined> }
