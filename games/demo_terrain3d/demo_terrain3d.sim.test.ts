// demo_terrain3d: the manager booted as its page boots it and every tier loaded. A seat enters the
// entry tier: its eye, its `player` row, stands `up` over the ground at its start, flies along the way
// it looks at its definition's speed, never comes nearer the ground than `clear`, and carries where
// it stands, how it looks and its pace into another tier, whose `arrive` refuses what no eye could
// hand on. The tour starts the scene's cutscene, and starts it again once it has played.
import { expect, test } from 'vitest'
import { boot, type Row, type Scene, type Truth, type W } from '#engine/engine.ts'
import { connection, load, manager, type Down } from '#addons/scenemanager/scenemanager.addon.ts'
import { possessed } from '#addons/player/player.addon.ts'
import { heightAt } from '#plugins/terrain3d/terrain3d.sim.ts'
import { json } from '#plugins/loader/loader.sim.ts'
import * as math from '#plugins/math/math.sim.ts'
import { sim } from './demo_terrain3d.sim.ts'
import file from './demo_terrain3d.scene.json' with { type: 'json' }
import defs from './assets/demo_terrain3d.json' with { type: 'json' }

const DT = file.prefabs.engine.dt
const entry = file.prefabs.scenemanager.entry
const k = defs.player

// The manager and its tiers, a seat on the entry, and a way to send its `player` row an act.
async function seated() {
  const truth = boot(structuredClone(file) as Scene, sim)
  const tiers = await load(truth, import.meta.url)
  const heard: Down[] = []
  const seat = connection(manager(truth), d => heard.push(d))
  truth.step(DT)
  let seq = 0
  const last = () => heard[heard.length - 1]
  const me = () => possessed(last().packet.rows)!
  const act = (action: string, ...args: unknown[]) =>
    seat.take({ scene: last().scene, seat: last().seat, msg: { seq: ++seq, n: last().packet.n, id: me().id, action, args: args as any } })
  const steps = (n: number) => { for (let i = 0; i < n; i++) truth.step(DT) }
  return { truth, tiers, last, me, act, steps }
}

const eyeIn = (tier: Truth, id: number): Row => tier.rows.find(r => r.id === id)!
// A tier's truth as a rule is handed it.
const wOf = (t: Truth) => ({
  world: t.scene.world,
  all: (kind: string) => t.rows.filter(r => r.kind === kind),
  find: (kind: string, pred: (r: Row) => boolean = () => true) => t.rows.find(r => r.kind === kind && pred(r))!,
  get: (id: number) => t.rows.find(r => r.id === id)!,
}) as unknown as W

test('the eye stands up over the ground at its start, looking along the start', async () => {
  const { tiers, me } = await seated()
  const room = tiers.get(entry)!
  const start = room.rows.find(r => r.kind === 'start' && r.data.slot === me().data.seat)!.data
  const eye = eyeIn(room, me().id).data
  const w = wOf(room)
  expect(eye.stood).toBe(true)
  expect(eye.pos[0]).toBe(start.at[0])
  expect(eye.pos[2]).toBe(start.at[1])
  expect(eye.pos[1]).toBeCloseTo(Math.max(heightAt(w, start.at[0], start.at[1]), 0) + k.clear + start.up, 9)
  expect(eye.look.yaw).toBe(start.yaw)
  expect(eye.look.pitch).toBe(start.pitch)
})

test('forward flies speed·pace metres a second along the way the eye looks, and boost multiplies it', async () => {
  const { tiers, me, act, steps } = await seated()
  const room = tiers.get(entry)!
  const eye = () => eyeIn(room, me().id).data
  const was = [...eye().pos], { yaw, pitch } = eye().look
  act('stick', 0, -1)
  steps(30)
  const run = k.speed * DT * 30
  expect(eye().pos[0]).toBeCloseTo(was[0] + math.sin(yaw) * math.cos(pitch) * run, 6)
  expect(eye().pos[2]).toBeCloseTo(was[2] + math.cos(yaw) * math.cos(pitch) * run, 6)
  expect(eye().pos[1]).toBeCloseTo(was[1] - math.sin(pitch) * run, 6)

  const at = [...eye().pos]
  act('fast', 1)
  steps(30)
  const across = math.hypot(eye().pos[0] - at[0], eye().pos[2] - at[2])
  expect(across).toBeCloseTo(k.boost * run * math.cos(pitch), 6)
})

