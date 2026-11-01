'use client'

import { useEffect, useMemo, useRef, type PointerEvent as RPointerEvent } from 'react'
import { allergenName, myHits } from '@/lib/allergens'
import { addDays, dayOfMonth, formatLong, formatMedium, mondayOf, relativeLabel, schoolWeek, weekdayLabel } from '@/lib/date'
import { GRADE_BAR, KG_PER_CAR_KM, compareToAverage, dayGrade, formatKg, menuGrade, GRADE_LABEL, GRADE_TEXT } from '@/lib/grade'
import { topMenuOf } from '@/lib/stats'
import { shareOrCopy } from '@/lib/client/share'
import type { Day } from '@/lib/types'
import { useApp } from '../app-provider'
import { GradeBadge } from '../ui/grade-badge'
import { IconAlert, IconChevronLeft, IconChevronRight, IconShare } from '../ui/icons'
import { useToast } from '../ui/toast'
import { InstallNudge } from '../install/install-nudge'

const isDay = (s: string | null): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s))

export function TodayScreen() {
  const app = useApp()
  const { day, today, byDay, mealDays, selectDay, pickedDay } = app
  const { toast } = useToast()
  const meal = byDay.get(day) ?? null

  // 주소의 ?d= 로 들어오면 그날을 보여 준다 (공유한 링크)
  const readUrl = useRef(false)
  useEffect(() => {
    if (readUrl.current) return
    readUrl.current = true
    const d = new URLSearchParams(window.location.search).get('d')
    if (isDay(d)) selectDay(d)
  }, [selectDay])
  // 고른 날을 주소에 남긴다 (새로고침·공유해도 같은 날)
  useEffect(() => {
    if (!readUrl.current) return
    const url = pickedDay ? `/?d=${pickedDay}` : '/'
    if (window.location.pathname === '/' && window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url)
  }, [pickedDay])

  const go = (d: string | null) => selectDay(d && d === today ? null : d)
  const prevMeal = useMemo(() => [...mealDays].reverse().find((d) => d < day) ?? null, [mealDays, day])
  const nextMeal = useMemo(() => mealDays.find((d) => d > day) ?? null, [mealDays, day])

  // ← → 키로 앞뒤 급식날
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [role="radiogroup"], dialog[open]')) return
      if (e.key === 'ArrowLeft' && prevMeal) go(prevMeal)
      if (e.key === 'ArrowRight' && nextMeal) go(nextMeal)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 좌우로 밀어 앞뒤 급식날
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: RPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return
    if (dx > 0 && prevMeal) go(prevMeal)
    if (dx < 0 && nextMeal) go(nextMeal)
  }

  const rel = relativeLabel(day, today)
  const eyebrow = !pickedDay && day !== today ? '다음 급식' : `${rel ?? (day < today ? '지난' : '예정된')} 점심`

  const share = async () => {
    const url = `${window.location.origin}/?d=${day}`
    const text = meal
      ? `${formatMedium(day)} 효명고 점심 탄소 ${formatKg(meal.kg)}kgCO₂e · ${meal.m.map(([n]) => n).join(', ')}`
      : `${formatMedium(day)} 효명고 점심`
    const r = await shareOrCopy({ title: '효명 급식 탄소', text, url })
    if (r === 'copied') toast({ message: '링크를 복사했어요', tone: 'success' })
    if (r === 'failed') toast({ message: '공유하지 못했어요. 주소창의 링크를 복사해 주세요.', tone: 'error' })
  }

  // 한 번만 그리고 배치만 바꾼다. 폰: 한 줄로 위에서 아래 / PC: 왼쪽(날짜·탄소·팁) 오른쪽(메뉴)
  // 읽는 순서(DOM)는 폰에서 보이는 순서와 같다
  const col1 = 'lg:col-start-1'
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
      className="flex touch-pan-y flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_auto_auto_auto_auto_1fr] lg:items-start lg:gap-x-8"
    >
      <header className={`flex items-end justify-between gap-3 ${col1}`}>
        <div className="min-w-0">
          <p className="text-cap font-semibold text-brand">{eyebrow}</p>
          <h1 className="mt-0.5 text-h1 font-bold tight">{formatLong(day)}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {pickedDay && pickedDay !== today && (
            <button type="button" onClick={() => selectDay(null)} className="press min-h-11 rounded-full bg-surface px-4 text-cap font-semibold shadow-[0_0_0_1px_var(--line)]">
              오늘로
            </button>
          )}
          <button type="button" onClick={share} aria-label="이날 급식 공유하기" className="press grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface">
            <IconShare size={21} />
          </button>
        </div>
      </header>

      <div className={col1}>
        <DayStrip day={day} today={today} byDay={byDay} onPick={go} />
      </div>

      <div className={col1}>{meal ? <Hero meal={meal} /> : <EmptyDay day={day} onPick={go} />}</div>

      {meal && (
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-5 lg:row-start-2">
          <AllergyAlert meal={meal} />
          <MenuList meal={meal} />
          <div className="hidden lg:block">
            <WeekMini day={day} onPick={go} />
          </div>
        </div>
      )}

      {meal && (
        <div className={col1}>
          <Tip meal={meal} />
        </div>
      )}
      <div className={`${col1} empty:hidden`}>
        <InstallNudge />
      </div>
    </div>
  )
}

