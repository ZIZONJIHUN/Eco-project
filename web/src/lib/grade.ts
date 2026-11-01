import type { Dataset } from './types'

export type Grade = 'low' | 'mid' | 'high'

export const GRADE_LABEL: Record<Grade, string> = { low: '낮음', mid: '보통', high: '높음' }

/** 하루 등급: 학교 급식 분포 기준 (dataset.dayBands) */
export const dayGrade = (kg: number, bands: Dataset['dayBands']): Grade =>
  kg < bands.low ? 'low' : kg >= bands.high ? 'high' : 'mid'

/** 메뉴 하나 등급: 0.3kg 미만 낮음 · 1kg 이상 높음 (기존 앱과 같은 기준) */
export const MENU_BANDS = { low: 0.3, high: 1 }
export const menuGrade = (kg: number): Grade => (kg < MENU_BANDS.low ? 'low' : kg >= MENU_BANDS.high ? 'high' : 'mid')

export const GRADE_TEXT: Record<Grade, string> = { low: 'text-low', mid: 'text-mid', high: 'text-high' }
export const GRADE_SOFT: Record<Grade, string> = { low: 'bg-low-soft', mid: 'bg-mid-soft', high: 'bg-high-soft' }
export const GRADE_BAR: Record<Grade, string> = { low: 'bg-low-bar', mid: 'bg-mid-bar', high: 'bg-high-bar' }

/** 승용차 1km 를 달릴 때 나오는 탄소 (대략값) */
export const KG_PER_CAR_KM = 0.2
/** 1학년 학생 수 (대략값, 남김 계산용) */
export const GRADE1_STUDENTS = 310

export function formatKg(kg: number, digits = 2): string {
  return kg.toFixed(digits)
}

/** 평균과 비교한 문장: "학교 평균보다 18% 낮아요" */
export function compareToAverage(kg: number, avg: number): { pct: number; text: string; tone: Grade } {
  const pct = Math.round(((kg - avg) / avg) * 100)
  if (Math.abs(pct) < 5) return { pct, text: '학교 평균과 비슷해요', tone: 'mid' }
  return pct < 0
    ? { pct, text: `학교 평균보다 ${-pct}% 낮아요`, tone: 'low' }
    : { pct, text: `학교 평균보다 ${pct}% 높아요`, tone: 'high' }
}
