import type { Dataset } from './types'

export type Grade = 'low' | 'mid' | 'high'
/** 탄소량 색 5단계: 1 매우 낮음 · 2 낮음 · 3 보통 · 4 높음 · 5 매우 높음 */
export type Tone = 1 | 2 | 3 | 4 | 5

export const GRADE_LABEL: Record<Grade, string> = { low: '낮음', mid: '보통', high: '높음' }
export const TONE_LABEL: Record<Tone, string> = { 1: '매우 낮음', 2: '낮음', 3: '보통', 4: '높음', 5: '매우 높음' }

/** 하루 등급: 학교 급식 분포 기준 (dataset.dayBands) */
export const dayGrade = (kg: number, bands: Dataset['dayBands']): Grade =>
  kg < bands.low ? 'low' : kg >= bands.high ? 'high' : 'mid'

/** 메뉴 하나 등급: 0.3kg 미만 낮음 · 1kg 이상 높음 */
export const MENU_BANDS = { low: 0.3, high: 1 }
export const menuGrade = (kg: number): Grade => (kg < MENU_BANDS.low ? 'low' : kg >= MENU_BANDS.high ? 'high' : 'mid')

function toneOf(kg: number, cuts: [number, number, number, number]): Tone {
  if (kg < cuts[0]) return 1
  if (kg < cuts[1]) return 2
  if (kg < cuts[2]) return 3
  if (kg < cuts[3]) return 4
  return 5
}
/** 하루 탄소 색: 낮음·높음 경계 바깥을 한 단계씩 더 나눈다 */
export const dayCuts = (b: Dataset['dayBands']): [number, number, number, number] => [
  Math.round(b.low * 0.8 * 10) / 10,
  b.low,
  b.high,
  Math.round(b.high * 1.35 * 10) / 10,
]
export const dayTone = (kg: number, b: Dataset['dayBands']): Tone => toneOf(kg, dayCuts(b))
export const MENU_CUTS: [number, number, number, number] = [0.1, 0.3, 1, 2]
export const menuTone = (kg: number): Tone => toneOf(kg, MENU_CUTS)

export const TONE_TEXT: Record<Tone, string> = { 1: 'text-t1', 2: 'text-t2', 3: 'text-t3', 4: 'text-t4', 5: 'text-t5' }
export const TONE_SOFT: Record<Tone, string> = { 1: 'bg-t1-soft', 2: 'bg-t2-soft', 3: 'bg-t3-soft', 4: 'bg-t4-soft', 5: 'bg-t5-soft' }
export const TONE_BAR: Record<Tone, string> = { 1: 'bg-t1-bar', 2: 'bg-t2-bar', 3: 'bg-t3-bar', 4: 'bg-t4-bar', 5: 'bg-t5-bar' }
export const TONE_VAR: Record<Tone, string> = { 1: 'var(--t1)', 2: 'var(--t2)', 3: 'var(--t3)', 4: 'var(--t4)', 5: 'var(--t5)' }
export const TONE_SOFT_VAR: Record<Tone, string> = { 1: 'var(--t1-soft)', 2: 'var(--t2-soft)', 3: 'var(--t3-soft)', 4: 'var(--t4-soft)', 5: 'var(--t5-soft)' }

export const GRADE_TONE: Record<Grade, Tone> = { low: 1, mid: 3, high: 4 }
export const GRADE_TEXT: Record<Grade, string> = { low: TONE_TEXT[1], mid: TONE_TEXT[3], high: TONE_TEXT[4] }
export const GRADE_SOFT: Record<Grade, string> = { low: TONE_SOFT[1], mid: TONE_SOFT[3], high: TONE_SOFT[4] }
export const GRADE_BAR: Record<Grade, string> = { low: TONE_BAR[1], mid: TONE_BAR[3], high: TONE_BAR[4] }

/** 승용차 1km 를 달릴 때 나오는 탄소 (대략값) */
export const KG_PER_CAR_KM = 0.2
/** 1학년 학생 수 (대략값, 남김 계산용) */
export const GRADE1_STUDENTS = 310

export function formatKg(kg: number, digits = 2): string {
  return kg.toFixed(digits)
}

/** 평균과 비교: 18% 낮음 / 비슷 / 30% 높음 */
export function compareToAverage(kg: number, avg: number): { pct: number; dir: 'down' | 'same' | 'up'; text: string; tone: Tone } {
  const pct = Math.round(((kg - avg) / avg) * 100)
  if (Math.abs(pct) < 5) return { pct, dir: 'same', text: '학교 평균과 비슷해요', tone: 3 }
  return pct < 0
    ? { pct: -pct, dir: 'down', text: '학교 평균보다 낮아요', tone: pct <= -25 ? 1 : 2 }
    : { pct, dir: 'up', text: '학교 평균보다 높아요', tone: pct >= 35 ? 5 : 4 }
}