test('the eye never comes nearer the ground, or the water over a lake, than clear', async () => {
  const { tiers, me, act, steps } = await seated()
  const room = tiers.get(entry)!
  const w = wOf(room)
  act('look', 0, k.camera.maxPitch)
  act('down', 1)
  act('stick', 0, -1)
  act('fast', 1)
  for (let i = 0; i < 20; i++) {
    steps(15)
    const [x, y, z] = eyeIn(room, me().id).data.pos
    expect(y).toBeGreaterThanOrEqual(Math.max(heightAt(w, x, z), 0) + k.clear - 1e-9)
  }
  const [x, y, z] = eyeIn(room, me().id).data.pos
  expect(y).toBeCloseTo(Math.max(heightAt(w, x, z), 0) + k.clear, 9)
})

test('a tier key moves the seat to that tier, its eye arriving where it stood, looking as it looked, at its pace', async () => {
  const { tiers, me, last, act, steps } = await seated()
  act('look', -0.4, 0.1)
  act('pace', -200)
  act('stick', 0.5, -1)
  steps(20)
  act('stick', 0, 0)
  steps(1)
  const before = structuredClone(eyeIn(tiers.get(entry)!, me().id).data)
  const to = k.tiers[1]
  act('tier', 2)
  steps(2)
  expect(last().scene).toBe(to)
  const there = eyeIn(tiers.get(to)!, me().id).data
  expect(there.pos).toEqual(before.pos)
  expect(there.look).toEqual(before.look)
  expect(there.pace).toBe(before.pace)
  expect(there.stood).toBe(true)
})

test('arrive takes only what an eye could hand on, and only before the eye stands', async () => {
  const { tiers, me, act, steps } = await seated()
  const room = tiers.get(entry)!
  const eye = () => eyeIn(room, me().id).data
  const was = structuredClone(eye())
  act('arrive', 10, 500, 10, 0, 0, 1)
  steps(1)
  expect(eye().pos).toEqual(was.pos)
  expect(eye().look).toEqual(was.look)

  const fresh = await seated()
  const other = fresh.tiers.get(entry)!
  const row = () => eyeIn(other, fresh.me().id).data
  row().stood = false
  for (const forged of [[k.reach + 1, 100, 0, 0, 0, 1], [0, k.ceiling + 1, 0, 0, 0, 1], [0, 100, 0, 0, k.camera.maxPitch + 0.1, 1], [0, 100, 0, 0, 0, k.pace.max * 2], ['0', 100, 0, 0, 0, 1]]) {
    fresh.act('arrive', ...forged)
    other.step(DT)
    expect(row().pos).not.toEqual([forged[0], forged[1], forged[2]])
    row().stood = false
  }
})

test('the tour starts the cutscene, and starts it again once it has played', async () => {
  const { tiers, act, steps } = await seated()
  const room = tiers.get(entry)!
  const cut = () => room.rows.filter(r => r.kind === 'cutscene')
  const length = json(wOf(room), room.world.cutscene.script).end as number
  act('tour')
  steps(2)
  expect(cut()).toHaveLength(1)
  expect(cut()[0].data.running).toBe(true)
  const first = cut()[0].id
  steps(Math.ceil(length / DT) + 2)
  expect(cut()[0].data.done).toBe(true)

  act('tour')
  steps(3)
  expect(cut()).toHaveLength(1)
  expect(cut()[0].id).not.toBe(first)
  expect(cut()[0].data.running).toBe(true)
}, 120_000)
