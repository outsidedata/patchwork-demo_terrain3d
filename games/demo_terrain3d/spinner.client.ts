// The spinner: the graphic drawn over the view while the tier's terrain is built. A faceted sphere
// turning about its upright axis, and under it its `text.words` in 3D letters, both in render3d's
// overlay, `dist` metres ahead of the eye and facing it. It shows until the tier's terrain is on the
// scene (`terrain3d.ground.shown()`, which `world.terrain3d.preload` holds false while the rings are
// built), and while the store's `spinner.hold` is true, which only the dev page's checkbox sets, so
// the graphic can be kept on screen and worked on. While the terrain is built the main camera draws
// nothing of the scene, so the sky and the sea show only once the ground does. The sphere's turn is its row's `turn`, set whole as
// a quaternion. Snakes wander the sphere's facets, one in each of
// `snake.colours`, lighting each facet they enter over the sphere's `colour`, and their trails fade. The overlay is lit by its own lights alone, so the graphic carries its own: a
// hemisphere light of `sky` over `ground` and a key light of `key` from over the eye's left shoulder.
// The letters are three's TextGeometry in the catalogue's typeface named `text.font`, centred under
// the sphere, `text.below` metres beneath its middle. The overlay camera's `near` and `far` are the
// definition's. Every number is its definition in `assets/demo_terrain3d.json`.
import type * as THREE from 'three'
import { Font } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'

let group: THREE.Group
let ball: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
let words: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
// Whether the typeface has been asked of the loader.
let asked = false
let up: THREE.Vector3
// The camera layer nothing in the scene is on.
const EMPTY = 31

// The definition's `text`.
type Text = { words: string; font: string; size: number; depth: number; curve: number; bevel: number; bevelSegments: number; colour: string; rough: number; below: number }
let ahead: THREE.Vector3

// The definition's `snake`: one snake for each of its `colours`, all moving by the same numbers.
type Snake = { colours: string[]; step: number; fade: number; below: number; turn: [number, number] }
let base: THREE.Color
let mixed: THREE.Color
// The sphere's facets: `cols` around by `rows` from pole to pole, a facet's number `row * cols + col`,
// and the first vertex of each triangle in each facet.
let cols: number
let rows: number
let facets: number[][]
// A snake's head: its facet, the way it heads in facets a step, the steps until it next turns, the
// seconds since its last step, and its colour.
type Head = { col: number; row: number; dc: number; dr: number; until: number; clock: number; glow: THREE.Color }
let heads: Head[]
// The time of the last frame.
let last: number
// The facets the snakes have lit, each to its brightness, from 1 when a head enters it down to
// `below`, and the colour of the snake that lit it last.
let lit: Map<number, { bright: number; glow: THREE.Color }>

export function setup(row: Row, plugins: Plugins) {
  const three = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  const t = k.text
  const { overlay, dress } = plugins.render3d
  overlay.camera.near = k.near
  overlay.camera.far = k.far
  group = new three.Group()
  // Unshared, so each triangle owns its three vertices and takes one colour.
  const sphere = new three.SphereGeometry(k.radius, k.segments, k.segments / 2).toNonIndexed()
  // Colour and opacity to a vertex, so an unlit facet can be see-through and the far side shows.
  sphere.setAttribute('color', new three.BufferAttribute(new Float32Array(sphere.attributes.position.count * 4), 4))
  ball = new three.Mesh(
    sphere,
    dress(new three.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: three.DoubleSide,
      roughness: k.rough,
      flatShading: true,
    })),
  )
  base = new three.Color(k.colour)
  mixed = new three.Color()
  cols = k.segments
  rows = k.segments / 2
  facets = sort(sphere, k.radius)
  // The snakes start spread evenly round the equator, each heading a quarter turn from the last.
  const s: Snake = k.snake
  heads = s.colours.map((colour, i) => ({
    col: Math.floor((i * cols) / s.colours.length),
    row: rows / 2,
    dc: [1, 0, -1, 0][i % 4],
    dr: [0, 1, 0, -1][i % 4],
    until: between(s.turn),
    clock: 0,
    glow: new three.Color(colour),
  }))
  last = performance.now() / 1000
  lit = new Map()
  words = new three.Mesh(undefined, dress(new three.MeshStandardMaterial({ color: t.colour, roughness: t.rough })))
  words.position.y = -t.below
  words.visible = false
  const key = new three.DirectionalLight(k.key.colour, k.key.strength)
  key.position.fromArray(k.key.from)
  group.add(ball, words, new three.HemisphereLight(k.sky, k.ground, k.fill), key)
  group.visible = false
  overlay.scene.add(group)
  up = new three.Vector3(0, 1, 0)
  ahead = new three.Vector3()
}

