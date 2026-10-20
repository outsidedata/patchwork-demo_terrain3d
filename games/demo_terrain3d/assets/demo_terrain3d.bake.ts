// demo_terrain3d's bake, `yarn bake demo_terrain3d` (core's `scripts/bake.ts`): every glb the scene's
// catalogue names, packed by gltfpack (meshopt geometry, WebP textures) and written where the catalogue
// reads it.
//   firs.glb     grown by the library's `trees/trees.py` (Blender's Sapling Tree Gen) from
//                `firs.trees.json`: scatter3d's trees pack, the tall, mid and small spruces at their four
//                levels of detail
//   woods.glb    grown the same way from `woods.trees.json`: eight trees of the library's species (a
//                douglas fir, a pine, a birch, an aspen, a maple, a japanese maple, a weeping willow and
//                a bottlebrush) at four levels of detail, named for a scatter3d pack as firs.glb is
//   clumps.glb   made by the library's `foliage/foliage.py` from `clumps.foliage.json`: scatter3d's
//                clumps pack, the nine clumps of the library's `props/lod-grass` (grasses, dry grasses,
//                flowers and reeds) at their two levels of detail
// The ground's maps, `ground/<name>-<map>-<size>.webp`, are cut by the bake itself from the cc0-textures
// sets `cc0-textures.json` names, before this runs, and committed with the game.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Tools } from '#scripts/bake.ts'

const here = import.meta.dirname

export default async ({ blender, pack, scratch, library, texture }: Tools) => {
  const { leafSets } = await import(pathToFileURL(path.join(library, 'trees', 'trees.mjs')).href)
  // a spec's leaf sets downloaded into the library first, then the trees grown from it
  const trees = (spec: string) => async (raw: string) => {
    for (const zip of leafSets(path.join(here, spec)) as string[]) await texture(zip)
    return blender(['--factory-startup', '--python', path.join(library, 'trees', 'trees.py'), '--', path.join(here, spec), raw])
  }
  const make: Record<string, (raw: string) => Promise<unknown>> = {
    firs: trees('firs.trees.json'),
    woods: trees('woods.trees.json'),
    clumps: raw => blender(['--factory-startup', '--python-exit-code', '1', '--python', path.join(library, 'foliage', 'foliage.py'), '--', path.join(here, 'clumps.foliage.json'), raw]),
  }
  await Promise.all(Object.entries(make).map(async ([name, build]) => {
    const raw = scratch(`${name}.glb`)
    await build(raw)
    const out = path.join(here, `${name}.glb`)
    await pack(raw, out)
    console.log('wrote', path.relative(path.join(here, '..', '..', '..'), out))
  }))
}
