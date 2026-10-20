// The spinner: the sphere drawn over the view while the tier's terrain is built, `spinner.client.ts`.
// Its row carries its `turn`, which each step adds its definition's `spin` (radians a second) to, so
// render3d puts it between the last two steps as it does every moving thing and it turns the same
// amount every frame. Its numbers are its definition in `assets/demo_terrain3d.json`.
import type { Kind } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'

export const spinner: Kind = {
  tick(me, dt, w) {
    me.data.turn = (me.data.turn + def(w, me.kind).spin * dt) % (Math.PI * 2)
  },
}
