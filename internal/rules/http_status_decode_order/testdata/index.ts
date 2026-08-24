async function bad(response: any) { const body = await response.json(); if (!response.ok) throw new Error(); return body }
async function good(response: any) { if (!response.ok) throw new Error(); return response.json() }
