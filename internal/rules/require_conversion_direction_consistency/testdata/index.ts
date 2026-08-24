interface User { name: string }
interface Order { id: string }
const parseUser = (user: User): Order => ({ id: user.name })
const parseOrder = (user: User): Order => ({ id: user.name })
