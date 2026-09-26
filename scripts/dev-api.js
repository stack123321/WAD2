// Owner: Ryan. Lets `npm run dev` run the serverless functions in api/, so nobody needs `vercel dev`.
//
// On Vercel, each file in api/ becomes a URL: api/route.js → /api/route. Vercel hands the function
// a request with req.query and req.body, and a response with res.status(), res.json() and res.send().
// This plugin does the same inside the Vite dev server, so the same file works locally and on Vercel.
//
// Server-only keys (no VITE_ prefix) are read from .env.local into process.env, like Vercel does
// with the keys set in its dashboard.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from 'vite'

export default function devApi() {
  return {
    name: 'fairpoint-dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value
      }

      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.replace(/^\/+|\/+$/g, '')
        // Files starting with _ (like api/_mocks/) are helpers, not endpoints — same rule as Vercel
        if (!/^[a-z0-9-]+$/i.test(name)) return next()

        const file = join(server.config.root, 'api', `${name}.js`)
        if (!existsSync(file)) return sendJson(res, 404, { error: `No api/${name}.js` })

        req.query = Object.fromEntries(url.searchParams)
        req.body = await readBody(req)
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (data) => sendJson(res, res.statusCode || 200, data)
        res.send = (data) => (typeof data === 'object' ? res.json(data) : res.end(String(data)))

        try {
          // ssrLoadModule picks up your edits without restarting the dev server
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          await mod.default(req, res)
        } catch (error) {
          server.config.logger.error(`[api/${name}] ${error.stack ?? error}`)
          if (!res.writableEnded) sendJson(res, 500, { error: error.message })
        }
      })
    },
  }
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