export function tick(row: Row, plugins: Plugins) {
  const k = def(plugins.wire, row.kind)
  const camera = plugins.render3d.camera as THREE.PerspectiveCamera | undefined
  const building = !plugins.terrain3d.ground?.shown()
  // While the terrain is built the main camera looks only at a layer nothing is on, so the sky, the
  // sea and the trees wait for the ground and the view is the scene's background behind the graphic.
  camera?.layers.set(building ? EMPTY : 0)
  group.visible = !!camera && (building || plugins.store.get('spinner.hold') === true)
  if (!camera || !group.visible) return
  if (!words.visible) shape(k.text, plugins)
  camera.getWorldDirection(ahead)
  group.position.copy(camera.position).addScaledVector(ahead, k.dist)
  group.quaternion.copy(camera.quaternion)
  ball.quaternion.setFromAxisAngle(up, row.data.turn)
  const now = performance.now() / 1000
  creep(k.snake, Math.min(now - last, 0.1))
  last = now
  paint(k.bare)
}

// Each triangle's facet, from where its middle falls on the sphere: its longitude in `cols` slices and
// its angle down from the top pole in `rows`. Both triangles of a quad, and the one triangle of a facet
// at a pole, land in the same facet.
function sort(sphere: THREE.BufferGeometry, radius: number): number[][] {
  const place = sphere.attributes.position
  const out: number[][] = Array.from({ length: cols * rows }, () => [])
  for (let i = 0; i < place.count; i += 3) {
    const x = place.getX(i) + place.getX(i + 1) + place.getX(i + 2)
    const y = (place.getY(i) + place.getY(i + 1) + place.getY(i + 2)) / 3
    const z = place.getZ(i) + place.getZ(i + 1) + place.getZ(i + 2)
    const around = (Math.atan2(z, -x) + Math.PI * 2) % (Math.PI * 2)
    const c = Math.min(cols - 1, Math.floor(around / (Math.PI * 2) * cols))
    const r = Math.min(rows - 1, Math.floor(Math.acos(Math.min(1, Math.max(-1, y / radius))) / Math.PI * rows))
    out[r * cols + c].push(i)
  }
  return out
}

// A whole number of steps from `[least, most]`.
function between([least, most]: [number, number]) {
  return least + Math.floor(Math.random() * (most - least + 1))
}

// Each snake moves one facet every `step` seconds and lights the facet it enters in its colour. When
// it turns, 90 degrees left or right at random, it draws from `turn` the steps until it turns again.
// Over a pole it comes down the far side, half the way round. Every lit facet dims by 1 over `fade`
// seconds and is dropped once it is under `below`.
function creep(s: Snake, dt: number) {
  for (const [facet, l] of lit) {
    l.bright -= dt / s.fade
    if (l.bright < s.below) lit.delete(facet)
  }
  for (const h of heads) {
    h.clock += dt
    while (h.clock >= s.step) {
      h.clock -= s.step
      h.col += h.dc
      h.row += h.dr
      if (h.row < 0 || h.row >= rows) {
        h.row = h.row < 0 ? 0 : rows - 1
        h.col += cols / 2
        h.dr = -h.dr
      }
      h.col = (h.col + cols) % cols
      lit.set(h.row * cols + h.col, { bright: 1, glow: h.glow })
      h.until -= 1
      if (h.until === 0) {
        const left = Math.random() < 0.5
        ;[h.dc, h.dr] = left ? [h.dr, -h.dc] : [-h.dr, h.dc]
        h.until = between(s.turn)
      }
    }
  }
}

// Every facet is `colour` at opacity `bare`, and each lit one is mixed toward its snake's colour and
// toward opaque by its brightness, so a trail fades out to see-through.
function paint(bare: number) {
  const colour = ball.geometry.attributes.color as THREE.BufferAttribute
  for (let v = 0; v < colour.count; v++) colour.setXYZW(v, base.r, base.g, base.b, bare)
  for (const [facet, { bright, glow }] of lit) {
    mixed.lerpColors(base, glow, bright)
    const opacity = bare + (1 - bare) * bright
    for (const i of facets[facet]) for (let v = i; v < i + 3; v++) colour.setXYZW(v, mixed.r, mixed.g, mixed.b, opacity)
  }
  colour.needsUpdate = true
}

// The letters, made the first frame the loader has the typeface, which is asked for once: before then
// the sphere shows alone.
function shape(t: Text, plugins: Plugins) {
  const face = plugins.loader.get(t.font)
  if (!face) {
    if (!asked) { asked = true; plugins.loader.load(t.font) }
    return
  }
  const letters = new TextGeometry(t.words, {
    font: new Font(face),
    size: t.size,
    depth: t.depth,
    curveSegments: t.curve,
    bevelEnabled: true,
    bevelSize: t.bevel,
    bevelThickness: t.bevel,
    bevelSegments: t.bevelSegments,
  })
  letters.center()
  words.geometry.dispose()
  words.geometry = letters
  words.visible = true
}

export function remove(plugins: Plugins) {
  plugins.render3d.overlay.scene.remove(group)
  ball.geometry.dispose()
  ball.material.dispose()
  words.geometry.dispose()
  words.material.dispose()
}
