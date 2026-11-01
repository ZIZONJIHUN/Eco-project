// 순위 화면을 보여 주기 위한 예시 학생 (가상 데이터). 실제 학생 기록이 아니다.
// 이름과 날짜로 정해지는 난수를 써서, 같은 데이터에서는 늘 같은 결과가 나온다.
import { dayResult, inPeriod, type DayLog, type Period, type WasteLevel } from './meal-log'
import type { Day, MenuInfo } from './types'

export interface DemoStudent {
  id: string
  name: string
  room: string
  /** 평소 남기는 정도 0~1 */
  habit: number
  /** 급식날 기록할 확률 */
  diligence: number
  hue: number
}

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: 'd1', name: '김서연', room: '1-2', habit: 0.04, diligence: 0.95, hue: 152 },
  { id: 'd2', name: '박도윤', room: '1-5', habit: 0.1, diligence: 0.9, hue: 205 },
  { id: 'd3', name: '이하준', room: '1-1', habit: 0.16, diligence: 0.85, hue: 28 },
  { id: 'd4', name: '최지우', room: '1-3', habit: 0.08, diligence: 0.7, hue: 330 },
  { id: 'd5', name: '정민준', room: '1-4', habit: 0.22, diligence: 0.88, hue: 262 },
  { id: 'd6', name: '강예린', room: '1-2', habit: 0.13, diligence: 0.6, hue: 48 },
  { id: 'd7', name: '윤시우', room: '1-6', habit: 0.3, diligence: 0.92, hue: 186 },
  { id: 'd8', name: '한유나', room: '1-1', habit: 0.06, diligence: 0.5, hue: 12 },
  { id: 'd9', name: '조은호', room: '1-5', habit: 0.36, diligence: 0.75, hue: 104 },
  { id: 'd10', name: '임채원', room: '1-3', habit: 0.19, diligence: 0.66, hue: 286 },
  { id: 'd11', name: '오지환', room: '1-4', habit: 0.42, diligence: 0.8, hue: 222 },
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function rand(seed: string): number {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function levelFor(habit: number, r: number): WasteLevel {
  // 평소 습관에 따라 다 먹음·조금·반·안 먹음의 확률이 바뀐다
  const p0 = Math.max(0.05, 1 - habit * 2.2)
  const p25 = Math.min(0.6, habit * 1.3)
  const p50 = habit * 0.7
  const sum = p0 + p25 + p50 + habit * 0.25
  const x = r * sum
  if (x < p0) return 0
  if (x < p0 + p25) return 25
  if (x < p0 + p25 + p50) return 50
  return 100
}

export function demoLog(s: DemoStudent, days: Day[]): Record<string, DayLog> {
  const out: Record<string, DayLog> = {}
  for (const day of days) {
    if (rand(`${s.id}:${day.d}:log`) > s.diligence) continue
    const entry: DayLog = {}
    for (const [name] of day.m) entry[name] = levelFor(s.habit, rand(`${s.id}:${day.d}:${name}`))
    out[day.d] = entry
  }
  return out
}

export interface Standing {
  id: string
  name: string
  room: string
  hue: number
  me: boolean
  saved: number
  wasted: number
  days: number
  cleanDays: number
}

export function standings(
  myLog: Record<string, DayLog>,
  days: Day[],
  menus: Record<string, MenuInfo>,
  today: string,
  period: Period,
): Standing[] {
  const pastDays = days.filter((d) => inPeriod(d.d, today, period))
  const score = (log: Record<string, DayLog>) => {
    let saved = 0
    let wasted = 0
    let n = 0
    let clean = 0
    for (const day of pastDays) {
      const e = log[day.d]
      if (!e) continue
      const r = dayResult(day, menus, e)
      saved += r.saved
      wasted += r.wasted
      n++
      if (r.cleanPlate) clean++
    }
    return { saved, wasted, days: n, cleanDays: clean }
  }
  const rows: Standing[] = DEMO_STUDENTS.map((s) => ({ id: s.id, name: s.name, room: s.room, hue: s.hue, me: false, ...score(demoLog(s, pastDays)) }))
  rows.push({ id: 'me', name: '나', room: '', hue: 140, me: true, ...score(myLog) })
  return rows.sort((a, b) => b.saved - a.saved || b.days - a.days)
}
