declare const isAdmin: boolean
declare const isActive: boolean
declare const isOwner: boolean

const hasAdminAccess = isAdmin && isActive
export const canEdit = hasAdminAccess || isOwner
