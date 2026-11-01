'use client'

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { myHits } from '@/lib/allergens'
import { addDays, addMonths, dayOfMonth, formatMedium, mondayOf, monthOf, schoolWeek, weekdayLabel } from '@/lib/date'
import {
  GRADE_LABEL,
  TONE_BAR,
  TONE_LABEL,
  TONE_SOFT,
  TONE_SOFT_VAR,
  TONE_TEXT,
  compareToAverage,
  dayCuts,
  dayGrade,
  dayTone,
  formatKg,
  menuTone,
  type Tone,
} from '@/lib/grade'
import { mean, popularMenus, searchMenus, topMenuOf } from '@/lib/stats'
import { useMediaQuery } from '@/lib/client/hooks'
import type { Day } from '@/lib/types'
import { useApp } from '../app-provider'
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconClose, IconMinus, IconSearch } from '../ui/icons'
import { Segmented } from '../ui/segmented'
import { InfoTip, Tooltip } from '../ui/tooltip'
import { Fluent, FoodImg } from '../ui/visual'

type View = 'week' | 'month'
const card = 'rounded-card bg-surface shadow-card'

function weekTitle(a: string, b: string): string {
  const [, am, ad] = a.split('-').map(Number)
  const [, bm, bd] = b.split('-').map(Number)
  return am === bm ? `${am}월 ${ad}일 – ${bd}일` : `${am}월 ${ad}일 – ${bm}월 ${bd}일`
}

export function MealsScreen() {
  const { day, selectDay, today } = useApp()
  const router = useRouter()
  const [view, setView] = useState<View>('week')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const wide = useMediaQuery('(min-width: 1280px)')
  const [weekStart, setWeekStart] = useState(() => mondayOf(day))
  const [month, setMonth] = useState(() => monthOf(day))

  const open = (d: string) => {
    selectDay(d === today ? null : d)
    router.push(d === today ? '/' : `/?d=${d}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold tight">식단</h1>
          <p className="mt-1 text-cap text-ink-2">날짜를 누르면 그날 메뉴와 탄소를 자세히 볼 수 있어요</p>
        </div>
        <div className="relative w-full xl:w-[440px]">
          <IconSearch size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
          <label htmlFor="menu-search" className="sr-only">
            메뉴 찾기
          </label>
          <input
            id="menu-search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="메뉴 찾기 · 예: 돈까스, 떡볶이"
            className="h-13 w-full rounded-btn bg-surface pr-12 pl-12 text-body shadow-card outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--brand)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="press absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
            >
              <IconClose size={18} />
            </button>
          )}
        </div>
      </header>

      {deferred.trim() ? (
        <SearchResults query={deferred} onPick={open} onSuggest={setQuery} />
      ) : (
        <>
          {!wide && (
            <Segmented
              label="보기 방식"
              value={view}
              onChange={setView}
              options={[
                { value: 'week', label: '주간', icon: <Fluent name="spiral-calendar" size={18} /> },
                { value: 'month', label: '월간 달력', icon: <Fluent name="card-index-dividers" size={18} /> },
              ]}
            />
          )}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:items-start 3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            {(wide || view === 'week') && (
              <div className="flex flex-col gap-5">
                <WeekView weekStart={weekStart} setWeekStart={setWeekStart} onPick={open} />
                {wide && <MonthTop month={month} />}
              </div>
            )}
            {(wide || view === 'month') && <MonthView month={month} setMonth={setMonth} onPick={open} />}
          </div>
        </>
      )}
    </div>
  )
}

function NavHeader({ title, onPrev, onNext, prevLabel, nextLabel, prevDisabled, nextDisabled, children }: {
  title: string
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
  prevDisabled?: boolean
  nextDisabled?: boolean
  children?: ReactNode
}) {
  const btn = 'press grid size-11 place-items-center rounded-full text-ink-2 shadow-card hover:bg-surface-2 disabled:opacity-30 disabled:shadow-none'
  return (
    <div className="px-4 pt-4 md:px-5 md:pt-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title font-bold tight">{title}</h2>
        <div className="flex gap-1.5">
          <Tooltip content={prevLabel}>
            <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel} className={btn}>
              <IconChevronLeft size={20} />
            </button>
          </Tooltip>
          <Tooltip content={nextLabel}>
            <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} className={btn}>
              <IconChevronRight size={20} />
            </button>
          </Tooltip>
        </div>
      </div>
      {children}
    </div>
  )
}

const DIR_ICON = { down: IconArrowDown, same: IconMinus, up: IconArrowUp }

/** 한 줄 요약 칩 */
function Chip({ children, tone, tip }: { children: ReactNode; tone?: Tone; tip?: string }) {
  const chip = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-cap font-semibold ${tone ? `${TONE_SOFT[tone]} ${TONE_TEXT[tone]}` : 'bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]'}`}>
      {children}
    </span>
  )
  return tip ? <Tooltip content={tip}>{chip}</Tooltip> : chip
}

