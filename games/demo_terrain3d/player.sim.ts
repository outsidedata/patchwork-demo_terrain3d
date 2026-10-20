// The row one seat possesses, and the eye that seat flies: a point over the valley that the camera
// sits on (chasecamera3d, `dist` metres behind it), turned by the mouse and flown by the keys.
// `addons/player` spawns it and writes the slot it gave the connection into `seat`, and every seat is
// sent it. A page running the scene ahead (`addons/predict`) draws its own from its copy, so the eye
// answers the key on the next frame. Every number is the player's definition in
// `assets/demo_terrain3d.json`.
//
// The row: `seat`, and `stood`, whether it stands yet: on its start, or where `arrive` put it. Its own:
//   pos       [x, y, z], the eye, in metres.
//   look      `{ yaw, pitch, dist }`: chasecamera3d's orbit; the eye looks along yaw and down by pitch.
//   lift      0: the camera's pivot is the eye itself.
//   stick     [x, z], the keys' way, right and forward; `up` and `down`, the climb keys held; `fast`,
//             the boost key held.
//   pace      the fly speed's multiplier, which the wheel moves, from `pace.min` to `pace.max`.
//   tour      a tour asked for and not yet started.
//
// `before` stands it once on the scene's `start` actor for its slot, `up` metres over the ground at the
// start's `at`, looking along its `yaw` and down by its `pitch`, unless `arrive` stood it first. Each
// step after, it flies `speed`·pace metres a second along the way it looks, forward and back, and
// across it, level, right and left, and `climb`·pace straight up or down; all of it `boost` times
// faster while `fast` is held. It never comes nearer than `clear` metres to the ground, or the sea's
// surface at y = 0 over a lake, nor goes higher than `ceiling`.
//
// The tour. `tour` asks for the scene's cutscene (`assets/tour.json`): the step that sees it starts
// the scene's cutscene row when that row is fresh. A row's tour plays once, so when the row has played
// it, the step ends it and spawns a new one, and the step after, once the new row's `before` has
// written its fields, starts that one. While it plays the cutscene holds the camera; when it ends the
// camera is back on the eye, where it was.
//
// The acts are the page's keys: `stick(x, y)` (y down, as a stick reads), `up`, `down` and `fast` (1
// held, 0 let go), `pace(d)` the wheel, `look(dyaw, dpitch)`, `tour`, and `tier(n)`, which moves the
// seat to the definition's `tiers[n − 1]` through the scene's `scenemanager` row, handing on where the
// eye stands, how it looks and its pace, so the next tier opens on the same view. `arrive` takes them
// there, only while the row has not stood: a position inside `reach` metres and under `ceiling`, a
// pitch inside the camera's bounds and a pace inside its own. A seat's message arrives from outside
// the program, so each act refuses arguments of the wrong kind and writes nothing.
import type { Kind, Row, W } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import { heightAt } from '#plugins/terrain3d/terrain3d.sim.ts'
import * as math from '#plugins/math/math.sim.ts'

const wrap = (a: number) => a - 2 * Math.PI * Math.ceil((a - Math.PI) / (2 * Math.PI))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const finite = (...v: unknown[]) => v.every(x => typeof x === 'number' && Number.isFinite(x))
const held = (v: unknown) => v === 0 || v === 1
const way = (v: unknown) => typeof v === 'number' && Math.abs(v) <= 1

// The lowest the eye may be at x, z: `clear` over the ground, or over the sea's surface where it is
// higher.
const floorAt = (w: W, k: any, x: number, z: number) => Math.max(heightAt(w, x, z), 0) + k.clear

