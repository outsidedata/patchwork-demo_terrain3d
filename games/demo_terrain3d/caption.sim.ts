// The caption's row. It carries nothing: it is here so `caption.client.ts` runs on every seat's page.
// What it shows is the scene's `world.tier` and the seat's own eye, its `player` row; where it shows
// it is the caption's definition in `assets/demo_terrain3d.json` and the `caption` ui panel.
import type { Kind } from '#engine/engine.ts'

export const caption: Kind = {}
