// Owner: Surya. OneMap login token, shared by the api/ functions that call OneMap (search, routing).
// Not an endpoint (files starting with _ are skipped).
// The token lasts 3 days, so we keep it in memory and only log in again when it's about to expire.
// Docs: https://www.onemap.gov.sg/apidocs/authentication

let cached = null // { token, expiresAt } with expiresAt in ms

/** True when .env.local (or Vercel) has a OneMap login. Without one, functions answer with samples. */
export function hasOneMapLogin() {
  return Boolean(process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD)
}

/** @returns {Promise<string>} a token for the Authorization header of OneMap calls */
export async function getOneMapToken() {
  if (cached && Date.now() < cached.expiresAt - 60 * 1000) return cached.token

  const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`OneMap login failed: ${res.status}`)

  const data = await res.json()
  cached = { token: data.access_token, expiresAt: Number(data.expiry_timestamp) * 1000 }
  return cached.token
}
