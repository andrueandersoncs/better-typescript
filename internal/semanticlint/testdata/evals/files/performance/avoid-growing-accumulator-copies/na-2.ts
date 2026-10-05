type Note = { readonly id: string; readonly body: string }

export const titleNotes = (notes: ReadonlyArray<Note>): ReadonlyArray<string> =>
  notes.map((note) => `${note.id}: ${note.body}`)
