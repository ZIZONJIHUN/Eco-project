'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, addMonths, dayOfMonth, formatMedium, mondayOf, monthOf, schoolWeek, weekdayLabel } from '@/lib/date'
import { GRADE_BAR, GRADE_LABEL, GRADE_SOFT, GRADE_TEXT, compareToAverage, dayGrade, formatKg } from '@/lib/grade'
import { mean, popularMenus, searchMenus, topMenuOf } from '@/lib/stats'
import { useMediaQuery } from '@/lib/client/hooks'
import { useApp } from '../app-provider'
import { IconChevronLeft, IconChevronRight, IconClose, IconSearch } from '../ui/icons'
import { Segmented } from '../ui/segmented'

type View = 'week' | 'month'

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
  const wide = useMediaQuery('(min-width: 1024px)')
  const [weekStart, setWeekStart] = useState(() => mondayOf(day))
  const [month, setMonth] = useState(() => monthOf(day))

  const open = (d: string) => {
    selectDay(d === today ? null : d)
    router.push(d === today ? '/' : `/?d=${d}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-h1 font-bold tight">식단</h1>
        <p className="mt-1 text-cap text-ink-2">요일을 누르면 그날 메뉴와 탄소를 자세히 볼 수 있어요</p>
      </header>

      <div className="relative">
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
          className="h-13 w-full rounded-btn bg-surface pr-12 pl-12 text-body shadow-[0_0_0_1px_var(--line)] outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--brand)] [&::-webkit-search-cancel-button]:hidden"
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
                { value: 'week', label: '주간' },
                { value: 'month', label: '월간' },
              ]}
            />
          )}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
            {(wide || view === 'week') && <WeekView weekStart={weekStart} setWeekStart={setWeekStart} onPick={open} />}
            {(wide || view === 'month') && <MonthView month={month} setMonth={setMonth} onPick={open} />}
          </div>
        </>
      )}
    </div>
  )
}

function NavHeader({ title, sub, onPrev, onNext, prevLabel, nextLabel, prevDisabled, nextDisabled }: {
  title: string
  sub?: string
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
  prevDisabled?: boolean
  nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 pt-2">
      <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel} className="press grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">
        <IconChevronLeft size={20} />
      </button>
      <div className="min-w-0 text-center">
        <h2 className="text-title font-bold tight">{title}</h2>
        {sub && <p className="text-cap text-ink-2">{sub}</p>}
      </div>
      <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} className="press grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">
        <IconChevronRight size={20} />
      </button>
    </div>
  )
}

/** Apple 날씨의 주간 예보처럼: 요일 · 대표 메뉴 · 0부터 시작하는 막대 · 값 */
function WeekView({ weekStart, setWeekStart, onPick }: { weekStart: string; setWeekStart: (s: string) => void; onPick: (d: string) => void }) {
  const { byDay, data, avg, day, today, mealDays } = useApp()
  const week = schoolWeek(weekStart)
  const meals = week.map((d) => byDay.get(d)).filter((x) => x != null)
  const wAvg = mean(meals.map((m) => m.kg))
  const cmp = meals.length ? compareToAverage(wAvg, avg) : null
  const max = Math.max(...data.days.map((d) => d.kg), 1)
  const first = mealDays[0] ?? weekStart
  const last = mealDays.at(-1) ?? weekStart
  const lowest = meals.length > 1 ? meals.reduce((a, b) => (a.kg < b.kg ? a : b)).d : null

  return (
    <section aria-label="주간 식단" className="rounded-card bg-surface pb-2 shadow-[0_0_0_1px_var(--line)]">
      <NavHeader
        title={weekTitle(week[0], week[4])}
        sub={meals.length ? `급식 ${meals.length}일 · 평균 ${formatKg(wAvg)}kg` : '급식 없는 주'}
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        prevLabel="지난주"
        nextLabel="다음 주"
        prevDisabled={weekStart <= mondayOf(first)}
        nextDisabled={weekStart >= mondayOf(last) && weekStart >= mondayOf(today)}
      />
      {cmp && (
        <p className="px-5 pt-1 pb-2 text-center text-cap">
          <span className={`font-semibold ${GRADE_TEXT[cmp.tone]}`}>{cmp.text.replace('학교 평균', '이번 주는 학교 평균')}</span>
        </p>
      )}
      <ul className="px-2">
        {week.map((d) => {
          const m = byDay.get(d)
          const g = m ? dayGrade(m.kg, data.dayBands) : null
          const top = m ? topMenuOf(m, data.menus) : null
          const rest = m ? m.m.map(([n]) => n).filter((n) => n !== top?.name && !/밥$/.test(n)) : []
          return (
            <li key={d}>
              <button
                type="button"
                disabled={!m}
                onClick={() => onPick(d)}
                aria-label={m ? `${formatMedium(d)} ${formatKg(m.kg)}kg 탄소 ${GRADE_LABEL[g!]}, ${top?.name}` : `${formatMedium(d)} 급식 없음`}
                className={`press grid min-h-[72px] w-full grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-x-3 rounded-[14px] px-3 py-3 text-left enabled:hover:bg-surface-2 sm:grid-cols-[44px_minmax(0,1fr)_minmax(96px,28%)_56px] ${
                  d === day ? 'bg-surface-2' : ''
                }`}
              >
                <span className="row-span-2 flex flex-col items-center self-center leading-tight sm:row-span-1">
                  <span className={`text-[12px] font-semibold ${d === today ? 'text-brand' : 'text-ink-3'}`}>{d === today ? '오늘' : weekdayLabel(d)}</span>
                  <span className="tnum text-title font-bold">{dayOfMonth(d)}</span>
                </span>
                <span className="min-w-0">
                  {m ? (
                    <>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-body font-semibold">{top?.name}</span>
                        {d === lowest && <span className="shrink-0 rounded-[6px] bg-low-soft px-1.5 py-0.5 text-[12px] font-semibold whitespace-nowrap text-low">주간 최저</span>}
                      </span>
                      <span className="block truncate text-cap text-ink-3">{rest.join(', ')}</span>
                    </>
                  ) : (
                    <span className="text-body text-ink-3">급식 없음</span>
                  )}
                </span>
                <span className="tnum text-right text-body font-semibold sm:order-last">{m ? formatKg(m.kg) : ''}</span>
                <span className="relative col-span-2 mt-2 h-1.5 rounded-full bg-surface-3 sm:col-span-1 sm:mt-0 sm:h-2" aria-hidden="true">
                  {m && <span className={`absolute inset-y-0 left-0 rounded-full ${GRADE_BAR[g!]}`} style={{ width: `${Math.max((m.kg / max) * 100, 3)}%` }} />}
                  {m && <span className="absolute -top-1 -bottom-1 w-px bg-ink-3/70" style={{ left: `${(avg / max) * 100}%` }} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="px-5 pt-1 pb-3 text-[12px] text-ink-3">막대 위 세로선은 학교 평균 {avg.toFixed(2)}kg이에요</p>
    </section>
  )
}

function MonthView({ month, setMonth, onPick }: { month: string; setMonth: (m: string) => void; onPick: (d: string) => void }) {
  const { byDay, data, day, today, mealDays } = useApp()
  const first = `${month}-01`
  const start = mondayOf(first)
  const weeks: string[][] = []
  for (let w = start; monthOf(w) <= month || weeks.length === 0; w = addDays(w, 7)) {
    const days = schoolWeek(w)
    if (days.some((d) => monthOf(d) === month)) weeks.push(days)
    if (weeks.length > 6) break
  }
  const inMonth = mealDays.filter((d) => monthOf(d) === month).map((d) => byDay.get(d)!)
  const counts = { low: 0, mid: 0, high: 0 }
  for (const m of inMonth) counts[dayGrade(m.kg, data.dayBands)]++
  const [y, mo] = month.split('-').map(Number)
  const minMonth = monthOf(mealDays[0] ?? first)
  const maxMonth = monthOf(mealDays.at(-1) ?? first) > monthOf(today) ? monthOf(mealDays.at(-1)!) : monthOf(today)

  return (
    <section aria-label="월간 식단" className="rounded-card bg-surface pb-4 shadow-[0_0_0_1px_var(--line)]">
      <NavHeader
        title={`${y}년 ${mo}월`}
        sub={inMonth.length ? `급식 ${inMonth.length}일 · 평균 ${formatKg(mean(inMonth.map((m) => m.kg)))}kg` : '이달은 급식 정보가 없어요'}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        prevLabel="지난달"
        nextLabel="다음 달"
        prevDisabled={month <= minMonth}
        nextDisabled={month >= maxMonth}
      />
      <div className="px-3 pt-3 md:px-4" role="grid" aria-label={`${y}년 ${mo}월 급식 달력`}>
        <div role="row" className="grid grid-cols-5 gap-1.5 pb-1.5 text-center text-[12px] font-semibold text-ink-3">
          {['월', '화', '수', '목', '금'].map((w) => (
            <span key={w} role="columnheader">
              {w}
            </span>
          ))}
        </div>
        {weeks.map((wk) => (
          <div role="row" key={wk[0]} className="grid grid-cols-5 gap-1.5 pb-1.5">
            {wk.map((d) => {
              const m = byDay.get(d)
              const out = monthOf(d) !== month
              const g = m ? dayGrade(m.kg, data.dayBands) : null
              return (
                <div role="gridcell" key={d}>
                  <button
                    type="button"
                    disabled={!m || out}
                    onClick={() => onPick(d)}
                    aria-label={m ? `${formatMedium(d)} ${formatKg(m.kg)}kg 탄소 ${GRADE_LABEL[g!]}` : `${formatMedium(d)} 급식 없음`}
                    className={`press flex aspect-[1/1.05] w-full flex-col items-start justify-between rounded-[12px] p-2 text-left md:aspect-[1.15/1] ${
                      out ? 'invisible' : m ? `${GRADE_SOFT[g!]} hover:brightness-[0.97] dark:hover:brightness-110` : 'bg-surface-2/60'
                    } ${d === day ? 'outline-2 outline-offset-1 outline-ink' : ''}`}
                  >
                    <span className={`tnum text-cap font-semibold ${d === today ? 'grid size-6 place-items-center rounded-full bg-ink text-bg' : m ? 'text-ink' : 'text-ink-3'}`}>{dayOfMonth(d)}</span>
                    {m && <span className={`tnum text-cap font-bold ${GRADE_TEXT[g!]}`}>{m.kg.toFixed(1)}</span>}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pt-2 text-[12px] text-ink-2">
        {(['low', 'mid', 'high'] as const).map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-[3px] ${GRADE_BAR[g]}`} aria-hidden="true" />
            {GRADE_LABEL[g]} {g === 'low' ? `${data.dayBands.low}kg 미만` : g === 'high' ? `${data.dayBands.high}kg 이상` : ''}
            <span className="tnum text-ink-3">{counts[g]}일</span>
          </span>
        ))}
      </div>
    </section>
  )
}

