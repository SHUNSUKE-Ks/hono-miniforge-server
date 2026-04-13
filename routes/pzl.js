import { Hono } from 'hono'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const pzl = new Hono()
const __dir = dirname(fileURLToPath(import.meta.url))
const puzzleDir = join(__dir, '../data/puzzles')

// ---- ユーティリティ ----

function loadPuzzle(id) {
  const dirs = readdirSync(puzzleDir)
  const target = dirs.find(d => d.startsWith(id))
  if (!target) return null
  try {
    return JSON.parse(readFileSync(join(puzzleDir, target, 'puzzle.json'), 'utf-8'))
  } catch {
    return null
  }
}

function loadSkin(id) {
  try {
    return JSON.parse(readFileSync(join(__dir, `../assets/skins/${id}.json`), 'utf-8'))
  } catch {
    return null
  }
}

function statesMatch(s1, s2) {
  return JSON.stringify(s1) === JSON.stringify(s2)
}

// セッション in-memory ストア
const sessions = new Map()

// ---- エンドポイント ----

// POST /api/pzl/start — パズル初期化 → state 返却
pzl.post('/start', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const puzzle_id = body.puzzle_id ?? 'PZL-002'
  const skin_id   = body.skin_id   ?? 'skin_detective_dark'

  const puzzle = loadPuzzle(puzzle_id)
  if (!puzzle) {
    return c.json({ status: 'error', error: `puzzle not found: ${puzzle_id}` }, 404)
  }

  const sess = randomUUID()
  sessions.set(sess, {
    puzzle_id,
    state:        puzzle.initial_state,
    answer_state: puzzle.answer_state,
    hints_used:   0,
    created_at:   Date.now(),
  })

  return c.json({
    status: 'ok',
    data: {
      sess,
      puzzle_id:     puzzle.id,
      title:         puzzle.title,
      category:      puzzle.category,
      difficulty:    puzzle.difficulty,
      question_text: puzzle.question_text,
      state:         puzzle.initial_state,
      extra:         puzzle.extra ?? null,
      hint_count:    puzzle.hints.length,
      skin_url:      `/assets/skins/${skin_id}.json`,
    },
  })
})

// POST /api/pzl/action — 操作送信 → 新 state 返却
pzl.post('/action', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { sess, move_index, state } = body

  if (!sess || !sessions.has(sess)) {
    return c.json({ status: 'error', error: 'invalid session' }, 400)
  }

  const s = sessions.get(sess)

  // 汎用: クライアントから state を丸ごと受け取る（PZL-002 以外）
  if (state !== undefined && s.puzzle_id !== 'PZL-002') {
    s.state = state
    const cleared = statesMatch(state, s.answer_state)
    return c.json({ status: 'ok', data: { state, cleared } })
  }

  // スライドパズル専用: move_index による隣接移動
  if (move_index !== undefined) {
    const st    = s.state
    const empty = st.indexOf(0)
    const SIZE  = 3
    const eRow  = Math.floor(empty / SIZE)
    const eCol  = empty % SIZE
    const mRow  = Math.floor(move_index / SIZE)
    const mCol  = move_index % SIZE

    const adjacent = (Math.abs(eRow - mRow) + Math.abs(eCol - mCol)) === 1
    if (!adjacent || move_index < 0 || move_index >= st.length) {
      return c.json({ status: 'error', error: 'invalid move' }, 400)
    }

    const newState = [...st]
    ;[newState[empty], newState[move_index]] = [newState[move_index], newState[empty]]
    s.state = newState

    const cleared = statesMatch(newState, s.answer_state)
    return c.json({ status: 'ok', data: { state: newState, cleared } })
  }

  return c.json({ status: 'error', error: 'invalid action' }, 400)
})

// POST /api/pzl/check — 解答最終判定
pzl.post('/check', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { sess } = body

  if (!sess || !sessions.has(sess)) {
    return c.json({ status: 'error', error: 'invalid session' }, 400)
  }

  const s       = sessions.get(sess)
  const puzzle  = loadPuzzle(s.puzzle_id)
  const cleared = statesMatch(s.state, s.answer_state)

  return c.json({
    status: 'ok',
    data: {
      cleared,
      state:          s.state,
      clear_text:     cleared ? puzzle?.clear_text     : null,
      reward_item_id: cleared ? puzzle?.reward_item_id : null,
      next_scene_id:  cleared ? `scene_after_${s.puzzle_id}` : null,
    },
  })
})

// GET /api/pzl/hint/:id/:step — ヒント取得
pzl.get('/hint/:id/:step', (c) => {
  const { id, step } = c.req.param()
  const puzzle = loadPuzzle(id)
  if (!puzzle) {
    return c.json({ status: 'error', error: `puzzle not found: ${id}` }, 404)
  }

  const stepNum = parseInt(step, 10)
  const hint    = puzzle.hints.find(h => h.step === stepNum)
  if (!hint) {
    return c.json({ status: 'error', error: `hint step ${step} not found` }, 404)
  }

  return c.json({ status: 'ok', data: { puzzle_id: id, step: stepNum, text: hint.text, cost: hint.cost } })
})

// GET /api/pzl/skin/:id — skin.json 全体返却
pzl.get('/skin/:id', (c) => {
  const { id }  = c.req.param()
  const skin    = loadSkin(id)
  if (!skin) {
    return c.json({ status: 'error', error: `skin not found: ${id}` }, 404)
  }
  return c.json({ status: 'ok', data: skin })
})

// GET /api/pzl/list — パズル一覧
pzl.get('/list', (c) => {
  try {
    const dirs = readdirSync(puzzleDir)
    const list = dirs.map(d => {
      try {
        const p = JSON.parse(readFileSync(join(puzzleDir, d, 'puzzle.json'), 'utf-8'))
        return { id: p.id, title: p.title, category: p.category, difficulty: p.difficulty }
      } catch { return null }
    }).filter(Boolean)
    return c.json({ status: 'ok', data: list })
  } catch {
    return c.json({ status: 'error', error: 'cannot read puzzle list' }, 500)
  }
})

// GET /api/pzl/state/:sess — 状態復元
pzl.get('/state/:sess', (c) => {
  const { sess } = c.req.param()
  if (!sessions.has(sess)) {
    return c.json({ status: 'error', error: 'session not found' }, 404)
  }
  const s = sessions.get(sess)
  return c.json({ status: 'ok', data: { sess, puzzle_id: s.puzzle_id, state: s.state } })
})

export default pzl
