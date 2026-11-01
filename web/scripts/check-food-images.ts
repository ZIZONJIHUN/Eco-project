// 모든 메뉴에 그림이 붙는지, 접시(기본) 그림으로 떨어지는 메뉴가 몇 개인지 본다. 사용: npx tsx scripts/check-food-images.ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import recipes from '../src/data/recipes.json'
import { FALLBACK_IMAGE, foodImage } from '../src/lib/food-image'

const names = Object.keys(recipes)
const bySlug = new Map<string, string[]>()
for (const n of names) {
  const s = foodImage(n)
  if (!bySlug.has(s)) bySlug.set(s, [])
  bySlug.get(s)!.push(n)
}
const missing = [...bySlug.keys()].filter((s) => !existsSync(join(import.meta.dirname, '..', 'public', 'img', 'fluent', `${s}.webp`)))
console.log(`메뉴 ${names.length}개 → 그림 ${bySlug.size}종 · 파일 없음: ${missing.join(', ') || '없음'}`)
console.log(`기본 접시 그림: ${bySlug.get(FALLBACK_IMAGE)?.length ?? 0}개`, (bySlug.get(FALLBACK_IMAGE) ?? []).join(', '))
if (process.argv.includes('--all')) for (const [s, ns] of bySlug) console.log(s.padEnd(24), ns.slice(0, 8).join(', '))
if (missing.length) process.exit(1)
