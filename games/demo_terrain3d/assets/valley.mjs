// Writes the valley's three field files, `uhd.json`, `hd.json` and `lofi.json`, from one land. The
// three share every byte of their `program`, `analysis`, `surfaces` and `layers`, and every rule of
// their ground layers, so the ground is the same ground in every tier, height for height and layer
// for layer, and scatter3d places the same trees on it; only the size of the maps the layers are
// drawn with differs, and what of the look costs most. The game never reads this script; it is kept
// so the files can be made again, and so a change to the land is made once:
//
//   node games/demo_terrain3d/assets/valley.mjs
//
// The land. Four biomes, each a strength and a height (terrain3d's `biomes` node):
//   meadow   the valley floor: low rolling pasture from 30 m under the waterline to 40 m over it, so
//            its hollows hold tarns.
//   crags    broken limestone ridges, warped and terraced, from 80 m to 700 m.
//   glacier  high rounded snowfields with ridged crests, from 450 m to 1000 m.
//   desert   rolling dunes across the wind, 180 m apart and 22 m high, on a floor 45 to 105 m up.
// Each biome's strength is a value noise of its own; the crags', the glacier's and the desert's are
// levelled toward their values at the origin across a few hundred metres (`clearing`), so the valley
// the seat starts in stays a valley. `sharp` 7 keeps each biome's ground its own across most of its
// reach, and blends them where two meet. The land does not flood: the water is ocean3d's sea, whose
// surface is y = 0, standing in every hollow the ground dips under it (the game's `seabed` plugin
// hands ocean3d the depth).
//
// The road. One painted layer around the start: a `bench` stroke cut along the valley floor, flat
// across and following the land along, and a `surface` stroke of `road` over it, whose `cover` 0
// clears the trees and the grass off it, and which the `road` ground layer lays gravel on.
//
// The look. Ten ground layers (`terrain3d.warp.ts`), each over the ones before it where its rules,
// its noise and its warp put it; scatter3d reads them by name (`layer:<name>`), so a fir stands on
// drawn meadow and a stone on drawn sand.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname

const program = {
  world: 12000,
  hscale: 1000,
  sea: 0.5,
  flood: false,
  out: 'ground',
  nodes: [
    // The meadow: rolling pasture with tarns in its hollows.
    { id: 'roll', op: 'noise', kind: 'simplex', freq: 14, seed: 11 },
    { id: 'tufts', op: 'noise', kind: 'simplex', freq: 140, seed: 12 },
    { id: 'rolled', op: 'combine', mode: 'lerp', a: 'roll', b: 'tufts', t: 0.06 },
    { id: 'meadowH', op: 'remap', input: 'rolled', inLo: 0.1, inHi: 0.9, outLo: -0.03, outHi: 0.04, ease: 'smooth' },

    // The crags: warped ridges in terraces of broken rock.
    { id: 'pushX', op: 'noise', kind: 'value', freq: 9, seed: 31 },
    { id: 'pushXs', op: 'remap', input: 'pushX', inLo: 0, inHi: 1, outLo: -1, outHi: 1, ease: 'smooth' },
    { id: 'pushZ', op: 'noise', kind: 'value', freq: 9, seed: 32 },
    { id: 'pushZs', op: 'remap', input: 'pushZ', inLo: 0, inHi: 1, outLo: -1, outHi: 1, ease: 'smooth' },
    { id: 'grain', op: 'noise', kind: 'value', freq: 16, seed: 41 },
    { id: 'warped', op: 'warp', input: 'grain', x: 'pushXs', z: 'pushZs', amount: 260 },
    { id: 'crest', op: 'fold', input: 'warped', kind: 'ridge' },
    { id: 'benches', op: 'fold', input: 'crest', kind: 'terrace', steps: 6 },
    { id: 'scree', op: 'noise', kind: 'value', freq: 200, seed: 66 },
    { id: 'broken', op: 'combine', mode: 'lerp', a: 'benches', b: 'scree', t: 0.03 },
    { id: 'cragsH', op: 'remap', input: 'broken', inLo: 0, inHi: 1, outLo: 0.08, outHi: 0.7, ease: 'smooth' },

    // The glacier: high rounded snowfields with ridged crests.
    { id: 'domes', op: 'noise', kind: 'value', freq: 6, seed: 51 },
    { id: 'aretes', op: 'noise', kind: 'simplex', freq: 22, seed: 52 },
    { id: 'aretesR', op: 'fold', input: 'aretes', kind: 'ridge' },
    { id: 'icefield', op: 'combine', mode: 'lerp', a: 'domes', b: 'aretesR', t: 0.22 },
    { id: 'glacierH', op: 'remap', input: 'icefield', inLo: 0.1, inHi: 0.9, outLo: 0.45, outHi: 1, ease: 'smoother' },

    // The desert: rolling dunes. Simplex noise stretched across the wind (turned 0.35 rad, its z
    // squeezed to 0.17), so its cells run as long ridges about 180 m apart (12000 m / 67 cells),
    // folded to a ridge so each has a crest and a wide trough, its crest lines bent 140 m by a slow
    // warp; 22 m high, on a floor 45 m up lifted up to 60 m more by a broad swell.
    { id: 'bendX', op: 'noise', kind: 'value', freq: 30, seed: 71 },
    { id: 'bendXs', op: 'remap', input: 'bendX', inLo: 0, inHi: 1, outLo: -1, outHi: 1, ease: 'smooth' },
    { id: 'bendZ', op: 'noise', kind: 'value', freq: 30, seed: 72 },
    { id: 'bendZs', op: 'remap', input: 'bendZ', inLo: 0, inHi: 1, outLo: -1, outHi: 1, ease: 'smooth' },
    { id: 'ripple', op: 'noise', kind: 'simplex', freq: 67, seed: 73, rotate: 0.35, stretch: [1, 0.17] },
    { id: 'rippleW', op: 'warp', input: 'ripple', x: 'bendXs', z: 'bendZs', amount: 140 },
    { id: 'ridges', op: 'fold', input: 'rippleW', kind: 'ridge' },
    { id: 'dunes', op: 'scale', input: 'ridges', by: 0.022 },
    { id: 'swell', op: 'noise', kind: 'value', freq: 12, seed: 74 },
    { id: 'floor', op: 'remap', input: 'swell', inLo: 0, inHi: 1, outLo: 0.045, outHi: 0.105, ease: 'smooth' },
    { id: 'desertH', op: 'combine', mode: 'add', a: 'dunes', b: 'floor' },

    // Where each stands.
    { id: 'meadowS', op: 'noise', kind: 'value', freq: 5, seed: 101 },
    { id: 'cragsN', op: 'noise', kind: 'value', freq: 5, seed: 102 },
    { id: 'glacierN', op: 'noise', kind: 'value', freq: 4, seed: 103 },
    { id: 'desertN', op: 'noise', kind: 'value', freq: 4, seed: 104 },
    { id: 'cragsS', op: 'clearing', input: 'cragsN', flat: 500, floor: 0 },
    { id: 'glacierS', op: 'clearing', input: 'glacierN', flat: 700, floor: 0 },
    { id: 'desertS', op: 'clearing', input: 'desertN', flat: 600, floor: 0 },
    {
      id: 'ground', op: 'biomes', sharp: 7, list: [
        { name: 'meadow', strength: 'meadowS', height: 'meadowH' },
        { name: 'crags', strength: 'cragsS', height: 'cragsH' },
        { name: 'glacier', strength: 'glacierS', height: 'glacierH' },
        { name: 'desert', strength: 'desertS', height: 'desertH' },
      ],
    },
  ],
}

