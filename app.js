import { Hono } from 'hono'
import bs01 from './routes/bs01.js'
import pzl  from './routes/pzl.js'
import novel from './routes/novel.js'

const app = new Hono()

app.route('/api/bs01', bs01)
app.route('/api/pzl',  pzl)
app.route('/api/novel', novel)

app.get('/', (c) => c.text('Hono MiniForge Server'))

export default app
