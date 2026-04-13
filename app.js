import { Hono } from 'hono'
import { cors } from 'hono/cors'
import bs01 from './routes/bs01.js'
import pzl  from './routes/pzl.js'
import novel from './routes/novel.js'

const app = new Hono()

// CORS: 開発中はローカル全ポートを許可
// 将来の外部 GameCenter App は GAME_CENTER_ORIGIN 環境変数で追加する
const allowedOrigins = [
  'http://localhost:5173',  // 10_Gallery / 各ゲーム Vite dev
  'http://localhost:4173',  // vite preview
  'http://localhost:3000',  // サーバー自身
  ...(process.env.GAME_CENTER_ORIGIN ? [process.env.GAME_CENTER_ORIGIN] : []),
]

app.use('/api/*', cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.route('/api/bs01', bs01)
app.route('/api/pzl',  pzl)
app.route('/api/novel', novel)

app.get('/', (c) => c.text('Hono MiniForge Server'))

export default app