/** Apple 날씨의 주간 예보처럼: 요일 · 대표 메뉴 그림 · 0부터 시작하는 막대 · 색 숫자 */
function WeekView({ weekStart, setWeekStart, onPick }: { weekStart: string; setWeekStart: (s: string) => void; onPick: (d: string) => void }) {
  const { byDay, data, avg, day, today, mealDays, allergies } = useApp()
  const week = schoolWeek(weekStart)
  const meals = week.map((d) => byDay.get(d)).filter((x): x is Day => x != null)
  const wAvg = mean(meals.map((m) => m.kg))
  const cmp = meals.length ? compareToAverage(wAvg, avg) : null
  const max = Math.max(...data.days.map((d) => d.kg), 1)
  const first = mealDays[0] ?? weekStart
  const last = mealDays.at(-1) ?? weekStart
  const lowest = meals.length > 1 ? meals.reduce((a, b) => (a.kg < b.kg ? a : b)).d : null
  const highest = meals.length > 1 ? meals.reduce((a, b) => (a.kg > b.kg ? a : b)).d : null
  const Dir = cmp ? DIR_ICON[cmp.dir] : IconMinus

  return (
    <section aria-label="주간 식단" className={`@container pb-2 ${card}`}>
      <NavHeader
        title={weekTitle(week[0], week[4])}
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        prevLabel="지난주"
        nextLabel="다음 주"
        prevDisabled={weekStart <= mondayOf(first)}
        nextDisabled={weekStart >= mondayOf(last) && weekStart >= mondayOf(today)}
      >
        {meals.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone={dayTone(wAvg, data.dayBands)} tip="이번 주 급식날의 한 끼 평균이에요">
              평균 <b className="tnum text-body">{formatKg(wAvg)}</b>kg
            </Chip>
            {cmp && (
              <Chip tone={cmp.tone} tip={`학교 전체 평균 ${avg.toFixed(2)}kg과 비교했어요`}>
                <Dir size={14} strokeWidth={2.6} />
                {cmp.dir !== 'same' && <b className="tnum">{cmp.pct}%</b>}
                {cmp.text.replace('학교 평균', '평균')}
              </Chip>
            )}
            <Chip>급식 {meals.length}일</Chip>
          </div>
        ) : (
          <p className="mt-2 text-cap text-ink-3">이 주에는 급식 정보가 없어요</p>
        )}
      </NavHeader>
      <ul className="mt-2 px-2">
        {week.map((d) => {
          const m = byDay.get(d)
          const tone = m ? dayTone(m.kg, data.dayBands) : null
          const top = m ? topMenuOf(m, data.menus) : null
          const rest = m ? m.m.map(([n]) => n).filter((n) => n !== top?.name && !/밥$/.test(n)) : []
          const alg = m ? m.m.some(([, al]) => myHits(al, allergies).length) : false
          return (
            <li key={d}>
              <button
                type="button"
                disabled={!m}
                onClick={() => onPick(d)}
                aria-label={m ? `${formatMedium(d)} ${formatKg(m.kg)}kg 탄소 ${GRADE_LABEL[dayGrade(m.kg, data.dayBands)]}, ${top?.name}` : `${formatMedium(d)} 급식 없음`}
                className={`press grid min-h-[76px] w-full grid-cols-[40px_44px_minmax(0,1fr)_60px] items-center gap-x-3 rounded-[16px] px-2.5 py-2.5 text-left enabled:hover:bg-surface-2 @xl:grid-cols-[44px_48px_minmax(0,1fr)_minmax(90px,22%)_64px] ${
                  d === day ? 'bg-surface-2' : ''
                }`}
              >
                <span className="row-span-2 flex flex-col items-center self-center leading-tight @xl:row-span-1">
                  <span className={`text-[12px] font-semibold ${d === today ? 'text-brand' : 'text-ink-3'}`}>{d === today ? '오늘' : weekdayLabel(d)}</span>
                  <span className="tnum text-title font-bold">{dayOfMonth(d)}</span>
                </span>
                <span
                  className={`row-span-2 grid size-11 place-items-center self-center rounded-[14px] @xl:row-span-1 @xl:size-12 ${m ? '' : 'hatch'}`}
                  style={m && tone ? { background: `radial-gradient(circle at 50% 60%, ${TONE_SOFT_VAR[tone]}, var(--surface-2) 80%)` } : undefined}
                >
                  {m && top && <FoodImg name={top.name} size={32} />}
                </span>
                <span className="min-w-0">
                  {m ? (
                    <>
                      <span className="block truncate text-body font-semibold">{top?.name}</span>
                      <span className="block truncate text-cap text-ink-3">{rest.join(', ')}</span>
                      {(d === lowest || d === highest || alg) && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {d === lowest && <Tag tone={1} icon="herb">주간 최저</Tag>}
                          {d === highest && <Tag tone={5} icon="fire">주간 최고</Tag>}
                          {alg && <Tag alert>내 알레르기</Tag>}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-body text-ink-3">급식 없음</span>
                  )}
                </span>
                <span className="flex flex-col items-end leading-tight @xl:order-last">
                  {m && tone && (
                    <>
                      <span className={`tnum text-title font-bold ${TONE_TEXT[tone]}`}>{formatKg(m.kg)}</span>
                      <span className={`text-[11px] font-bold ${TONE_TEXT[tone]}`}>{GRADE_LABEL[dayGrade(m.kg, data.dayBands)]}</span>
                    </>
                  )}
                </span>
                <span className="relative col-span-2 mt-2 h-2 rounded-full bg-surface-3 @xl:col-span-1 @xl:mt-0" aria-hidden="true">
                  {m && tone && <span className={`grow-x absolute inset-y-0 left-0 rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max((m.kg / max) * 100, 3)}%` }} />}
                  {m && <span className="absolute -top-1 -bottom-1 w-[2px] rounded-full bg-ink-2/70" style={{ left: `${(avg / max) * 100}%` }} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="flex items-center gap-1.5 px-5 pt-1 pb-3 text-[12px] text-ink-3">
        <span className="inline-block h-3 w-[2px] rounded-full bg-ink-2/70" aria-hidden="true" />
        막대 위 세로선은 학교 평균 <b className="tnum font-semibold text-ink-2">{avg.toFixed(2)}kg</b>이에요
      </p>
    </section>
  )
}

function Tag({ children, tone, icon, alert = false }: { children: ReactNode; tone?: Tone; icon?: string; alert?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
        alert ? 'bg-alert-soft text-alert' : tone ? `${TONE_SOFT[tone]} ${TONE_TEXT[tone]}` : ''
      }`}
    >
      {icon && <Fluent name={icon} size={13} />}
      {children}
    </span>
  )
}

/** 월간 달력: 칸 색이 탄소 양을 말하고(히트맵), 오른쪽 끝 칸은 그 주 평균 */
function MonthView({ month, setMonth, onPick }: { month: string; setMonth: (m: string) => void; onPick: (d: string) => void }) {
  const { byDay, data, day, today, mealDays, allergies } = useApp()
  const first = `${month}-01`
  const start = mondayOf(first)
  const weeks: string[][] = []
  for (let w = start; monthOf(w) <= month; w = addDays(w, 7)) {
    const days = schoolWeek(w)
    if (days.some((d) => monthOf(d) === month)) weeks.push(days)
    if (weeks.length > 6) break
  }
  const inMonth = mealDays.filter((d) => monthOf(d) === month).map((d) => byDay.get(d)!)
  const counts = { low: 0, mid: 0, high: 0 }
  for (const m of inMonth) counts[dayGrade(m.kg, data.dayBands)]++
  const mAvg = mean(inMonth.map((m) => m.kg))
  const hi = inMonth.length ? inMonth.reduce((a, b) => (a.kg > b.kg ? a : b)) : null
  const lo = inMonth.length ? inMonth.reduce((a, b) => (a.kg < b.kg ? a : b)) : null
  const [y, mo] = month.split('-').map(Number)
  const minMonth = monthOf(mealDays[0] ?? first)
  const maxMonth = monthOf(mealDays.at(-1) ?? first) > monthOf(today) ? monthOf(mealDays.at(-1)!) : monthOf(today)
  const cuts = dayCuts(data.dayBands)

  return (
    <section aria-label="월간 식단" className={`pb-4 ${card}`}>
      <NavHeader
        title={`${y}년 ${mo}월`}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        prevLabel="지난달"
        nextLabel="다음 달"
        prevDisabled={month <= minMonth}
        nextDisabled={month >= maxMonth}
      >
        {inMonth.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone={dayTone(mAvg, data.dayBands)} tip="이달 급식날의 한 끼 평균이에요">
              평균 <b className="tnum text-body">{formatKg(mAvg)}</b>kg
            </Chip>
            <Chip tone={1} tip={`${data.dayBands.low}kg 미만인 날`}>
              낮음 <b className="tnum">{counts.low}</b>일
            </Chip>
            <Chip tone={3} tip={`${data.dayBands.low}~${data.dayBands.high}kg인 날`}>
              보통 <b className="tnum">{counts.mid}</b>일
            </Chip>
            <Chip tone={4} tip={`${data.dayBands.high}kg 이상인 날`}>
              높음 <b className="tnum">{counts.high}</b>일
            </Chip>
            {hi && (
              <Chip tip={`가장 높은 날: ${topMenuOf(hi, data.menus).name}`}>
                <Fluent name="fire" size={16} />
                최고 {formatMedium(hi.d)} <b className={`tnum ${TONE_TEXT[dayTone(hi.kg, data.dayBands)]}`}>{formatKg(hi.kg, 1)}</b>
              </Chip>
            )}
          </div>
        ) : (
          <p className="mt-2 text-cap text-ink-3">이달은 급식 정보가 없어요</p>
        )}
      </NavHeader>

      <div className="px-3 pt-4 md:px-4" role="grid" aria-label={`${y}년 ${mo}월 급식 달력`}>
        <div role="row" className="grid grid-cols-5 gap-1.5 pb-1.5 text-center text-[12px] font-semibold text-ink-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_64px]">
          {['월', '화', '수', '목', '금'].map((w) => (
            <span key={w} role="columnheader">
              {w}
            </span>
          ))}
          <span role="columnheader" className="hidden sm:flex sm:items-center sm:justify-center sm:gap-1">
            주 평균
          </span>
        </div>
        {weeks.map((wk) => {
          const wMeals = wk.filter((d) => monthOf(d) === month).map((d) => byDay.get(d)).filter((x): x is Day => x != null)
          const wAvg = wMeals.length ? mean(wMeals.map((m) => m.kg)) : null
          return (
            <div role="row" key={wk[0]} className="grid grid-cols-5 gap-1.5 pb-1.5 sm:grid-cols-[repeat(5,minmax(0,1fr))_64px]">
              {wk.map((d) => (
                <Cell key={d} d={d} out={monthOf(d) !== month} m={byDay.get(d)} isDay={d === day} isToday={d === today} hi={hi?.d === d} lo={lo?.d === d} allergies={allergies} onPick={onPick} />
              ))}
              <div role="gridcell" className="hidden sm:grid">
                {wAvg != null ? (
                  <Tooltip content={`이 주 평균 ${formatKg(wAvg)}kg · 급식 ${wMeals.length}일`} className="flex">
                    <span className="flex w-full flex-col items-center justify-center rounded-[12px] bg-surface-2 text-center">
                      <span className="text-[11px] font-semibold text-ink-3">평균</span>
                      <span className={`tnum text-body font-bold ${TONE_TEXT[dayTone(wAvg, data.dayBands)]}`}>{wAvg.toFixed(1)}</span>
                    </span>
                  </Tooltip>
                ) : (
                  <span className="rounded-[12px] bg-surface-2/50" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 px-4 md:px-5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
          <span>낮음</span>
          <span className="flex h-2.5 flex-1 overflow-hidden rounded-full" aria-hidden="true">
            {([1, 2, 3, 4, 5] as Tone[]).map((t) => (
              <span key={t} className={`flex-1 ${TONE_BAR[t]}`} />
            ))}
          </span>
          <span>높음</span>
        </div>
        <div className="mt-1 flex justify-between px-7 text-[11px] text-ink-3 tnum" aria-hidden="true">
          {cuts.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Fluent name="fire" size={14} /> 이달 최고
          </span>
          <span className="inline-flex items-center gap-1">
            <Fluent name="herb" size={14} /> 이달 최저
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-alert" /> 내 알레르기
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="hatch inline-block size-3 rounded-[3px] bg-surface-2" /> 급식 없음
          </span>
        </p>
      </div>
    </section>
  )
}

function Cell({ d, out, m, isDay, isToday, hi, lo, allergies, onPick }: {
  d: string
  out: boolean
  m: Day | undefined
  isDay: boolean
  isToday: boolean
  hi: boolean
  lo: boolean
  allergies: number[]
  onPick: (d: string) => void
}) {
  const { data } = useApp()
  if (out) return <div role="gridcell" aria-hidden="true" />
  if (!m) {
    return (
      <div role="gridcell">
        <div className="hatch flex aspect-square w-full flex-col justify-between rounded-[12px] bg-surface-2/60 p-2 sm:aspect-[1/1.05] lg:aspect-[1.1/1]">
          <span className={`tnum text-cap font-semibold ${isToday ? 'grid size-6 place-items-center rounded-full bg-ink text-bg' : 'text-ink-3'}`}>{dayOfMonth(d)}</span>
          <span className="hidden text-[11px] text-ink-3 md:block">급식 없음</span>
        </div>
      </div>
    )
  }
  const tone = dayTone(m.kg, data.dayBands)
  const top = topMenuOf(m, data.menus)
  const alg = m.m.some(([, al]) => myHits(al, allergies).length)
  return (
    <div role="gridcell" className="@container">
      <Tooltip
        className="block"
        content={
          <span className="block">
            <b className="tnum">
              {formatMedium(d)} · {formatKg(m.kg)}kg ({TONE_LABEL[tone]})
            </b>
            <span className="mt-1 block opacity-80">{m.m.map(([n]) => n).join(', ')}</span>
          </span>
        }
      >
        <button
          type="button"
          onClick={() => onPick(d)}
          aria-label={`${formatMedium(d)} ${formatKg(m.kg)}kg 탄소 ${TONE_LABEL[tone]}`}
          className={`press relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-[12px] p-1.5 text-left transition-[filter,box-shadow] hover:shadow-lift sm:aspect-[1/1.05] sm:p-2 lg:aspect-[1.1/1] ${TONE_SOFT[tone]} ${
            isDay ? 'outline-2 outline-offset-1 outline-ink' : ''
          }`}
        >
          <span className="flex items-start justify-between gap-1">
            <span className={`tnum text-cap font-semibold ${isToday ? 'grid size-6 place-items-center rounded-full bg-ink text-bg' : 'text-ink'}`}>{dayOfMonth(d)}</span>
            <span className="flex items-center gap-0.5">
              {alg && <span className="size-2 rounded-full bg-alert" aria-label="내 알레르기" />}
              {hi && <Fluent name="fire" size={16} />}
              {lo && <Fluent name="herb" size={16} />}
            </span>
          </span>
          <span className="hidden min-w-0 items-center gap-1 @[4.5rem]:flex @[10rem]:gap-2">
            <FoodImg name={top.name} size={40} className="size-5 @[10rem]:size-9" />
            <span className="hidden truncate text-[11px] font-medium text-ink-2 @[8rem]:inline @[10rem]:text-cap">{top.name}</span>
          </span>
          <span className={`tnum text-cap font-bold sm:text-body @[10rem]:text-h2 ${TONE_TEXT[tone]}`}>
            {m.kg.toFixed(1)}
            <small className="ml-0.5 hidden text-[11px] font-semibold text-ink-3 @[10rem]:inline">kg</small>
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

function SearchResults({ query, onPick, onSuggest }: { query: string; onPick: (d: string) => void; onSuggest: (q: string) => void }) {
  const { data, today } = useApp()
  const hits = useMemo(() => searchMenus(query, data.days, data.menus), [query, data])
  const popular = useMemo(() => popularMenus(data.days), [data.days])
  const [openName, setOpenName] = useState<string | null>(null)

  if (!hits.length) {
    return (
      <section className={`flex flex-col items-center px-6 py-10 text-center ${card}`}>
        <Fluent name="magnifying-glass-tilted-left" size={64} className="bob" />
        <h2 className="mt-3 text-title font-bold">&quot;{query}&quot; 메뉴를 찾지 못했어요</h2>
        <p className="mt-1.5 text-cap text-ink-2">띄어쓰기 없이 짧게 찾아보세요. 이런 메뉴가 자주 나와요.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {popular.map((p) => (
            <button key={p} type="button" onClick={() => onSuggest(p)} className="press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3 text-cap font-semibold">
              <FoodImg name={p} size={18} />
              {p}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-label="검색 결과" className={`p-2 ${card}`}>
      <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-cap text-ink-2" aria-live="polite">
        메뉴 <b className="tnum font-bold text-ink">{hits.length}</b>개 · 모두 <b className="tnum font-bold text-ink">{hits.reduce((a, h) => a + h.dates.length, 0)}</b>번 나왔어요
        <InfoTip label="검색 결과 설명">메뉴를 누르면 나온 날짜가 펼쳐져요. 초록 테두리는 앞으로 나올 날이에요.</InfoTip>
      </p>
      <ul className="grid gap-x-4 lg:grid-cols-2">
        {hits.slice(0, 40).map((h) => {
          const next = h.dates.find((d) => d >= today)
          const expanded = openName === h.name
          const tone = menuTone(h.kg)
          return (
            <li key={h.name} className="border-b border-line last:border-0">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenName(expanded ? null : h.name)}
                className="press flex min-h-[68px] w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-[14px]" style={{ background: `radial-gradient(circle at 50% 60%, ${TONE_SOFT_VAR[tone]}, var(--surface-2) 80%)` }}>
                  <FoodImg name={h.name} size={32} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{h.name}</span>
                  <span className="block text-cap text-ink-3">
                    {h.dates.length}번 · {next ? `다음 ${formatMedium(next)}` : `마지막 ${formatMedium(h.dates.at(-1)!)}`}
                  </span>
                </span>
                <span className={`tnum shrink-0 text-body font-bold ${TONE_TEXT[tone]}`}>{formatKg(h.kg)}kg</span>
                <IconChevronRight size={16} className={`shrink-0 text-ink-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
              </button>
              {expanded && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {[...h.dates].reverse().map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onPick(d)}
                      className={`press min-h-10 rounded-btn border px-3 text-cap font-semibold hover:bg-surface-2 ${d >= today ? 'border-brand text-brand' : 'border-line-strong'}`}
                    >
                      {formatMedium(d)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 넓은 화면에서 주간 목록 아래: 이달 탄소가 많은 메뉴 다섯 개 */
function MonthTop({ month }: { month: string }) {
  const { data, openMenu } = useApp()
  const seen = new Map<string, string>()
  for (const d of data.days) if (monthOf(d.d) === month) for (const [n] of d.m) seen.set(n, d.d)
  const items = [...seen.entries()]
    .map(([name, d]) => ({ name, d, kg: data.menus[name]?.kg ?? 0 }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 5)
  if (!items.length) return null
  const max = items[0].kg || 1
  const [, mo] = month.split('-').map(Number)
  return (
    <section aria-labelledby="mt-title" className={`p-5 ${card}`}>
      <h2 id="mt-title" className="flex items-center gap-1.5 text-title font-bold tight">
        <Fluent name="fire" size={24} />
        {mo}월 탄소가 많은 메뉴
        <InfoTip label="이달 탄소가 많은 메뉴 설명">이달 급식에 나온 메뉴 중 1인분 탄소가 많은 순서예요. 누르면 재료를 볼 수 있어요.</InfoTip>
      </h2>
      <ol className="mt-3 flex flex-col gap-1">
        {items.map((it, i) => {
          const tone = menuTone(it.kg)
          return (
            <li key={it.name}>
              <button type="button" onClick={() => openMenu(it.name, it.d)} className="press flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left hover:bg-surface-2">
                <span className="tnum w-5 text-center text-cap font-bold text-ink-3">{i + 1}</span>
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `radial-gradient(circle at 50% 60%, ${TONE_SOFT_VAR[tone]}, var(--surface-2) 80%)` }}>
                  <FoodImg name={it.name} size={28} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{it.name}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <span className={`block h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${(it.kg / max) * 100}%` }} />
                  </span>
                </span>
                <span className={`tnum text-body font-bold ${TONE_TEXT[tone]}`}>{formatKg(it.kg)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