const analysis = {
  slopeStep: 3, curveStep: 10, positionRadius: 50, occlusionRadius: 100, occlusionSteps: 6,
  cliffProbe: 40, cliffSlope: 0.6, cliffDrop: 40, flatAngle: 0.03, records: 50000,
}

// The road has no colour of its own: the `road` ground layer lays gravel where it is painted.
const surfaces = {
  road: { cover: 0, grip: 1, drag: 0.02, mark: 0.3 },
}

// The road's path, along the valley floor east of the tarn, under the start.
const ROAD = [[-950, 620], [-900, 610], [-600, 690], [-300, 640], [0, 560], [300, 520], [650, 590], [1000, 690], [1300, 720]]

// Three layers of 900 m along it, 3 m a pixel: a layer works out the ground under every pixel of its
// square the first time it is read, so three narrow squares cost a third of one square over the road's
// whole length. Each holds the whole path, and paints the part of it that crosses its square.
const strokes = [
  { verb: 'bench', radius: 9, hardness: 0.45, strength: 0, level: 0, surface: '', path: ROAD },
  { verb: 'surface', radius: 4.5, hardness: 0.7, strength: 0, level: 0, surface: 'road', path: ROAD },
]
const layers = [-700, 200, 1100].map(x => ({ at: [x, 620], size: 900, px: 300, strokes }))

// A warp of three octaves: a slow one, as wide as a few repeats, which hides the repeat; a middle one;
// and a small fast one, kept under amp × freq of about 0.1 so it bends the texture without smearing it.
const octave = (freq, amp, rotate, stretch = [1, 1, 1]) => ({ freq, amp, stretch, rotate })
const warp = (slow, turn = 0) => [octave(0.005, slow, turn), octave(0.035, slow / 10, turn + 0.7), octave(0.18, 0.5, turn + 1.9)]

