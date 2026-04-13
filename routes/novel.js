import { Hono } from 'hono'

const novel = new Hono()

novel.get('/', (c) => c.json({ route: 'novel', status: 'ok' }))

export default novel