function SearchResults({ query, onPick, onSuggest }: { query: string; onPick: (d: string) => void; onSuggest: (q: string) => void }) {
  const { data, today } = useApp()
  const hits = useMemo(() => searchMenus(query, data.days, data.menus), [query, data])
  const popular = useMemo(() => popularMenus(data.days), [data.days])
  const [openName, setOpenName] = useState<string | null>(null)

  if (!hits.length) {
    return (
      <section className="flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center shadow-[0_0_0_1px_var(--line)]">
        <h2 className="text-title font-bold">&quot;{query}&quot; 메뉴를 찾지 못했어요</h2>
        <p className="mt-1.5 text-cap text-ink-2">띄어쓰기 없이 짧게 찾아보세요. 이런 메뉴가 자주 나와요.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {popular.map((p) => (
            <button key={p} type="button" onClick={() => onSuggest(p)} className="press min-h-10 rounded-full bg-surface-3 px-3.5 text-cap font-semibold">
              {p}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-label="검색 결과" className="rounded-card bg-surface p-2 shadow-[0_0_0_1px_var(--line)]">
      <p className="px-3 pt-2 pb-1 text-cap text-ink-2" aria-live="polite">
        메뉴 {hits.length}개 · 모두 {hits.reduce((a, h) => a + h.dates.length, 0)}번 나왔어요
      </p>
      <ul>
        {hits.slice(0, 40).map((h) => {
          const next = h.dates.find((d) => d >= today)
          const expanded = openName === h.name
          return (
            <li key={h.name} className="border-b border-line last:border-0">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenName(expanded ? null : h.name)}
                className="press flex min-h-[64px] w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{h.name}</span>
                  <span className="block text-cap text-ink-3">
                    {h.dates.length}번 · {next ? `다음 ${formatMedium(next)}` : `마지막 ${formatMedium(h.dates.at(-1)!)}`}
                  </span>
                </span>
                <span className="tnum shrink-0 text-body font-semibold">{formatKg(h.kg)}kg</span>
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
