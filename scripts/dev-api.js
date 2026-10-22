// Owner: Ryan
// runs the api/ serverless functions inside `npm run dev`, mimicking vercel's req and res so `vercel dev` isn't needed
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from 'vite'

export default function devApi() {
  return {
    name: 'fairpoint-dev-api',
    // only while the dev server runs, not in a build
    apply: 'serve',
    configureServer(server) {
      // copy every key from .env.local into process.env so the api files can read them like on vercel
      const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value
      }

      // runs for every request whose address starts with /api
      server.middlewares.use('/api', async (req, res, next) => {
        // parse the address, the base is needed because req.url is only a path
        const url = new URL(req.url, 'http://localhost')
        // the file name from the address, e.g. /crowd becomes crowd
        const name = url.pathname.replace(/^\/+|\/+$/g, '')
        // files starting with _ (like api/_mocks/) are helpers, not endpoints (same rule as vercel)
        if (!/^[a-z0-9-]+$/i.test(name)) return next()

        // the file to run, e.g. api/crowd.js
        const file = join(server.config.root, 'api', `${name}.js`)
        // answer 404 if there is no api file with that name
        if (!existsSync(file)) return sendJson(res, 404, { error: `No api/${name}.js` })

        // the ?at=... part of the address as an object, which handler reads as req.query.at
        req.query = Object.fromEntries(url.searchParams)
        // the request body for post requests, undefined for get
        req.body = await readBody(req)
        // add vercel's res.status, res.json and res.send, which node's res doesn't have
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (data) => sendJson(res, res.statusCode || 200, data)
        res.send = (data) => (typeof data === 'object' ? res.json(data) : res.end(String(data)))

        try {
          // loads the file fresh, so edits show up without restarting the dev server
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          // calls the file's default export, the handler
          await mod.default(req, res)
        } catch (error) {
          // log the error here and answer 500 unless a reply was already started
          server.config.logger.error(`[api/${name}] ${error.stack ?? error}`)
          if (!res.writableEnded) sendJson(res, 500, { error: error.message })
        }
      })
    },
  }
}

// send data as json with the given status
function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

// read the request body, parsed as json when it is valid json
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
