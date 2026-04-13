// ローカル開発専用エントリポイント
// Vercel では api/index.js が使われるため、このファイルは実行されない
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './app.js'

app.use('/assets/*', serveStatic({ root: './' }))

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
