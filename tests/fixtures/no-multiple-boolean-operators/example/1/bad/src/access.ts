declare const isAdmin: boolean
declare const isActive: boolean
declare const isOwner: boolean

export const canEdit = (isAdmin && isActive) || isOwner
