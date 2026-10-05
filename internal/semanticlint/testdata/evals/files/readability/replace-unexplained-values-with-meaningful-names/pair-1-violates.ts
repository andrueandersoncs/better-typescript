type Connection = {
  readonly open: () => Promise<void>
}

export const openConnection = async (connection: Connection): Promise<void> => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await connection.open()
      return
    } catch (error) {
      if (attempt === 3) {
        throw error
      }
    }
  }
}
