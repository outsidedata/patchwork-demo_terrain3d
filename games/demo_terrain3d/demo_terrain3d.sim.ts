// The manager. One row, naming the tiers and the one every connection enters.
import type { Sim } from '#engine/engine.ts'
import { scenemanager } from '#plugins/scenemanager/scenemanager.sim.ts'

export const sim: Sim = { scenemanager }
