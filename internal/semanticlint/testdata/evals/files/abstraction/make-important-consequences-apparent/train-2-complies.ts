export interface Member {
  readonly id: string
  readonly email: string
  readonly role: "owner" | "admin" | "viewer"
}

interface Page<T> {
  readonly items: ReadonlyArray<T>
  readonly nextCursor: string | null
}

const fetchPage = async (teamId: string, cursor: string | null): Promise<Page<Member>> => {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  const response = await fetch(`/api/teams/${teamId}/members${query}`)
  if (!response.ok) throw new Error(`members request failed: ${response.status}`)
  return (await response.json()) as Page<Member>
}

export async function listAllMembers(teamId: string): Promise<ReadonlyArray<Member>> {
  const members: Member[] = []
  let cursor: string | null = null
  do {
    const result: Page<Member> = await fetchPage(teamId, cursor)
    members.push(...result.items)
    cursor = result.nextCursor
  } while (cursor !== null)
  return members
}

export const adminsOf = (members: ReadonlyArray<Member>): ReadonlyArray<Member> =>
  members.filter((member) => member.role === "owner" || member.role === "admin")

export const memberEmails = (members: ReadonlyArray<Member>): string =>
  members.map((member) => member.email).join(", ")
