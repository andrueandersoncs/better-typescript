type Account = {
  name: string
  email: string
}

const createWelcomeMessage = (account: Account) => {
  const recipient = account.email.trim().toLowerCase()
  const displayName = account.name.trim()
  const subject = `Welcome, ${displayName}`
  const preview = `Your account for ${recipient} is ready.`
  const messageId = crypto.randomUUID()
  const message = { messageId, recipient, subject, preview }
  return message
}

export { createWelcomeMessage }
