// seabed: the depth of the water ocean3d draws over the valley's lakes, for its seabed tile, so a
// lake shoals, calms and clears toward its shore. The land does not flood: terrain3d draws the ground
// itself everywhere, and the water is ocean3d's sea, whose surface is y = 0, so the water over a point
// is how far the ground there lies under that surface, max(0, −raw). It has no row, no numbers and no
// server half.
//
// The land comes through a mod (`addons/scenemanager`), `world.seabed.mods: { land: 'terrain3d' }`
// (`terrain3d.seabed.ts`, beside this file since seabed is the game's): terrain3d's browser half's
// `ground`, undefined until its field has loaded. terrain3d places it in its own `afterTick` and this
// reads it in its own, so the scene lists terrain3d before this one (`ahead`).
//
// It hands out `ground`, `{ depth(x, z), edits() }` over that land, or undefined before the land is
// there: the land's own `edits`, so ocean3d bakes its tile again where the land changed. ocean3d takes
// it through `seabed.ocean3d.ts`, and asks it in its `afterTick`, so the scene lists this one, through
// `shipped`, before ocean3d.
import type { Plugins } from '#engine/browser.ts'
import { ahead, mod } from '#addons/scenemanager/scenemanager.addon.ts'
import type { Ground as Land } from '#plugins/terrain3d/terrain3d.plugin.ts'

export type Ground = { depth(x: number, z: number): number; edits(): ReturnType<Land['edits']> }

export function seabed() {
  const me = {
    ground: undefined as Ground | undefined,
    afterTick(plugins: Plugins) {
      const scene = plugins.wire.scene
      const land = mod<(plugins: Plugins) => Land | undefined>(scene.world!, 'seabed', 'land')
      if (!land) throw new Error('seabed stands on a land, and this scene names none in world.seabed.mods.land')
      ahead(scene, 'seabed', 'land')
      const g = land(plugins)
      me.ground = g && { depth: (x, z) => Math.max(0, -g.raw(x, z)), edits: () => g.edits() }
    },
    close() { me.ground = undefined },
  }
  return me
}
