// 먹은 양 기록: 날짜별·메뉴별로 남긴 비율(0·25·50·100%)을 이 기기에 저장한다.
// "줄인 탄소" = (기준 학생이 남기는 양 - 내가 남긴 양) × 메뉴 탄소
// 기준 학생은 한 끼의 25%를 남긴다고 가정한다 (화면에 가정임을 밝힌다).
import { addDays, diffDays, mondayOf, monthOf } from './date'
import type { Day, MenuInfo } from './types'

export type WasteLevel = 0 | 25 | 50 | 100
export type DayLog = Record<string, WasteLevel>
export type MealLog = Record<string, DayLog>

export const BASELINE_WASTE = 0.25
/** 지난 급식은 며칠 전까지 기록할 수 있는지 */
export const LOG_WINDOW_DAYS = 7

export const WASTE_LEVELS: { value: WasteLevel; label: string; short: string }[] = [
  { value: 0, label: '다 먹음', short: '다 먹음' },
  { value: 25, label: '조금 남김', short: '조금' },
  { value: 50, label: '반 남김', short: '반' },
  { value: 100, label: '안 먹음', short: '안 먹음' },
]

export interface DayResult {
  date: string
  total: number
  wasted: number
  saved: number
  /** 메뉴 탄소 기준으로 가중한 남긴 비율 0~1 */
  wasteRate: number
  cleanPlate: boolean
}

export function dayResult(day: Day, menus: Record<string, MenuInfo>, entry: DayLog): DayResult {
  let total = 0
  let wasted = 0
  for (const [name] of day.m) {
    const kg = menus[name]?.kg ?? 0
    const w = (entry[name] ?? 0) / 100
    total += kg
    wasted += kg * w
  }
  const baseline = total * BASELINE_WASTE
  return {
    date: day.d,
    total,
    wasted,
    saved: baseline - wasted,
    wasteRate: total ? wasted / total : 0,
    cleanPlate: day.m.every(([n]) => (entry[n] ?? 0) === 0),
  }
}

export type Period = 'week' | 'month' | 'all'
export const PERIOD_LABEL: Record<Period, string> = { week: '이번 주', month: '이번 달', all: '전체' }

export function inPeriod(date: string, today: string, period: Period): boolean {
  if (date > today) return false
  if (period === 'week') return date >= mondayOf(today)
  if (period === 'month') return monthOf(date) === monthOf(today)
  return true
}

export interface Summary {
  days: number
  saved: number
  wasted: number
  total: number
  cleanDays: number
  wasteRate: number
  results: DayResult[]
}

export function summarize(log: MealLog, byDay: Map<string, Day>, menus: Record<string, MenuInfo>, today: string, period: Period): Summary {
  const results: DayResult[] = []
  for (const [date, entry] of Object.entries(log)) {
    const day = byDay.get(date)
    if (!day || !inPeriod(date, today, period)) continue
    results.push(dayResult(day, menus, entry))
  }
  results.sort((a, b) => a.date.localeCompare(b.date))
  const saved = results.reduce((a, r) => a + r.saved, 0)
  const wasted = results.reduce((a, r) => a + r.wasted, 0)
  const total = results.reduce((a, r) => a + r.total, 0)
  return { days: results.length, saved, wasted, total, cleanDays: results.filter((r) => r.cleanPlate).length, wasteRate: total ? wasted / total : 0, results }
}

/** 오늘(또는 가장 최근 급식날)부터 거꾸로 이어서 기록한 급식날 수 */
export function streak(log: MealLog, mealDays: string[], today: string): number {
  const past = mealDays.filter((d) => d <= today).reverse()
  let n = 0
  for (const [i, d] of past.entries()) {
    if (log[d]) n++
    else if (i === 0 && d === today) continue // 오늘은 아직 안 했어도 이어진 것으로 본다
    else break
  }
  return n
}

export const canLog = (date: string, today: string) => date <= today && diffDays(date, today) <= LOG_WINDOW_DAYS
export const loggableSince = (today: string) => addDays(today, -LOG_WINDOW_DAYS)