function DayStrip({ day, today, byDay, onPick }: { day: string; today: string; byDay: Map<string, Day>; onPick: (d: string) => void }) {
  const { data } = useApp()
  const week = schoolWeek(mondayOf(day))
  const moveWeek = (n: number) => {
    const target = schoolWeek(addDays(mondayOf(day), 7 * n))
    onPick(target.find((d) => byDay.has(d)) ?? target[0])
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => moveWeek(-1)} aria-label="지난주" className="press grid h-16 w-9 shrink-0 place-items-center rounded-btn text-ink-2 hover:bg-surface">
        <IconChevronLeft size={20} />
      </button>
      <ol className="grid flex-1 grid-cols-5 gap-1.5">
        {week.map((d) => {
          const meal = byDay.get(d)
          const on = d === day
          const g = meal ? dayGrade(meal.kg, data.dayBands) : null
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => onPick(d)}
                aria-current={on ? 'date' : undefined}
                aria-label={`${formatMedium(d)}${d === today ? ' 오늘' : ''}${meal ? ` 탄소 ${GRADE_LABEL[g!]}` : ' 급식 없음'}`}
                className={`press flex w-full flex-col items-center rounded-[16px] pt-2 pb-2.5 transition-colors ${
                  on ? 'bg-ink text-bg' : 'hover:bg-surface'
                } ${!meal && !on ? 'text-ink-3' : ''}`}
              >
                <span className={`text-[12px] font-semibold ${on ? 'opacity-70' : 'text-ink-3'}`}>{d === today ? '오늘' : weekdayLabel(d)}</span>
                <span className="tnum text-title font-bold">{dayOfMonth(d)}</span>
                <span
                  aria-hidden="true"
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${g ? GRADE_BAR[g] : on ? 'bg-bg/30' : 'bg-line-strong'}`}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={() => moveWeek(1)} aria-label="다음 주" className="press grid h-16 w-9 shrink-0 place-items-center rounded-btn text-ink-2 hover:bg-surface">
        <IconChevronRight size={20} />
      </button>
    </div>
  )
}

function Hero({ meal }: { meal: Day }) {
  const { data, avg } = useApp()
  const grade = dayGrade(meal.kg, data.dayBands)
  const cmp = compareToAverage(meal.kg, avg)
  const scaleMax = Math.max(6, ...data.days.map((d) => d.kg)) * 1.02
  const pos = (kg: number) => `${Math.min(kg / scaleMax, 1) * 100}%`
  return (
    <section aria-labelledby="hero-title" className="rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="hero-title" className="text-cap font-semibold text-ink-2">
          점심 한 끼 탄소
        </h2>
        <GradeBadge grade={grade} />
      </div>
      <p key={meal.d} className="rise mt-3 flex items-baseline gap-2">
        <span className="tnum text-display font-bold tracking-[-0.04em]">{formatKg(meal.kg)}</span>
        <span className="text-body font-semibold text-ink-2">kgCO₂e</span>
      </p>
      <p className="mt-2 text-body">
        <span className={`font-semibold ${GRADE_TEXT[cmp.tone]}`}>{cmp.text}</span>
        <span className="text-ink-2"> · 승용차 약 {Math.round(meal.kg / KG_PER_CAR_KM)}km</span>
      </p>

      <div className="mt-5" aria-hidden="true">
        <div className="relative h-2 rounded-full bg-surface-3">
          <div className="absolute inset-y-0 left-0 rounded-l-full bg-low-bar/25" style={{ width: pos(data.dayBands.low) }} />
          <div className="absolute inset-y-0 rounded-r-full bg-high-bar/25" style={{ left: pos(data.dayBands.high), right: 0 }} />
          <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink-3" style={{ left: pos(avg) }} />
          <div
            className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface ${GRADE_BAR[grade]} shadow-[0_0_0_1px_var(--line-strong)] transition-[left] duration-300 ease-out`}
            style={{ left: pos(meal.kg) }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-ink-3">
          <span>0</span>
          <span className="tnum">평균 {avg.toFixed(1)}</span>
          <span className="tnum">{Math.round(scaleMax)}kg</span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <dt className="text-[12px] font-medium text-ink-3">공식 열량</dt>
          <dd className="tnum mt-0.5 text-body font-semibold">{meal.kcal ? `${Math.round(meal.kcal)} kcal` : '-'}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-medium text-ink-3">단백질</dt>
          <dd className="tnum mt-0.5 text-body font-semibold">{meal.prot != null ? `${meal.prot} g` : '-'}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-medium text-ink-3">메뉴</dt>
          <dd className="tnum mt-0.5 text-body font-semibold">{meal.m.length}가지</dd>
        </div>
      </dl>
    </section>
  )
}

function AllergyAlert({ meal }: { meal: Day }) {
  const { allergies } = useApp()
  if (!allergies.length) return null
  const hits = meal.m.filter(([, al]) => myHits(al, allergies).length)
  if (!hits.length) return null
  const names = [...new Set(hits.flatMap(([, al]) => myHits(al, allergies)))].map(allergenName)
  return (
    <div role="alert" className="flex gap-3 rounded-card bg-alert-soft p-4 text-alert">
      <IconAlert size={20} className="mt-0.5 shrink-0" strokeWidth={2} />
      <p className="text-body font-semibold">
        {hits.map(([n]) => n).join(', ')}에 내 알레르기({names.join(', ')})가 있어요
      </p>
    </div>
  )
}

function MenuList({ meal }: { meal: Day }) {
  const { data, allergies, openMenu } = useApp()
  const max = Math.max(...meal.m.map(([n]) => data.menus[n]?.kg ?? 0), 0.001)
  return (
    <section aria-labelledby="menu-title" className="rounded-card bg-surface shadow-[0_0_0_1px_var(--line)]">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-1 md:px-6">
        <h2 id="menu-title" className="text-title font-bold tight">
          메뉴
        </h2>
        <span className="text-cap text-ink-3">눌러서 재료 보기</span>
      </div>
      <ul className="px-2 pb-2">
        {meal.m.map(([name, al]) => {
          const info = data.menus[name]
          const kg = info?.kg ?? 0
          const g = menuGrade(kg)
          const hit = myHits(al, allergies).length > 0
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => openMenu(name, meal.d)}
                className="press flex min-h-[68px] w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-body font-semibold">{name}</span>
                  {(hit || info?.src !== 'table') && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {hit && <span className="rounded-[6px] bg-alert-soft px-1.5 py-0.5 text-[12px] font-semibold text-alert">내 알레르기</span>}
                      {info && info.src !== 'table' && (
                        <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-[12px] font-semibold text-ink-2">비슷한 메뉴로 추정</span>
                      )}
                    </span>
                  )}
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <span className={`block h-full rounded-full ${GRADE_BAR[g]}`} style={{ width: `${Math.max((kg / max) * 100, 2)}%` }} />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="tnum text-body font-semibold">{formatKg(kg)}</span>
                  <span className={`text-[12px] font-semibold ${GRADE_TEXT[g]}`}>{GRADE_LABEL[g]}</span>
                </span>
                <IconChevronRight size={16} className="shrink-0 text-ink-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Tip({ meal }: { meal: Day }) {
  const { data, openMenu } = useApp()
  const top = topMenuOf(meal, data.menus)
  if (!top.name) return null
  return (
    <button
      type="button"
      onClick={() => openMenu(top.name, meal.d)}
      className="press flex w-full items-center gap-4 rounded-card bg-brand p-5 text-left text-brand-ink md:p-6"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-cap font-semibold opacity-80">가장 효과가 큰 한 가지</span>
        <span className="mt-1 block text-title font-bold tight">{top.name} 남기지 않기</span>
        <span className="mt-1.5 block text-cap opacity-85">
          오늘 탄소의 {Math.round(top.share * 100)}%가 이 메뉴에서 나와요. 절반을 남기면 {formatKg(top.kg / 2)}kg이 그대로 버려져요.
        </span>
      </span>
      <IconChevronRight size={20} className="shrink-0 opacity-80" />
    </button>
  )
}

function EmptyDay({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const { mealDays, data } = useApp()
  const next = mealDays.find((d) => d > day)
  const prev = [...mealDays].reverse().find((d) => d < day)
  const notYet = day > (data.days.at(-1)?.d ?? day)
  return (
    <section className="flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center shadow-[0_0_0_1px_var(--line)]">
      <span className="grid size-14 place-items-center rounded-full bg-surface-3 text-[26px]" aria-hidden="true">
        {notYet ? '🗓️' : '🍃'}
      </span>
      <h2 className="mt-4 text-title font-bold">{notYet ? '아직 식단이 올라오지 않았어요' : '이날은 급식이 없어요'}</h2>
      <p className="mt-1.5 max-w-[32ch] text-cap text-ink-2">
        {notYet
          ? '나이스에는 보통 한 달 치 식단이 한꺼번에 올라와요. 올라오면 6시간 안에 여기에도 보여요.'
          : '주말, 방학, 공휴일이거나 학교 행사가 있는 날이에요.'}
      </p>
      {(next || prev) && (
        <button
          type="button"
          onClick={() => onPick((next ?? prev)!)}
          className="press mt-5 min-h-12 rounded-btn bg-ink px-5 text-body font-semibold text-bg"
        >
          {next ? `다음 급식 보기 · ${formatMedium(next)}` : `가장 최근 급식 보기 · ${formatMedium(prev!)}`}
        </button>
      )}
    </section>
  )
}

/** PC 화면 오른쪽 열 아래: 이번 주 다섯 날을 한눈에 */
function WeekMini({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const { byDay, data, avg } = useApp()
  const week = schoolWeek(mondayOf(day))
  const max = Math.max(...week.map((d) => byDay.get(d)?.kg ?? 0), avg, 1) * 1.1
  return (
    <section aria-labelledby="wm-title" className="rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] md:p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="wm-title" className="text-title font-bold tight">
          이번 주 흐름
        </h2>
        <span className="tnum text-cap text-ink-3">점선: 평균 {avg.toFixed(2)}kg</span>
      </div>
      <div className="relative mt-5 grid h-36 grid-cols-5 items-end gap-4">
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-3/60" style={{ bottom: `${(avg / max) * 100}%` }} />
        {week.map((d) => {
          const m = byDay.get(d)
          const g = m ? dayGrade(m.kg, data.dayBands) : null
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              aria-label={`${formatMedium(d)} ${m ? `${formatKg(m.kg)}kg` : '급식 없음'}`}
              className="press group flex h-full flex-col items-center justify-end gap-1.5"
            >
              <span className="tnum relative z-[1] rounded-[4px] bg-surface px-1 text-[12px] font-semibold text-ink-2">{m ? m.kg.toFixed(1) : ''}</span>
              <span
                className={`w-full max-w-10 rounded-t-[8px] rounded-b-[3px] ${g ? GRADE_BAR[g] : 'bg-surface-3'} ${d === day ? 'outline-2 outline-offset-2 outline-ink' : 'opacity-85 group-hover:opacity-100'}`}
                style={{ height: m ? `${(m.kg / max) * 100}%` : '6px' }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-4 text-center text-[12px] font-medium text-ink-3">
        {week.map((d) => (
          <span key={d}>
            {weekdayLabel(d)} {dayOfMonth(d)}
          </span>
        ))}
      </div>
    </section>
  )
}
