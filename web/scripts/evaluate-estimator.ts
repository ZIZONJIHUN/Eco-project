// 재료표에 없는 메뉴를 규칙으로 추정할 때 얼마나 맞는지 잰다.
// 재료표의 메뉴를 하나씩 빼고(leave-one-out) 나머지만으로 추정한 값을 원래 값과 비교한다.
// 사용: npm run eval-estimator
import recipes from '../src/data/recipes.json'
import snapshot from '../src/data/meals-snapshot.json'
import { createEstimator, describe, toRecipe, type RecipeTable } from '../src/lib/carbon/estimate'
import { parseDishes } from '../src/lib/carbon/parse'

const table = recipes as unknown as RecipeTable
const names = Object.keys(table)

// 급식에 자주 나온 메뉴일수록 중요하므로 출현 횟수로 가중한다
const freq = new Map<string, number>()
for (const row of snapshot as { dish: string }[]) for (const [n] of parseDishes(row.dish)) freq.set(n, (freq.get(n) ?? 0) + 1)

const grade = (kg: number) => (kg < 0.3 ? 0 : kg < 1 ? 1 : 2)

function run(threshold: number) {
  const est = createEstimator(table, { threshold })
  let w = 0
  let absErr = 0
  let gradeHit = 0
  let within = 0
  const bySrc: Record<string, number> = {}
  const worst: [string, number, number, string, string?][] = []
  for (const name of names) {
    const weight = freq.get(name) ?? 1
    const truth = describe({ recipe: toRecipe(table[name]), src: 'table' }).kg
    const e = est.estimate(name, { exclude: name })
    const got = describe(e).kg
    const err = Math.abs(got - truth)
    w += weight
    absErr += err * weight
    if (grade(got) === grade(truth)) gradeHit += weight
    if (err <= Math.max(0.15, truth * 0.3)) within += weight
    bySrc[e.src] = (bySrc[e.src] ?? 0) + weight
    worst.push([name, truth, got, e.src, e.base])
  }
  worst.sort((a, b) => Math.abs(b[2] - b[1]) - Math.abs(a[2] - a[1]))
  return { threshold, mae: absErr / w, gradeHit: gradeHit / w, within: within / w, bySrc, worst: worst.slice(0, 8) }
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
for (const t of [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 1.01]) {
  const r = run(t)
  const src = Object.entries(r.bySrc).map(([k, v]) => `${k} ${v}`).join(', ')
  console.log(`기준 ${t.toFixed(2)} | 평균 오차 ${r.mae.toFixed(3)}kg | 등급 일치 ${pct(r.gradeHit)} | 오차 30%(최소 0.15kg) 안 ${pct(r.within)} | ${src}`)
}
const best = run(0.55)
console.log('\n오차가 큰 메뉴 (기준 0.55):')
for (const [name, truth, got, src, base] of best.worst) console.log(`  ${name}: 실제 ${truth.toFixed(2)} → 추정 ${got.toFixed(2)} (${src}${base ? ' · ' + base : ''})`)
