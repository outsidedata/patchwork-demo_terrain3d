// The kinds of every tier, and the uhd.scene.json file next to this one: the valley at the most
// terrain3d draws. The other tiers' sims hand out this one. The ground is the field the scene's
// `world.terrain3d` names, the same land in every tier (`assets/valley.mjs`); the sky is skydome3d's
// row, the lakes ocean3d's, the tour the cutscene's, stood on terrain3d's `heightAt`; the caption's
// row draws what the tier is, and each seat flies its `player` row from its slot's start.
import type { Scene, Sim } from '#engine/engine.ts'
import { scenemanager } from '#plugins/scenemanager/scenemanager.sim.ts'
import { loader } from '#plugins/loader/loader.sim.ts'
import { skydome3d } from '#plugins/skydome3d/skydome3d.sim.ts'
import { ocean3d } from '#plugins/ocean3d/ocean3d.sim.ts'
import { cutscene } from '#plugins/cutscene/cutscene.sim.ts'
import { heightAt } from '#plugins/terrain3d/terrain3d.sim.ts'
import { player } from './player.sim.ts'
import { start } from './start.sim.ts'
import { caption } from './caption.sim.ts'
import { spinner } from './spinner.sim.ts'
import file from './uhd.scene.json' with { type: 'json' }

export const sim: Sim = { scenemanager, loader, skydome3d, ocean3d, cutscene: cutscene(heightAt), caption, player, start, spinner }

export const scene = file as Scene
