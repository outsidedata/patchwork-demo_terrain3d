// One seat's eye, its `player` row. Nothing of it is drawn: the camera sits on it. For the seat's own
// row, the one that is `mine`, its keys, mouse and camera. Every key is the player's definition in
// `assets/demo_terrain3d.json` (`keys`), and each names the `player` row's act of the same name
// (`player.sim.ts`): the stick (left, right, forward and back), `up`, `down` and `fast` held, `tier`
// with each tier's number, and `tour`. The mouse moved under the pointer lock, which a click takes, or
// dragged with `drag` held, sends `look` with its pixels times `sens`, right turning the eye right and
// down tilting it down; the wheel sends `pace` with the pixels it turned. Each frame chasecamera3d
// follows the row. A page running the scene ahead draws its own seat's row from its copy, so the view
// answers the key on the next frame.
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import type { Binds, Input } from '#plugins/player/player.plugin.ts'
import { def } from '#plugins/loader/loader.sim.ts'

// Whether the row is this seat's.
let ours = false

export function setup(row: Row, plugins: Plugins) {
  ours = row.data.mine === true
  if (!ours) return
  const k = def(plugins.wire, row.kind)
  const keys = k.keys
  // chasecamera3d looks along (sin yaw, cos yaw), so a larger yaw turns the view left: right on the
  // mouse is less yaw. A larger pitch lifts the camera over the eye and looks down.
  const look = (dx: number, dy: number): Input => ['look', -dx * k.sens, dy * k.sens]
  plugins.player.bind({
    stick: [{ keys: keys.stick, send: (x, y) => ['stick', x, y] }],
    hold: [
      { keys: keys.up, send: v => ['up', v] },
      { keys: keys.down, send: v => ['down', v] },
      { keys: keys.fast, send: v => ['fast', v] },
    ],
    press: {
      [keys.tour]: ['tour'],
      ...Object.fromEntries((keys.tiers as string[]).map((key, i) => [key, ['tier', i + 1] as Input])),
    },
    pointer: look,
    drag: { key: keys.drag, send: look },
    wheel: dy => ['pace', dy],
  } satisfies Binds)
}

export function tick(row: Row, plugins: Plugins) {
  if (ours) plugins.chasecamera3d.follow(row.id)
}

export function remove(plugins: Plugins) {
  if (ours) plugins.player.unbind()
}
