import { SourceComment } from "./commentsData.js"

export const commentText = (text: string) => (comment: SourceComment) =>
  text.slice(comment.pos, comment.end)
