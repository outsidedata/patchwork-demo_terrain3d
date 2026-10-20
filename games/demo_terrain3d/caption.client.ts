// The caption over the top left of the view, on the `caption` ui panel: the tier's `title`, in
// `caption.title`; under it each of its `lines`, `line` pixels apart, then the seat's own eye, its
// pace and its height over the ground beneath it, in `caption.text`; and the keys, `help`, in
// `caption.keys`. The title and the lines are the scene's `world.tier`, so each tier says what it
// does; every place is the caption's definition in `assets/demo_terrain3d.json`, in pixels from the
// panel's top left. While the tour plays it shows nothing, and nothing until the land is on the scene
// (the tier preloads it, `world.terrain3d.preload`), while the spinner says so.
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import { possessed } from '#plugins/player/player.plugin.ts'

// Nothing is made before the first frame: the ui makes each thing the first time `tick` shows it, and
// takes it away after a frame that does not show it.
export function setup() {}

export function remove() {}

export function tick(row: Row, plugins: Plugins) {
  const { ui, wire } = plugins
  const { PIXI } = ui
  const k = def(wire, row.kind)
  const tier = wire.scene.world!.tier as { title: string; lines: string[] }
  const playing = !!wire.rows.find(r => r.kind === 'cutscene')?.data.running
  const mine = possessed(wire.rows)
  const text = (key: string, style: string, at: number[]) => {
    const t = ui.show('caption', key, () => new PIXI.Text({ text: '', style: ui.style(style) })) as InstanceType<typeof PIXI.Text>
    t.position.set(at[0], at[1])
    return t
  }
  if (!plugins.terrain3d.ground?.shown() || playing || !mine?.data.stood) return
  text('title', 'caption.title', k.title).text = tier.title
  tier.lines.forEach((line, i) => { text(`line ${i}`, 'caption.text', [k.lines[0], k.lines[1] + i * k.line]).text = line })
  const [x, y, z] = mine.data.pos
  const ground = plugins.terrain3d.ground
  const over = ground ? `${(y - Math.max(ground.height(x, z), 0)).toFixed(0)} m over the ground` : ''
  text('eye', 'caption.text', [k.lines[0], k.lines[1] + tier.lines.length * k.line]).text = `pace ×${mine.data.pace.toFixed(2)}  ${over}`
  text('keys', 'caption.keys', k.keys).text = k.help
}
