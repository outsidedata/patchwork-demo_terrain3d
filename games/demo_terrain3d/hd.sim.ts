// The hd.scene.json file next to this one: the valley as most games draw terrain3d. Its kinds are
// every tier's, `uhd.sim.ts`'s.
import type { Scene } from '#engine/engine.ts'
import file from './hd.scene.json' with { type: 'json' }

export { sim } from './uhd.sim.ts'

export const scene = file as Scene
