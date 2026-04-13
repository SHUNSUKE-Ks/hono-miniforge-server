import { Hono } from 'hono'

const bs01 = new Hono()

// 敵データ
const ENEMIES = [
  { id: 'slime',    name: 'スライム',  hp: 50,  atk: 8,  def: 3 },
  { id: 'goblin',   name: 'ゴブリン',  hp: 70,  atk: 12, def: 5 },
  { id: 'skeleton', name: 'スケルトン', hp: 90,  atk: 15, def: 8 },
]

// コマンド定義
const COMMANDS = ['攻撃', '魔法', 'アイテム', '逃げる']

// GET /api/bs01/start — バトル開始・敵生成
bs01.get('/start', (c) => {
  const enemy = { ...ENEMIES[Math.floor(Math.random() * ENEMIES.length)] }
  enemy.maxHp = enemy.hp

  return c.json({
    status: 'ok',
    data: {
      enemy,
      player: { hp: 100, maxHp: 100, mp: 30, maxMp: 30 },
      commands: COMMANDS,
    },
  })
})

// POST /api/bs01/action — コマンド実行・ダメージ計算
bs01.post('/action', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { command, enemy_hp = 50, enemy_maxHp = 50, player_hp = 100, player_maxHp = 100 } = body

  let damage = 0
  let message = ''
  let result = 'none'
  let new_enemy_hp = enemy_hp
  let new_player_hp = player_hp

  if (command === '攻撃') {
    damage = Math.floor(Math.random() * 15) + 8
    new_enemy_hp = Math.max(0, enemy_hp - damage)
    result = new_enemy_hp === 0 ? 'enemy_dead' : 'hit'
    message = new_enemy_hp === 0
      ? `${damage}のダメージ！敵を倒した！`
      : `${damage}のダメージ！`

  } else if (command === '魔法') {
    damage = Math.floor(Math.random() * 25) + 15
    new_enemy_hp = Math.max(0, enemy_hp - damage)
    result = new_enemy_hp === 0 ? 'enemy_dead' : 'hit'
    message = `炎が燃え上がる！${damage}のダメージ！`

  } else if (command === 'アイテム') {
    const heal = 30
    new_player_hp = Math.min(player_maxHp, player_hp + heal)
    result = 'heal'
    message = `HPが${heal}回復した！`

  } else if (command === '逃げる') {
    result = 'escape'
    message = 'うまく逃げ切れた！'
  }

  // 敵の反撃（逃げる・倒した場合はなし）
  let enemy_damage = 0
  if (result === 'hit') {
    enemy_damage = Math.floor(Math.random() * 10) + 5
    new_player_hp = Math.max(0, new_player_hp - enemy_damage)
  }

  return c.json({
    status: 'ok',
    data: {
      result,
      damage,
      enemy_damage,
      message,
      enemy:  { hp: new_enemy_hp,  maxHp: enemy_maxHp },
      player: { hp: new_player_hp, maxHp: player_maxHp },
    },
  })
})

export default bs01
