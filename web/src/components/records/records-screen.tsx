'use client'

import { useMemo, useState } from 'react'
import { formatMedium, formatShort } from '@/lib/date'
import { KG_PER_CAR_KM, formatKg } from '@/lib/grade'
import { standings, type Standing } from '@/lib/demo-students'
import { BASELINE_WASTE, PERIOD_LABEL, canLog, streak, summarize, type Period } from '@/lib/meal-log'
import { useMounted } from '@/lib/client/hooks'
import { useApp } from '../app-provider'
import { IconArrowRight, IconChevronRight } from '../ui/icons'
import { Segmented } from '../ui/segmented'
import { InfoTip, Tooltip } from '../ui/tooltip'
import { Fluent, Num } from '../ui/visual'

const card = 'rounded-card bg-surface shadow-card'
const MEDAL = ['1st-place-medal', '2nd-place-medal', '3rd-place-medal']

export function RecordsScreen() {
  const { log, byDay, data, today, mealDays, openLog } = useApp()
  const mounted = useMounted()
  const [period, setPeriod] = useState<Period>('month')
  const mine = useMemo(() => summarize(log, byDay, data.menus, today, period), [log, byDay, data.menus, today, period])
  const rows = useMemo(() => standings(log, data.days, data.menus, today, period), [log, data.days, data.menus, today, period])
  const myRank = rows.findIndex((r) => r.me) + 1
  const run = streak(log, mealDays, today)
  // 기록할 수 있는 가장 최근 급식날 중 아직 안 한 날
  const nextToLog = [...mealDays].reverse().find((d) => canLog(d, today) && !log[d])

  if (!mounted) return <div className="h-[60vh] animate-pulse rounded-card bg-surface-2" aria-hidden="true" />

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tight">내 기록</h1>
          <p className="mt-1 text-cap text-ink-2">먹은 양을 기록하면 줄인 탄소가 쌓이고, 1학년 순위에 반영돼요</p>
        </div>
        <Segmented<Period>
          label="기간"
          value={period}
          onChange={setPeriod}
          className="w-full sm:w-[280px]"
          options={(['week', 'month', 'all'] as const).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
        />
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start 3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-5">
          <MyHero saved={mine.saved} wasted={mine.wasted} days={mine.days} clean={mine.cleanDays} streakDays={run} rank={myRank} total={rows.length} period={period} />
          {nextToLog && (
            <button
              type="button"
              onClick={() => openLog(nextToLog)}
              className="press group flex items-center gap-3 rounded-card bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-lift"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-brand-soft">
                <Fluent name="memo" size={32} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{nextToLog === today ? '오늘 먹은 양 기록하기' : `${formatMedium(nextToLog)} 먹은 양 기록하기`}</span>
                <span className="block text-[12px] text-ink-2">메뉴마다 한 번씩 누르면 끝나요</span>
              </span>
              <IconArrowRight size={18} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
          <div className="3xl:hidden">
            <DailyChart results={mine.results} />
          </div>
        </div>

        <Leaderboard rows={rows} period={period} />

        <div className="flex flex-col gap-5 xl:col-span-2 3xl:col-span-1">
          <div className="hidden 3xl:block">
            <DailyChart results={mine.results} />
          </div>
          <RecentLogs />
        </div>
      </div>
    </div>
  )
}

function MyHero({ saved, wasted, days, clean, streakDays, rank, total, period }: {
  saved: number
  wasted: number
  days: number
  clean: number
  streakDays: number
  rank: number
  total: number
  period: Period
}) {
  return (
    <section
      className="@container relative overflow-hidden rounded-card p-5 text-white shadow-lift md:p-6"
      style={{ background: 'linear-gradient(140deg, #1f7556 0%, #155a42 45%, #0e3a2b 100%)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[#c9ee7a]/25 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-cap font-semibold text-white/75">
          {PERIOD_LABEL[period]} 내가 줄인 탄소
          <span data-theme="dark" className="contents">
            <InfoTip label="줄인 탄소 설명">
              한 끼의 {Math.round(BASELINE_WASTE * 100)}%를 남기는 학생(가정)과 비교해, 내가 덜 남긴 만큼의 탄소예요. 더 많이 남기면 마이너스가 돼요.
            </InfoTip>
          </span>
        </h2>
        {days > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[12px] font-semibold">
            <Fluent name={rank <= 3 ? MEDAL[rank - 1] : 'sports-medal'} size={16} />
            {total}명 중 <b className="tnum text-[#d8f59a]">{rank}위</b>
          </span>
        )}
      </div>
      {days === 0 ? (
        <div className="relative mt-4 flex items-center gap-4">
          <Fluent name="seedling" size={64} className="bob" />
          <p className="text-body text-white/85">
            아직 기록이 없어요. 점심을 먹고 <b className="font-bold text-[#d8f59a]">먹은 양</b>을 남겨 보세요. 다 먹은 만큼 줄인 탄소로 쌓여요.
          </p>
        </div>
      ) : (
        <>
          <p className="relative mt-2 flex items-baseline gap-1.5">
            <span className={`tnum text-display font-bold tracking-[-0.04em] ${saved >= 0 ? 'text-[#d8f59a]' : 'text-[#ffb38a]'}`}>
              {saved >= 0 ? '+' : ''}
              {formatKg(saved)}
            </span>
            <span className="text-body font-semibold text-white/70">kgCO₂e</span>
          </p>
          {saved > 0 && (
            <p className="relative mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-cap text-white/85">
              <Fluent name="automobile" size={20} />
              승용차 <b className="tnum font-bold text-white">{(saved / KG_PER_CAR_KM).toFixed(1)}km</b> 달릴 탄소를 아꼈어요
            </p>
          )}
          <dl className="relative mt-5 grid grid-cols-2 gap-2 @xl:grid-cols-4">
            <Stat icon="memo" label="기록한 날" value={`${days}일`} />
            <Stat icon="fire" label="연속 기록" value={`${streakDays}일`} />
            <Stat icon="glowing-star" label="다 먹은 날" value={`${clean}일`} />
            <Stat icon="wastebasket" label="버린 탄소" value={`${formatKg(wasted)}kg`} />
          </dl>
        </>
      )}
    </section>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[16px] bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
      <Fluent name={icon} size={28} />
      <div className="min-w-0">
        <dt className="text-[12px] whitespace-nowrap text-white/65">{label}</dt>
        <dd className="tnum text-body font-bold whitespace-nowrap">{value}</dd>
      </div>
    </div>
  )
}

function Avatar({ row, size = 40 }: { row: Standing; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${row.me ? 'ring-[3px] ring-lime' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: row.me ? 'linear-gradient(135deg,#2a8a63,#155a42)' : `hsl(${row.hue} 45% 46%)` }}
      aria-hidden="true"
    >
      {row.me ? '나' : row.name[0]}
    </span>
  )
}

function Leaderboard({ rows, period }: { rows: Standing[]; period: Period }) {
  const max = Math.max(...rows.map((r) => r.saved), 0.01)
  const meIdx = rows.findIndex((r) => r.me)
  const me = rows[meIdx]
  const above = meIdx > 0 ? rows[meIdx - 1] : null
  const together = rows.reduce((a, r) => a + Math.max(r.saved, 0), 0)
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean)
  return (
    <section aria-labelledby="lb-title" className={`p-5 md:p-6 ${card}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="lb-title" className="flex items-center gap-1.5 text-title font-bold tight">
          <Fluent name="trophy" size={28} />
          1학년 순위
          <InfoTip label="순위 설명">줄인 탄소가 많은 순서예요. 함께 보이는 친구 11명은 화면을 보여 주기 위한 예시 학생(가상 데이터)이에요.</InfoTip>
        </h2>
        <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[12px] font-semibold text-ink-2">{PERIOD_LABEL[period]} · 예시 학생 포함</span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-brand-soft p-3.5">
        <Fluent name="rocket" size={36} className="bob" />
        <p className="min-w-0 text-cap text-ink-2">
          {me.days === 0 ? (
            <>
              기록을 시작하면 순위에 들어가요. 다 먹은 날마다 한 끼 탄소의 <Num tone={1}>{Math.round(BASELINE_WASTE * 100)}%</Num>만큼 줄인 탄소가 쌓여요.
            </>
          ) : above ? (
            <>
              <b className="font-semibold text-ink">{above.name}</b>님까지 <Num tone={3}>{formatKg(above.saved - me.saved + 0.005)}kg</Num> 남았어요. 메뉴 하나만 더 다 먹으면 따라잡을 수 있어요.
            </>
          ) : (
            <>
              <b className="font-semibold text-ink">1위</b>예요! 2위와 <Num tone={1}>{formatKg(me.saved - (rows[1]?.saved ?? 0))}kg</Num> 차이로 앞서고 있어요.
            </>
          )}
        </p>
      </div>

      <ol className="mt-5 grid grid-cols-3 items-end gap-2.5" aria-label="1위부터 3위">
        {podium.map((r) => {
          const rank = rows.indexOf(r) + 1
          const h = rank === 1 ? 'pt-6 pb-4' : rank === 2 ? 'pt-4 pb-3' : 'pt-3 pb-3'
          return (
            <li
              key={r.id}
              className={`relative flex flex-col items-center rounded-[20px] px-2 text-center ${h} ${
                r.me ? 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand)]' : rank === 1 ? 'bg-t3-soft' : 'bg-surface-2'
              }`}
            >
              <Fluent name={MEDAL[rank - 1]} size={rank === 1 ? 44 : 36} className="absolute -top-4" />
              <Avatar row={r} size={rank === 1 ? 52 : 44} />
              <span className="mt-2 max-w-full truncate text-cap font-bold">{r.me ? '나' : r.name}</span>
              <span className="text-[11px] text-ink-3">{r.me ? '내 기록' : `${r.room}반`}</span>
              <span className={`tnum mt-1 text-title font-bold ${r.saved >= 0 ? 'text-t1' : 'text-t5'}`}>
                {r.saved >= 0 ? '+' : ''}
                {formatKg(r.saved, 1)}
                <small className="text-[11px] font-semibold text-ink-3">kg</small>
              </span>
            </li>
          )
        })}
      </ol>

      <ol className="mt-4 flex flex-col gap-1" start={4}>
        {rows.slice(3).map((r, i) => (
          <li
            key={r.id}
            className={`grid grid-cols-[28px_40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2.5 py-2 ${r.me ? 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand)]' : ''}`}
          >
            <span className="tnum text-center text-cap font-bold text-ink-3">{i + 4}</span>
            <Avatar row={r} />
            <span className="min-w-0">
              <span className="flex items-baseline gap-1.5">
                <span className="truncate text-body font-semibold">{r.me ? '나' : r.name}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{r.me ? '' : `${r.room}반 · `}{r.days}일 기록</span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <span className={`grow-x block h-full rounded-full ${r.me ? 'bg-brand' : r.saved >= 0 ? 'bg-t1-bar' : 'bg-t5-bar'}`} style={{ width: `${Math.max((Math.max(r.saved, 0) / max) * 100, 2)}%` }} />
              </span>
            </span>
            <span className={`tnum text-right text-body font-bold ${r.saved >= 0 ? 'text-t1' : 'text-t5'}`}>
              {r.saved >= 0 ? '+' : ''}
              {formatKg(r.saved, 1)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-surface-2 p-3.5">
        <Fluent name="herb" size={34} />
        <p className="text-cap text-ink-2">
          {PERIOD_LABEL[period]} 다 함께 <Num tone={1}>{formatKg(together, 1)}kg</Num> 줄였어요 · 승용차 <Num>{Math.round(together / KG_PER_CAR_KM)}km</Num>
        </p>
      </div>
    </section>
  )
}

function DailyChart({ results }: { results: { date: string; saved: number; wasted: number }[] }) {
  const recent = results.slice(-10)
  const max = Math.max(...recent.map((r) => Math.abs(r.saved)), 0.2)
  return (
    <section aria-labelledby="dc-title" className={`p-5 md:p-6 ${card}`}>
      <h2 id="dc-title" className="flex items-center gap-1.5 text-title font-bold tight">
        날마다 줄인 탄소
        <InfoTip label="날마다 줄인 탄소 설명">초록 막대는 기준보다 덜 남겨 줄인 탄소, 빨간 막대는 더 남겨 늘어난 탄소예요. 최근 10번의 기록이에요.</InfoTip>
      </h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-cap text-ink-3">기록이 쌓이면 여기에 막대로 보여요.</p>
      ) : (
        <div className="mt-5 flex h-36 items-stretch gap-2">
          {recent.map((r) => {
            const h = (Math.abs(r.saved) / max) * 50
            return (
              <Tooltip key={r.date} content={`${formatMedium(r.date)} · ${r.saved >= 0 ? '+' : ''}${formatKg(r.saved)}kg`} className="flex min-w-0 flex-1 flex-col">
                <span className="relative flex h-full w-full flex-col">
                  <span className="flex flex-1 items-end justify-center">
                    {r.saved >= 0 && <span className="w-full max-w-9 rounded-t-[8px] bg-t1-bar" style={{ height: `${h * 2}%` }} />}
                  </span>
                  <span className="h-px w-full bg-line-strong" />
                  <span className="flex flex-1 items-start justify-center">
                    {r.saved < 0 && <span className="w-full max-w-9 rounded-b-[8px] bg-t5-bar" style={{ height: `${h * 2}%` }} />}
                  </span>
                  <span className="tnum mt-1 text-center text-[11px] text-ink-3">{formatShort(r.date)}</span>
                </span>
              </Tooltip>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RecentLogs() {
  const { log, byDay, data, today, openLog } = useApp()
  const all = summarize(log, byDay, data.menus, today, 'all').results.slice(-8).reverse()
  return (
    <section aria-labelledby="rl-title" className={`p-5 md:p-6 ${card}`}>
      <h2 id="rl-title" className="text-title font-bold tight">
        최근 기록
      </h2>
      {all.length === 0 ? (
        <p className="mt-2 text-cap text-ink-3">아직 기록이 없어요.</p>
      ) : (
        <ul className="mt-2">
          {all.map((r) => {
            const editable = canLog(r.date, today)
            return (
              <li key={r.date} className="border-b border-line last:border-0">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => openLog(r.date)}
                  className="press flex min-h-14 w-full items-center gap-3 rounded-[12px] py-2 text-left enabled:hover:bg-surface-2"
                >
                  <Fluent name={r.cleanPlate ? 'glowing-star' : 'memo'} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold">{formatMedium(r.date)}</span>
                    <span className="block text-[12px] text-ink-3">{r.cleanPlate ? '다 먹었어요' : `${Math.round(r.wasteRate * 100)}% 남김`}</span>
                  </span>
                  <span className={`tnum text-body font-bold ${r.saved >= 0 ? 'text-t1' : 'text-t5'}`}>
                    {r.saved >= 0 ? '+' : ''}
                    {formatKg(r.saved)}kg
                  </span>
                  {editable && <IconChevronRight size={16} className="text-ink-3" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