// The ground layers every tier lays, in order, each over the ones before it, drawn with maps `px`
// pixels square, which `yarn bake demo_terrain3d` cuts from the cc0-textures sets `cc0-textures.json`
// names: a layer's map is `<set>-color-<px>` and its normal `<set>-normal-<px>`.
//   meadow       the base: the valley's pasture, everywhere nothing else is
//   shore        gravel on the lake beds and the shores, the ground within a metre of the waterline
//   sand         the desert's stony ground, wherever its biome is
//   mud          a cracked mud pan on the desert's low, flat ground between the dunes
//   scree        grey broken rock over the crags' biome
//   rock         bare rock on the steep ground of every biome but the desert's
//   sandstone    banded sandstone on the desert's steep ground
//   glacier      snow over the glacier's biome, shed off its steep faces
//   snow         high snow on any biome, shed off steep faces
//   road         gravel where the road is painted
const ground = px => ({
  compose: 'stack',
  layers: [
    { name: 'meadow', map: `meadow-color-${px}`, normal: `meadow-normal-${px}`, scale: 40, warp: warp(30) },
    { name: 'shore', map: `gravel-color-${px}`, normal: `gravel-normal-${px}`, scale: 30, where: [{ q: 'height', lo: 2.5, hi: -0.5 }],
      noise: { freq: 0.08, amp: 0.9 }, edge: 0.35, warp: warp(12, 1.1) },
    { name: 'sand', map: `dry-ground-color-${px}`, normal: `dry-ground-normal-${px}`, scale: 40, where: [{ q: 'biome:desert', lo: 0.35, hi: 0.65 }],
      noise: { freq: 0.02, amp: 0.45 }, edge: 0.3, warp: warp(30, 0.3) },
    { name: 'mud', map: `cracked-mud-color-${px}`, normal: `cracked-mud-normal-${px}`, scale: 35,
      where: [{ q: 'biome:desert', lo: 0.5, hi: 0.8 }, { q: 'height', lo: 75, hi: 55 }, { q: 'slope', lo: 0.12, hi: 0.05 }],
      noise: { freq: 0.06, amp: 0.9 }, edge: 0.35, warp: warp(12, 0.5) },
    { name: 'scree', map: `rock-color-${px}`, normal: `rock-normal-${px}`, scale: 40, strength: 1.1, tri: true, sharp: 12,
      where: [{ q: 'biome:crags', lo: 0.35, hi: 0.8 }], noise: { freq: 0.03, amp: 0.5 }, edge: 0.3, warp: warp(20, 0.9) },
    { name: 'rock', map: `rock-color-${px}`, normal: `rock-normal-${px}`, scale: 35, strength: 1.2, tri: true, sharp: 12,
      where: [{ q: 'slope', lo: 0.3, hi: 0.45 }, { q: 'biome:desert', lo: 0.6, hi: 0.3 }], noise: { freq: 0.12, amp: 0.8 }, edge: 0.35,
      warp: [octave(0.006, 18, 0), octave(0.04, 1.5, 0.4, [1, 3, 1]), octave(0.2, 0.6, 1.3)] },
    { name: 'sandstone', map: `desert-rock-color-${px}`, normal: `desert-rock-normal-${px}`, scale: 45, strength: 1.2, tri: true, sharp: 12,
      where: [{ q: 'slope', lo: 0.25, hi: 0.4 }, { q: 'biome:desert', lo: 0.3, hi: 0.6 }], noise: { freq: 0.12, amp: 0.8 }, edge: 0.35,
      warp: [octave(0.006, 18, 0.2), octave(0.04, 1.5, 0.6, [1, 3, 1]), octave(0.2, 0.6, 1.5)] },
    { name: 'glacier', map: `snow-color-${px}`, normal: `snow-normal-${px}`, scale: 35, strength: 0.8, tri: true, sharp: 12,
      where: [{ q: 'biome:glacier', lo: 0.3, hi: 0.7 }, { q: 'slope', lo: 0.55, hi: 0.3 }], noise: { freq: 0.08, amp: 0.8 }, edge: 0.35, warp: warp(20, 2.1) },
    { name: 'snow', map: `snow-color-${px}`, normal: `snow-normal-${px}`, scale: 35, strength: 0.8, tri: true, sharp: 12,
      where: [{ q: 'relief', lo: 0.6, hi: 0.78 }, { q: 'slope', lo: 0.5, hi: 0.25 }], noise: { freq: 0.08, amp: 0.8 }, edge: 0.35, warp: warp(20, 2.5) },
    { name: 'road', map: `gravel-color-${px}`, normal: `gravel-normal-${px}`, scale: 30, where: [{ q: 'surface:road', lo: 0.2, hi: 0.8 }], edge: 0.2 },
  ],
})

const looks = {
  // UHD: 2048² maps, every layer's height blend and its far read.
  uhd: { ...ground(2048), heightBlend: { amount: 2, depth: 0.1 }, far: { amount: 0.7, scale: 7.3 }, roughness: 0.9 },
  // HD: 1024² maps, the height blend and the far read.
  hd: { ...ground(1024), heightBlend: { amount: 2, depth: 0.1 }, far: { amount: 0.7, scale: 7.3 }, roughness: 0.9 },
  // lofi: 512² maps, and neither the height blend nor the far read.
  lofi: { ...ground(512), roughness: 0.9 },
}

for (const [tier, look] of Object.entries(looks)) {
  const field = { program, analysis, ground: look, surfaces, layers }
  writeFileSync(join(here, `${tier}.json`), `${JSON.stringify(field, null, 2)}\n`)
  console.log(`${tier}.json`)
}
