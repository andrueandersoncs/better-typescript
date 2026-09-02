const { value } = { value: 1 }

interface UserRow { id: string }
interface UserRecord { id: string }
interface AuditRecord { createdAt: number }
interface Task extends Schema.Schema.Type<typeof TaskSchema> {}
interface Mime extends Schema.Schema.Type<typeof MimeSchema> {}
