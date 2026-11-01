import { GROUP_LABEL } from './carbon/foods'
import { normalizeName } from './carbon/estimate'
import { monthOf } from './date'
import type { Day, MenuInfo } from './types'

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function extremes(days: Day[]): { high: Day | null; low: Day | null } {
  if (!days.length) return { high: null, low: null }
  let high = days[0]
  let low = days[0]
  for (const d of days) {
    if (d.kg > high.kg) high = d
    if (d.kg < low.kg) low = d
  }
  return { high, low }
}

/** 하루 중 탄소가 가장 많은 메뉴 */
export function topMenuOf(day: Day, menus: Record<string, MenuInfo>): { name: string; kg: number; share: number } {
  let name = day.m[0]?.[0] ?? ''
  let kg = 0
  for (const [n] of day.m) {
    const k = menus[n]?.kg ?? 0
    if (k > kg) {
      kg = k
      name = n
    }
  }
  return { name, kg, share: day.kg ? kg / day.kg : 0 }
}

export interface MonthStat {
  month: string
  avg: number
  n: number
}
export function monthly(days: Day[]): MonthStat[] {
  const map = new Map<string, number[]>()
  for (const d of days) {
    const k = monthOf(d.d)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(d.kg)
  }
  return [...map.entries()].map(([month, ks]) => ({ month, avg: mean(ks), n: ks.length }))
}

/** 탄소가 어디서 나오는지: 식품 분류별 비율 */
export function groupShares(days: Day[], menus: Record<string, MenuInfo>): { key: string; label: string; kg: number; share: number }[] {
  const sum: Record<string, number> = {}
  let total = 0
  for (const d of days)
    for (const [n] of d.m)
      for (const [g, kg] of Object.entries(menus[n]?.groups ?? {})) {
        sum[g] = (sum[g] ?? 0) + (kg ?? 0)
        total += kg ?? 0
      }
  return Object.entries(sum)
    .map(([key, kg]) => ({ key, label: GROUP_LABEL[key as keyof typeof GROUP_LABEL] ?? key, kg, share: total ? kg / total : 0 }))
    .sort((a, b) => b.kg - a.kg)
}

export function topMenus(days: Day[], menus: Record<string, MenuInfo>, n = 10): { name: string; kg: number; count: number; last: string }[] {
  const seen = new Map<string, { count: number; last: string }>()
  for (const d of days)
    for (const [name] of d.m) {
      const s = seen.get(name) ?? { count: 0, last: d.d }
      s.count++
      s.last = d.d
      seen.set(name, s)
    }
  return [...seen.entries()]
    .map(([name, s]) => ({ name, kg: menus[name]?.kg ?? 0, ...s }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, n)
}

/** 고기·해산물을 두부로 바꾸면 줄어드는 비율 (가상 계산) */
export function swapPotential(days: Day[], menus: Record<string, MenuInfo>): number {
  let total = 0
  let saved = 0
  for (const d of days) {
    total += d.kg
    for (const [n] of d.m) {
      const m = menus[n]
      if (m?.alt) saved += m.kg - m.alt.kg
    }
  }
  return total ? saved / total : 0
}

/** 재료표로 다시 계산한 열량 vs 나이스 공식 열량 */
export function kcalCheck(days: Day[]): { estimated: number; official: number; errorPct: number; n: number } {
  const both = days.filter((d) => d.kcal)
  return {
    estimated: mean(both.map((d) => d.kcalE)),
    official: mean(both.map((d) => d.kcal!)),
    errorPct: mean(both.map((d) => (Math.abs(d.kcalE - d.kcal!) / d.kcal!) * 100)),
    n: both.length,
  }
}

export interface SearchHit {
  name: string
  kg: number
  dates: string[]
}
/** 메뉴 이름으로 찾기. 띄어쓰기와 괄호 설명은 무시한다 */
export function searchMenus(query: string, days: Day[], menus: Record<string, MenuInfo>): SearchHit[] {
  const q = normalizeName(query)
  if (!q) return []
  const hits = new Map<string, string[]>()
  for (const d of days)
    for (const [name] of d.m) {
      if (!normalizeName(name).includes(q) && !name.includes(query.trim())) continue
      if (!hits.has(name)) hits.set(name, [])
      hits.get(name)!.push(d.d)
    }
  return [...hits.entries()]
    .map(([name, dates]) => ({ name, kg: menus[name]?.kg ?? 0, dates }))
    .sort((a, b) => b.dates.length - a.dates.length)
}

/** 자주 나온 메뉴 (검색 빈 상태의 추천용). 밥·김치·우유처럼 매일 나오는 건 뺀다 */
export function popularMenus(days: Day[], n = 8): string[] {
  const count = new Map<string, number>()
  for (const d of days) for (const [name] of d.m) count.set(name, (count.get(name) ?? 0) + 1)
  return [...count.entries()]
    .filter(([name]) => !/밥$|김치|깍두기|우유|요구르트/.test(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name)
}