function fly(me: Row, w: W, dt: number) {
  const d = me.data
  const k = def(w, me.kind)
  const { yaw, pitch } = d.look
  const cy = math.cos(yaw), sy = math.sin(yaw), cp = math.cos(pitch), sp = math.sin(pitch)
  const forward = [sy * cp, -sp, cy * cp]
  const right = [-cy, 0, sy]
  const boost = d.fast ? k.boost : 1
  const run = k.speed * d.pace * boost, rise = k.climb * d.pace * boost * ((d.up ? 1 : 0) - (d.down ? 1 : 0))
  const [sx, sz] = d.stick
  const x = d.pos[0] + (forward[0] * sz + right[0] * sx) * run * dt
  const z = d.pos[2] + (forward[2] * sz + right[2] * sx) * run * dt
  const y = d.pos[1] + (forward[1] * sz * run + rise) * dt
  d.pos = [x, clamp(y, floorAt(w, k, x, z), k.ceiling), z]
}

// The tour: start a fresh cutscene row, or end a played one and spawn the next.
function tour(me: Row, w: W) {
  const [row] = w.all('cutscene')
  if (!row) throw new Error('no cutscene row: the scene\'s actors give it one')
  if (row.data.running) { me.data.tour = false; return }
  if (row.data.done) { w.end(row); w.spawn('cutscene'); return }
  if (row.data.done === undefined) return
  w.call(row, 'start', -1)
  me.data.tour = false
}

export const player: Kind = {
  before(me, _dt, w) {
    const d = me.data
    if (d.stood) return
    const start = w.find('start', s => s.data.slot === d.seat).data
    const [x, z] = start.at
    d.pos = [x, floorAt(w, def(w, me.kind), x, z) + start.up, z]
    d.look = { ...d.look, yaw: start.yaw, pitch: start.pitch }
    d.stood = true
  },
  tick(me, dt, w) {
    if (!me.data.stood) return
    fly(me, w, dt)
    if (me.data.tour) tour(me, w)
  },
  acts: {
    stick(me, _w, _seat, x: unknown, y: unknown) {
      if (way(x) && way(y)) me.data.stick = [x, 0 - (y as number)]
    },
    up(me, _w, _seat, v: unknown) { if (held(v)) me.data.up = !!v },
    down(me, _w, _seat, v: unknown) { if (held(v)) me.data.down = !!v },
    fast(me, _w, _seat, v: unknown) { if (held(v)) me.data.fast = !!v },
    pace(me, w, _seat, by: unknown) {
      if (!finite(by)) return
      const p = def(w, me.kind).pace
      me.data.pace = clamp(me.data.pace * math.exp(-(by as number) * p.step), p.min, p.max)
    },
    look(me, w, _seat, dyaw: unknown, dpitch: unknown) {
      if (!finite(dyaw, dpitch)) return
      const c = def(w, me.kind).camera
      const l = me.data.look
      me.data.look = { ...l, yaw: wrap(l.yaw + (dyaw as number)), pitch: clamp(l.pitch + (dpitch as number), c.minPitch, c.maxPitch) }
    },
    tour(me) { me.data.tour = true },
    tier(me, w, seat, n: unknown) {
      const tiers: string[] = def(w, me.kind).tiers
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > tiers.length) return
      const d = me.data
      w.call(w.find('scenemanager'), 'go', seat, tiers[n - 1], ...d.pos, d.look.yaw, d.look.pitch, d.pace)
    },
    arrive(me, w, _seat, x: unknown, y: unknown, z: unknown, yaw: unknown, pitch: unknown, pace: unknown) {
      const d = me.data
      if (d.stood || !finite(x, y, z, yaw, pitch, pace)) return
      const k = def(w, me.kind)
      const [px, py, pz, pp, pc] = [x, y, z, pitch, pace] as number[]
      if (Math.abs(px) > k.reach || Math.abs(pz) > k.reach || py > k.ceiling) return
      if (pp < k.camera.minPitch || pp > k.camera.maxPitch || pc < k.pace.min || pc > k.pace.max) return
      d.pos = [px, Math.max(py, floorAt(w, k, px, pz)), pz]
      d.look = { ...d.look, yaw: wrap(yaw as number), pitch: pp }
      d.pace = pc
      d.stood = true
    },
  },
}
