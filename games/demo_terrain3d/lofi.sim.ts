// The lofi.scene.json file next to this one: the valley as a PlayStation would have drawn it. Its
// kinds are every tier's, `uhd.sim.ts`'s.
import type { Scene } from '#engine/engine.ts'
import file from './lofi.scene.json' with { type: 'json' }

export { sim } from './uhd.sim.ts'

export const scene = file as Scene
