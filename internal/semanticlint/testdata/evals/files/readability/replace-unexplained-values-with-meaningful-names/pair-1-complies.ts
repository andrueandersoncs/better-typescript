type Connection = {
  readonly open: () => Promise<void>
}

const maximumConnectionAttempts = 3

export const openConnection = async (connection: Connection): Promise<void> => {
  for (let attempt = 1; attempt <= maximumConnectionAttempts; attempt++) {
    try {
      await connection.open()
      return
    } catch (error) {
      if (attempt === maximumConnectionAttempts) {
        throw error
      }
    }
  }
}
