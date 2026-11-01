import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import snapshot from '@/data/meals-snapshot.json'
import { buildDataset, type RawRow } from '../build-dataset'
import { addDays, addMonths, endOfMonth, fromYmd, kstToday } from '../date'
import type { Dataset, LiveStatus } from '../types'
import { fetchLive } from './neis'

/** 데이터를 다시 만드는 주기: 6시간 */
export const REFRESH_SECONDS = 6 * 60 * 60

/** 받아 둔 파일 + 나이스 최신 식단을 합쳐 앱 데이터를 만든다. 6시간마다 새로 만든다. */
export async function getDataset(): Promise<Dataset> {
  'use cache'
  cacheLife({ stale: 60 * 60, revalidate: REFRESH_SECONDS, expire: 7 * 24 * 60 * 60 })
  cacheTag('dataset')

  const now = new Date()
  const today = kstToday(now)
  const snap = snapshot as RawRow[]
  const snapshotUntil = fromYmd(snap.at(-1)?.ymd ?? '20260101')
  const byDay = new Map(snap.map((r) => [r.ymd, r]))

  // 받아 둔 파일 이후 + 최근 2주(식단 수정 반영) ~ 다음 달 말까지 나이스에서 새로 받는다
  const from = addDays(snapshotUntil, 1) < addDays(today, -14) ? addDays(snapshotUntil, 1) : addDays(today, -14)
  const to = endOfMonth(`${addMonths(today.slice(0, 7), 1)}-01`)
  let status: LiveStatus = 'skipped'
  let failedChunks = 0
  if (process.env.NEIS_LIVE !== 'off') {
    try {
      const live = await fetchLive(from, to)
      for (const r of live.rows) if (r.ymd && r.dish) byDay.set(r.ymd, r)
      failedChunks = live.failed
      status = live.failed === 0 ? 'ok' : live.failed < live.chunks ? 'partial' : 'failed'
      if (live.errors.length) console.warn(`[dataset] 나이스 ${live.failed}/${live.chunks} 구간 실패`, live.errors.slice(0, 3))
      else console.info(`[dataset] 나이스 ${live.chunks} 구간 받음 (${from} ~ ${to}, ${live.rows.length}일)`)
    } catch (e) {
      status = 'failed'
      console.warn('[dataset] 나이스 요청 실패', e)
    }
  }

  return buildDataset([...byDay.values()], {
    generatedAt: now.toISOString(),
    generatedDay: today,
    live: { status, from, to, failedChunks },
    snapshotUntil,
  })
}
