type Note = {
  readonly author: string
  readonly body: string
}

export const renderNote = (note: Note): string => {
  const title = note.author.trim()
  const body = note.body.trim()
  if (body.length === 0) {
    return title
  }
  return `${title}: ${body}`
}
