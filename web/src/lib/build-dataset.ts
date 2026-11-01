// 급식 원본 행 → 앱 데이터. 서버와 검증 스크립트가 함께 쓴다.
import recipes from '../data/recipes.json'
import { createEstimator, describe, type RecipeTable } from './carbon/estimate'
import { parseDishes, parseKcal, parseProtein } from './carbon/parse'
import { fromYmd } from './date'
import type { Dataset, Day, MenuInfo } from './types'

export interface RawRow {
  ymd: string
  dish: string
  cal?: string
  ntr?: string
}

const r3 = (x: number) => Math.round(x * 1000) / 1000
const r1 = (x: number) => Math.round(x * 10) / 10

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function buildDataset(rows: RawRow[], meta: Pick<Dataset, 'generatedAt' | 'generatedDay' | 'live' | 'snapshotUntil'>): Dataset {
  const estimator = createEstimator(recipes as unknown as RecipeTable)
  const menus: Record<string, MenuInfo> = {}
  const days: Day[] = []
  for (const row of [...rows].sort((a, b) => a.ymd.localeCompare(b.ymd))) {
    const dishes = parseDishes(row.dish ?? '')
    if (!dishes.length) continue
    let kg = 0
    let kcalE = 0
    for (const [name] of dishes) {
      menus[name] ??= describe(estimator.estimate(name))
      kg += menus[name].kg
      kcalE += menus[name].kcal
    }
    days.push({
      d: fromYmd(row.ymd),
      m: dishes,
      kg: r3(kg),
      kcal: parseKcal(row.cal),
      kcalE: r1(kcalE),
      prot: parseProtein(row.ntr),
    })
  }
  // 하루 등급: 이 학교 급식 분포의 하위 30% 는 낮음, 상위 30% 는 높음 (0.1kg 단위로 반올림)
  const sorted = days.map((d) => d.kg).sort((a, b) => a - b)
  const dayBands =
    sorted.length >= 20
      ? { low: r1(quantile(sorted, 0.3)), high: r1(quantile(sorted, 0.7)) }
      : { low: 2.3, high: 3.3 }
  return { ...meta, dayBands, days, menus }
}

