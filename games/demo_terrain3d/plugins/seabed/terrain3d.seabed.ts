// terrain3d's mod for seabed (`addons/scenemanager`'s mods), beside seabed since seabed is the game's.
// A scene with `world.seabed.mods: { land: 'terrain3d' }` stands the lakes' water on terrain3d's land.
//
// `land(plugins)` is the land as this page has it, terrain3d's browser half's `ground`: undefined
// until its field has loaded.
import type { Plugins } from '#engine/browser.ts'
import type { Ground } from '#plugins/terrain3d/terrain3d.plugin.ts'

export const land = (plugins: Plugins): Ground | undefined => plugins.terrain3d.ground
