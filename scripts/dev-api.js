// Owner: Ryan
// runs the api/ serverless functions inside `npm run dev`, copies vercel's req and res so no need `vercel dev`
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
        // files starting with _ (like api/_mocks/) are helpers, not endpoints (same rule as vercel)
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
          // ssrLoadModule picks up your edits so no need restart server
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
