import 'server-only'
import type { RawRow } from '../build-dataset'
import { addDays, mondayOf, toYmd, endOfMonth } from '../date'

// 나이스 교육정보 개방 포털 급식식단정보 · 경기도교육청(J10) 효명고(7530601) 중식(2)
const BASE = 'https://open.neis.go.kr/hub/mealServiceDietInfo'
const SCHOOL = { ATPT_OFCDC_SC_CODE: 'J10', SD_SCHUL_CODE: '7530601', MMEAL_SC_CODE: '2' }
const TIMEOUT_MS = 8000
const CONCURRENCY = 3


interface NeisRow {
  MLSV_YMD: string
  DDISH_NM: string
  CAL_INFO?: string
  NTR_INFO?: string
}

async function call(from: string, to: string, pIndex: number, key: string | undefined) {
  const params = new URLSearchParams({
    Type: 'json',
    pIndex: String(pIndex),
    // 인증키가 없으면 한 번에 5건까지만 준다
    pSize: key ? '100' : '5',
    ...SCHOOL,
    MLSV_FROM_YMD: from,
    MLSV_TO_YMD: to,
  })
  if (key) params.set('KEY', key)
  const res = await Promise.race([
    // accept 헤더를 붙이면 나이스가 HTTP 500 을 돌려준다 (2026-11 확인). 헤더 없이 부른다
    fetch(`${BASE}?${params}`),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('나이스 응답 시간 초과')), TIMEOUT_MS)),
  ])
  if (!res.ok) throw new Error(`나이스 HTTP ${res.status}`)
  const body = await res.json()
  // INFO-200: 해당 기간에 식단이 없음 (방학, 아직 안 올라온 달)
  if (body?.RESULT?.CODE === 'INFO-200') return { rows: [] as RawRow[], total: 0 }
  const info = body?.mealServiceDietInfo
  if (!Array.isArray(info)) throw new Error(`나이스 오류 ${body?.RESULT?.CODE ?? '알 수 없음'}`)
  const total: number = info[0]?.head?.[0]?.list_total_count ?? 0
  const rows: RawRow[] = ((info[1]?.row ?? []) as NeisRow[]).map((r) => ({
    ymd: r.MLSV_YMD,
    dish: r.DDISH_NM,
    cal: r.CAL_INFO,
    ntr: r.NTR_INFO,
  }))
  return { rows, total }
}

async function fetchChunk(from: string, to: string, key: string | undefined): Promise<RawRow[]> {
  const first = await call(from, to, 1, key)
  const rows = [...first.rows]
  for (let page = 2; rows.length < first.total && page <= 10; page++) {
    const next = await call(from, to, page, key)
    if (!next.rows.length) break
    rows.push(...next.rows)
  }
  return rows
}

/** from~to 기간을 잘게 나눈다. 키가 없으면 월~금 한 주씩, 있으면 한 달씩 */
function chunks(from: string, to: string, withKey: boolean): [string, string][] {
  const out: [string, string][] = []
  if (withKey) {
    let start = from
    while (start <= to) {
      const end = endOfMonth(start) < to ? endOfMonth(start) : to
      out.push([toYmd(start), toYmd(end)])
      start = addDays(endOfMonth(start), 1)
    }
    return out
  }
  for (let mon = mondayOf(from); mon <= to; mon = addDays(mon, 7)) out.push([toYmd(mon), toYmd(addDays(mon, 4))])
  return out
}

export interface LiveResult {
  rows: RawRow[]
  chunks: number
  failed: number
  errors: string[]
}

export async function fetchLive(from: string, to: string): Promise<LiveResult> {
  const key = process.env.NEIS_API_KEY?.trim() || undefined
  const list = chunks(from, to, Boolean(key))
  const rows: RawRow[] = []
  const errors: string[] = []
  let failed = 0
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map(([a, b]) => fetchChunk(a, b, key)))
    for (const s of settled) {
      if (s.status === 'fulfilled') rows.push(...s.value)
      else {
        failed++
        errors.push(String(s.reason?.message ?? s.reason))
      }
    }
  }
  return { rows, chunks: list.length, failed, errors }
}
