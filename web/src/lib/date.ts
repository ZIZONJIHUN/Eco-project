// 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다. 계산은 UTC 자정 기준이라 시간대에 흔들리지 않는다.

export const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 지금 한국 날짜 */
export function kstToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export const toDay = (dt: Date): string => dt.toISOString().slice(0, 10)
export const addDays = (s: string, n: number): string => toDay(new Date(parseDay(s).getTime() + n * 86_400_000))
export const weekdayOf = (s: string): number => parseDay(s).getUTCDay()
export const mondayOf = (s: string): string => addDays(s, -((weekdayOf(s) + 6) % 7))
/** 월~금 다섯 날 */
export const schoolWeek = (monday: string): string[] => [0, 1, 2, 3, 4].map((i) => addDays(monday, i))

export const toYmd = (s: string): string => s.replaceAll('-', '')
export const fromYmd = (y: string): string => `${y.slice(0, 4)}-${y.slice(4, 6)}-${y.slice(6, 8)}`

export const monthOf = (s: string): string => s.slice(0, 7)
export function endOfMonth(s: string): string {
  const d = parseDay(s)
  return toDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

const md = (s: string) => {
  const d = parseDay(s)
  return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: WEEKDAY[d.getUTCDay()] }
}
/** 11월 2일 월요일 */
export function formatLong(s: string): string {
  const x = md(s)
  return `${x.m}월 ${x.d}일 ${x.w}요일`
}
/** 11월 2일 (월) */
export function formatMedium(s: string): string {
  const x = md(s)
  return `${x.m}월 ${x.d}일 (${x.w})`
}
/** 11. 2 */
export function formatShort(s: string): string {
  const x = md(s)
  return `${x.m}. ${x.d}`
}
export const dayOfMonth = (s: string): number => parseDay(s).getUTCDate()
export const weekdayLabel = (s: string): string => WEEKDAY[weekdayOf(s)]

/** 두 날짜 사이 일수 (b - a) */
export const diffDays = (a: string, b: string): number => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)

/** "오늘", "내일", "어제", "3일 뒤" 처럼 오늘 기준으로 */
export function relativeLabel(day: string, today: string): string | null {
  const n = diffDays(today, day)
  if (n === 0) return '오늘'
  if (n === 1) return '내일'
  if (n === -1) return '어제'
  if (n > 1 && n < 7) return `${n}일 뒤`
  if (n < -1 && n > -7) return `${-n}일 전`
  return null
}
