// seabed's mod for ocean3d (`addons/scenemanager`'s mods), beside seabed since seabed is the game's.
// A scene with `world.ocean3d.mods: { land: 'seabed' }` shoals the lakes over the valley's ground.
//
// `land(plugins)` is seabed's `ground`, the water's depth over the land and the land's edits: undefined
// until terrain3d's field has loaded.
import type { Plugins } from '#engine/browser.ts'
import type { Ground } from './seabed.plugin.ts'

export const land = (plugins: Plugins): Ground | undefined => plugins.seabed.ground
