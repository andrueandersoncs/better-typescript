import { SourceComment } from "../../internal/sources/commentsData.js"

export const commentText = (text: string) => (comment: SourceComment) =>
  text.slice(comment.pos, comment.end)
