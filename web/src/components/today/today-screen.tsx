'use client'

import { useEffect, useMemo, useRef, type PointerEvent as RPointerEvent } from 'react'
import { allergenIcon, allergenName, myHits } from '@/lib/allergens'
import { addDays, dayOfMonth, formatLong, formatMedium, mondayOf, relativeLabel, schoolWeek, weekdayLabel } from '@/lib/date'
import {
  GRADE_LABEL,
  KG_PER_CAR_KM,
  TONE_BAR,
  TONE_SOFT,
  TONE_SOFT_VAR,
  TONE_TEXT,
  compareToAverage,
  dayCuts,
  dayGrade,
  dayTone,
  formatKg,
  menuGrade,
  menuTone,
  type Tone,
} from '@/lib/grade'
import { topMenuOf } from '@/lib/stats'
import { useStoredState } from '@/lib/client/hooks'
import { BASELINE_WASTE, LOG_WINDOW_DAYS, canLog, dayResult } from '@/lib/meal-log'
import Link from 'next/link'
import { shareOrCopy } from '@/lib/client/share'
import type { Day } from '@/lib/types'
import { useApp } from '../app-provider'
import { InstallNudge } from '../install/install-nudge'
import { GradeBadge } from '../ui/grade-badge'
import { IconAlert, IconArrowDown, IconArrowRight, IconArrowUp, IconChevronLeft, IconChevronRight, IconMinus, IconShare } from '../ui/icons'
import { Segmented } from '../ui/segmented'
import { useToast } from '../ui/toast'
import { InfoTip, Tooltip } from '../ui/tooltip'
import { Donut, Fluent, FoodImg, Num } from '../ui/visual'

const isDay = (s: string | null): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s))
const card = 'rounded-card bg-surface shadow-card'

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

  // 한 번만 그리고 배치만 바꾼다. 읽는 순서(DOM)는 폰에서 보이는 순서와 같다.
  // PC(1280~): 왼쪽(날짜·탄소, 그 아래 팁·주간) + 오른쪽(메뉴 카드)
  // 넓은 화면(1680~): 왼쪽(날짜·탄소) · 가운데(메뉴 카드) · 오른쪽(팁·주간·설치)
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
      className="flex touch-pan-y flex-col gap-4 xl:grid xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-6 3xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)_minmax(320px,380px)]"
    >
      <div className="contents xl:col-start-1 xl:row-start-1 xl:flex xl:flex-col xl:gap-4">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-cap font-semibold text-brand">{eyebrow}</p>
            <h1 className="mt-0.5 text-h1 font-bold tight">{formatLong(day)}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {pickedDay && pickedDay !== today && (
              <button type="button" onClick={() => selectDay(null)} className="press min-h-11 rounded-full bg-surface px-4 text-cap font-semibold shadow-card">
                오늘로
              </button>
            )}
            <Tooltip content="이날 급식을 친구에게 공유해요">
              <button type="button" onClick={share} aria-label="이날 급식 공유하기" className="press grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface">
                <IconShare size={21} />
              </button>
            </Tooltip>
          </div>
        </header>
        <DayStrip day={day} today={today} byDay={byDay} onPick={go} />
        {meal ? <Hero meal={meal} /> : <EmptyDay day={day} onPick={go} />}
        {meal && <LogCard meal={meal} />}
      </div>

      {meal && (
        <div className="contents xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:flex xl:flex-col xl:gap-4">
          <AllergyAlert meal={meal} />
          <MenuGrid meal={meal} />
        </div>
      )}

      <div className="contents xl:col-start-1 xl:row-start-2 xl:flex xl:flex-col xl:gap-4 3xl:col-start-3 3xl:row-span-2 3xl:row-start-1">
        {meal && <Impact meal={meal} />}
        <div className="hidden md:block">
          <WeekMini day={day} onPick={go} />
        </div>
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
      <Tooltip content="지난주">
        <button type="button" onClick={() => moveWeek(-1)} aria-label="지난주" className="press grid h-16 w-9 shrink-0 place-items-center rounded-btn text-ink-2 hover:bg-surface">
          <IconChevronLeft size={20} />
        </button>
      </Tooltip>
      <ol className="grid flex-1 grid-cols-5 gap-1.5">
        {week.map((d) => {
          const meal = byDay.get(d)
          const on = d === day
          const tone = meal ? dayTone(meal.kg, data.dayBands) : null
          const top = meal ? topMenuOf(meal, data.menus) : null
          return (
            <li key={d}>
              <Tooltip content={meal ? `${formatKg(meal.kg)}kg · ${top?.name} 외 ${meal.m.length - 1}가지` : '급식 없음'} className="block">
                <button
                  type="button"
                  onClick={() => onPick(d)}
                  aria-current={on ? 'date' : undefined}
                  aria-label={`${formatMedium(d)}${d === today ? ' 오늘' : ''}${meal ? ` 탄소 ${GRADE_LABEL[dayGrade(meal.kg, data.dayBands)]}` : ' 급식 없음'}`}
                  className={`press flex w-full flex-col items-center rounded-[16px] pt-2 pb-2.5 transition-colors ${on ? 'bg-ink text-bg' : 'hover:bg-surface'} ${
                    !meal && !on ? 'text-ink-3' : ''
                  }`}
                >
                  <span className={`text-[12px] font-semibold ${on ? 'opacity-70' : 'text-ink-3'}`}>{d === today ? '오늘' : weekdayLabel(d)}</span>
                  <span className="tnum text-title font-bold">{dayOfMonth(d)}</span>
                  <span aria-hidden="true" className={`mt-1 h-1.5 w-4 rounded-full ${tone ? TONE_BAR[tone] : on ? 'bg-bg/30' : 'bg-line-strong'}`} />
                </button>
              </Tooltip>
            </li>
          )
        })}
      </ol>
      <Tooltip content="다음 주">
        <button type="button" onClick={() => moveWeek(1)} aria-label="다음 주" className="press grid h-16 w-9 shrink-0 place-items-center rounded-btn text-ink-2 hover:bg-surface">
          <IconChevronRight size={20} />
        </button>
      </Tooltip>
    </div>
  )
}

const DIR_ICON = { down: IconArrowDown, same: IconMinus, up: IconArrowUp }

function Hero({ meal }: { meal: Day }) {
  const { data, avg } = useApp()
  const grade = dayGrade(meal.kg, data.dayBands)
  const tone = dayTone(meal.kg, data.dayBands)
  const cmp = compareToAverage(meal.kg, avg)
  const Dir = DIR_ICON[cmp.dir]
  const scaleMax = Math.max(6, ...data.days.map((d) => d.kg)) * 1.02
  const pos = (kg: number) => `${Math.min(kg / scaleMax, 1) * 100}%`
  const cuts = dayCuts(data.dayBands)
  const segs: [number, number, Tone][] = [
    [0, cuts[0], 1],
    [cuts[0], cuts[1], 2],
    [cuts[1], cuts[2], 3],
    [cuts[2], cuts[3], 4],
    [cuts[3], scaleMax, 5],
  ]
  return (
    <section aria-labelledby="hero-title" className={`relative overflow-hidden p-5 md:p-6 ${card}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full blur-3xl" style={{ background: TONE_SOFT_VAR[tone] }} />
      <div className="relative flex items-center justify-between gap-3">
        <h2 id="hero-title" className="flex items-center gap-1.5 text-cap font-semibold text-ink-2">
          점심 한 끼 탄소
          <InfoTip label="kgCO₂e 설명">kgCO₂e는 여러 온실가스를 이산화탄소 무게로 바꿔 더한 값이에요. 학생 1명이 먹는 1인분 기준이에요.</InfoTip>
        </h2>
        <GradeBadge
          grade={grade}
          tip={`이 학교 급식의 하위 30%(${data.dayBands.low}kg 미만)는 낮음, 상위 30%(${data.dayBands.high}kg 이상)는 높음이에요.`}
        />
      </div>
      <p key={meal.d} className="rise relative mt-3 flex items-baseline gap-2">
        <span className={`tnum text-display font-bold tracking-[-0.04em] ${TONE_TEXT[tone]}`}>{formatKg(meal.kg)}</span>
        <span className="text-body font-semibold text-ink-2">kgCO₂e</span>
      </p>

      <div className="relative mt-3 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-cap font-semibold ${TONE_SOFT[cmp.tone]} ${TONE_TEXT[cmp.tone]}`}>
          <Dir size={15} strokeWidth={2.6} />
          {cmp.dir !== 'same' && <b className="tnum text-body font-bold">{cmp.pct}%</b>}
          {cmp.text}
        </span>
        <Tooltip content={`승용차가 1km를 달릴 때 약 ${KG_PER_CAR_KM}kgCO₂e가 나온다고 잡은 대략값이에요.`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-cap font-semibold text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">
            <Fluent name="automobile" size={20} />
            승용차 <b className="tnum text-body font-bold text-ink">{Math.round(meal.kg / KG_PER_CAR_KM)}km</b> 달린 만큼
          </span>
        </Tooltip>
      </div>

      <Tooltip content={`0~${Math.round(scaleMax)}kg 사이 이날의 위치예요. 세로선은 학교 평균 ${avg.toFixed(2)}kg이에요.`} className="relative mt-6 block">
        <div aria-hidden="true">
          <div className="relative flex h-2.5 gap-[2px] overflow-visible">
            {segs.map(([a, b, t]) => (
              <span key={t} className={`h-full rounded-full ${TONE_BAR[t]} opacity-35`} style={{ width: `calc(${((b - a) / scaleMax) * 100}% - 2px)` }} />
            ))}
            <span className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-ink-2" style={{ left: pos(avg) }} />
            <span
              className={`absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface ${TONE_BAR[tone]} shadow-[0_0_0_1px_var(--line-strong),0_2px_6px_rgb(0_0_0/0.2)] transition-[left] duration-300 ease-out`}
              style={{ left: pos(meal.kg) }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-ink-3">
            <span>0</span>
            <span className="tnum">평균 {avg.toFixed(1)}</span>
            <span className="tnum">{Math.round(scaleMax)}kg</span>
          </div>
        </div>
      </Tooltip>

      <dl className="relative mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <dt className="flex items-center gap-1 text-[12px] font-medium text-ink-3">
            공식 열량 <InfoTip label="공식 열량 설명">학교가 나이스에 올린 이날 점심의 열량이에요.</InfoTip>
          </dt>
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
  const nums = [...new Set(hits.flatMap(([, al]) => myHits(al, allergies)))]
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card bg-alert-soft p-4 text-alert">
      <IconAlert size={22} className="shrink-0" strokeWidth={2} />
      <p className="min-w-0 flex-1 text-body font-semibold">
        <b className="font-bold">{hits.map(([n]) => n).join(', ')}</b>에 내 알레르기가 있어요
      </p>
      <span className="flex flex-wrap gap-1.5">
        {nums.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-cap font-semibold">
            <Fluent name={allergenIcon(n)} size={18} />
            {allergenName(n)}
          </span>
        ))}
      </span>
    </div>
  )
}

function MenuGrid({ meal }: { meal: Day }) {
  const { data, allergies, openMenu } = useApp()
  const [sort, setSort] = useStoredState<'order' | 'carbon'>('hm-menu-sort', 'order')
  const items = meal.m.map(([name, al], i) => ({ name, al, i, info: data.menus[name], kg: data.menus[name]?.kg ?? 0 }))
  const ranked = [...items].sort((a, b) => b.kg - a.kg)
  const topName = ranked[0]?.name
  const shown = sort === 'carbon' ? ranked : items
  return (
    <section aria-labelledby="menu-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="menu-title" className="flex items-baseline gap-2 text-title font-bold tight">
          메뉴 <span className="tnum text-body font-semibold text-ink-3">{meal.m.length}가지</span>
        </h2>
        <Segmented
          label="메뉴 정렬"
          value={sort}
          onChange={setSort}
          className="w-[196px]"
          options={[
            { value: 'order', label: '급식 순서' },
            { value: 'carbon', label: '탄소 많은 순' },
          ]}
        />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fill,minmax(176px,1fr))]">
        {shown.map(({ name, al, info, kg }) => {
          const tone = menuTone(kg)
          const grade = menuGrade(kg)
          const hit = myHits(al, allergies)
          const share = meal.kg ? kg / meal.kg : 0
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => openMenu(name, meal.d)}
                className="group flex h-full w-full flex-col rounded-[20px] bg-surface p-3 text-left shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
              >
                <span
                  className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[14px]"
                  style={{ background: `radial-gradient(circle at 50% 60%, ${TONE_SOFT_VAR[tone]}, var(--surface-2) 75%)` }}
                >
                  <FoodImg
                    name={name}
                    size={96}
                    className="size-[58%] drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
                  />
                  {name === topName && meal.m.length > 1 && (
                    <span className="absolute top-2 left-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-bg backdrop-blur">탄소 1위</span>
                  )}
                  {hit.length > 0 && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-[11px] font-semibold text-white dark:text-[#1a0f0e]">
                      <IconAlert size={11} strokeWidth={2.6} />
                      알레르기
                    </span>
                  )}
                </span>
                <span className="mt-2.5 line-clamp-2 min-h-[3em] text-body leading-[1.5] font-semibold">{name}</span>
                <span className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="flex items-baseline gap-0.5">
                    <span className={`tnum text-title font-bold ${TONE_TEXT[tone]}`}>{formatKg(kg)}</span>
                    <span className="text-[12px] font-semibold text-ink-3">kg</span>
                  </span>
                  <span className={`text-[12px] font-bold ${TONE_TEXT[tone]}`}>{GRADE_LABEL[grade]}</span>
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                  <span className={`block h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max(share * 100, 3)}%` }} />
                </span>
                <span className="mt-1.5 flex items-center justify-between gap-1 text-[12px] text-ink-3">
                  <span>
                    오늘의 <b className="tnum font-semibold text-ink-2">{Math.round(share * 100)}%</b>
                  </span>
                  {info && <span className="tnum">{Math.round(info.kcal)}kcal</span>}
                </span>
                {info && info.src !== 'table' && (
                  <Tooltip content={`재료표에 없는 새 메뉴라 비슷한 "${info.base}"의 재료로 추정했어요.`} className="mt-2 flex">
                    <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">비슷한 메뉴로 추정</span>
                  </Tooltip>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 가장 효과가 큰 한 가지: 그림 + 핵심 숫자 두 개 */
function Impact({ meal }: { meal: Day }) {
  const { data, openMenu } = useApp()
  const top = topMenuOf(meal, data.menus)
  if (!top.name) return null
  return (
    <button
      type="button"
      onClick={() => openMenu(top.name, meal.d)}
      className="press group relative w-full overflow-hidden rounded-card p-5 text-left text-white shadow-lift md:p-6"
      style={{ background: 'linear-gradient(140deg, #1f7556 0%, #155a42 45%, #0e3a2b 100%)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-[#c9ee7a]/25 blur-3xl" />
      <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[12px] font-semibold text-[#d8f59a]">
        <Fluent name="light-bulb" size={16} />
        가장 효과가 큰 한 가지
      </span>
      <span className="relative mt-3 flex items-center gap-4">
        <span className="grid size-[68px] shrink-0 place-items-center rounded-[20px] bg-white/12 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]">
          <FoodImg name={top.name} size={48} className="drop-shadow-[0_6px_10px_rgb(0_0_0/0.25)] transition-transform duration-300 group-hover:scale-110" />
        </span>
        <span className="min-w-0">
          <span className="block text-title leading-snug font-bold tight">{top.name}</span>
          <span className="mt-0.5 block text-cap text-white/75">남기지 않고 다 먹기</span>
        </span>
      </span>
      <span className="relative mt-4 grid grid-cols-2 gap-2.5">
        <span className="flex items-center gap-3 rounded-[16px] bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <Donut value={top.share} size={46} stroke={6} color="#c9ee7a" />
          <span className="min-w-0">
            <span className="block text-[12px] text-white/70">오늘 탄소의</span>
            <b className="tnum block text-h2 leading-none font-bold text-[#d8f59a]">{Math.round(top.share * 100)}%</b>
          </span>
        </span>
        <span className="flex items-center gap-3 rounded-[16px] bg-white/10 p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <Fluent name="wastebasket" size={40} />
          <span className="min-w-0">
            <span className="block text-[12px] text-white/70">절반 남기면</span>
            <b className="tnum block text-h2 leading-none font-bold text-[#ffb38a]">
              {formatKg(top.kg / 2)}
              <small className="ml-0.5 text-cap font-semibold text-white/70">kg</small>
            </b>
            <span className="block text-[12px] text-white/70">버려져요</span>
          </span>
        </span>
      </span>
      <span className="relative mt-4 flex items-center justify-between text-cap font-semibold text-white/85">
        재료와 줄이는 방법 보기
        <IconArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </button>
  )
}

function EmptyDay({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const { mealDays, data } = useApp()
  const next = mealDays.find((d) => d > day)
  const prev = [...mealDays].reverse().find((d) => d < day)
  const notYet = day > (data.days.at(-1)?.d ?? day)
  return (
    <section className={`flex flex-col items-center px-6 py-10 text-center ${card}`}>
      <Fluent name={notYet ? 'spiral-calendar' : 'fallen-leaf'} size={72} className="bob" />
      <h2 className="mt-4 text-title font-bold">{notYet ? '아직 식단이 올라오지 않았어요' : '이날은 급식이 없어요'}</h2>
      <p className="mt-1.5 max-w-[34ch] text-cap text-ink-2">
        {notYet ? (
          <>
            나이스에는 보통 <Num>한 달 치</Num> 식단이 한꺼번에 올라와요. 올라오면 <Num>6시간</Num> 안에 여기에도 보여요.
          </>
        ) : (
          '주말, 방학, 공휴일이거나 학교 행사가 있는 날이에요.'
        )}
      </p>
      {(next || prev) && (
        <button type="button" onClick={() => onPick((next ?? prev)!)} className="press mt-5 min-h-12 rounded-btn bg-ink px-5 text-body font-semibold text-bg">
          {next ? `다음 급식 보기 · ${formatMedium(next)}` : `가장 최근 급식 보기 · ${formatMedium(prev!)}`}
        </button>
      )}
    </section>
  )
}

/** 이번 주 다섯 날 막대 (0부터, 점선은 학교 평균) */
function WeekMini({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const { byDay, data, avg } = useApp()
  const week = schoolWeek(mondayOf(day))
  const max = Math.max(...week.map((d) => byDay.get(d)?.kg ?? 0), avg, 1) * 1.15
  return (
    <section aria-labelledby="wm-title" className={`p-5 md:p-6 ${card}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="wm-title" className="flex items-center gap-1.5 text-title font-bold tight">
          이번 주 흐름
          <InfoTip label="이번 주 흐름 설명">막대 높이는 그날 점심 한 끼의 탄소예요. 점선은 학교 평균이고, 막대를 누르면 그날로 가요.</InfoTip>
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
          <span className="inline-block w-4 border-t-2 border-dashed border-ink-3" aria-hidden="true" />
          평균 <span className="tnum font-semibold text-ink-2">{avg.toFixed(2)}kg</span>
        </span>
      </div>
      <div className="relative mt-5 grid h-40 grid-cols-5 items-end gap-3">
        <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink-3/50" style={{ bottom: `${(avg / max) * 100}%` }} />
        {week.map((d) => {
          const m = byDay.get(d)
          const tone = m ? dayTone(m.kg, data.dayBands) : null
          return (
            <Tooltip key={d} content={m ? `${formatMedium(d)} · ${formatKg(m.kg)}kg · ${topMenuOf(m, data.menus).name}` : `${formatMedium(d)} · 급식 없음`} className="flex h-full">
              <button
                type="button"
                onClick={() => onPick(d)}
                aria-label={`${formatMedium(d)} ${m ? `${formatKg(m.kg)}kg` : '급식 없음'}`}
                className="press group flex h-full w-full flex-col items-center justify-end gap-1.5"
              >
                <span className={`tnum relative z-[1] rounded-[4px] bg-surface px-1 text-[12px] font-bold ${tone ? TONE_TEXT[tone] : ''}`}>{m ? m.kg.toFixed(1) : ''}</span>
                <span
                  className={`w-full max-w-12 rounded-t-[10px] rounded-b-[4px] transition-[filter] ${tone ? TONE_BAR[tone] : 'hatch bg-surface-2'} ${
                    d === day ? 'outline-2 outline-offset-2 outline-ink' : 'group-hover:brightness-110'
                  }`}
                  style={{ height: m ? `${(m.kg / max) * 100}%` : '8px' }}
                />
              </button>
            </Tooltip>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-3 text-center text-[12px] font-medium text-ink-3">
        {week.map((d) => (
          <span key={d} className={d === day ? 'font-bold text-ink' : ''}>
            {weekdayLabel(d)} {dayOfMonth(d)}
          </span>
        ))}
      </div>
    </section>
  )
}

/** 먹은 양 기록: 기록 전에는 버튼, 기록 뒤에는 줄인 탄소 요약 */
function LogCard({ meal }: { meal: Day }) {
  const { log, openLog, today, data } = useApp()
  const entry = log[meal.d]
  const future = meal.d > today
  const allowed = canLog(meal.d, today)
  if (entry) {
    const r = dayResult(meal, data.menus, entry)
    return (
      <section className={`flex items-center gap-3 p-4 ${card}`}>
        <Fluent name={r.cleanPlate ? 'glowing-star' : 'memo'} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-ink-3">{r.cleanPlate ? '다 먹었어요' : '기록했어요'}</p>
          <p className="text-body font-semibold">
            줄인 탄소{' '}
            <b className={`tnum text-title font-bold ${r.saved >= 0 ? 'text-t1' : 'text-t5'}`}>
              {r.saved >= 0 ? '+' : ''}
              {formatKg(r.saved)}kg
            </b>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link href="/records" className="press rounded-btn px-2 py-1 text-cap font-semibold text-brand hover:bg-brand-soft">
            내 기록
          </Link>
          {allowed && (
            <button type="button" onClick={() => openLog(meal.d)} className="press rounded-btn px-2 py-1 text-cap font-semibold text-ink-3 hover:bg-surface-2">
              고치기
            </button>
          )}
        </div>
      </section>
    )
  }
  if (future) {
    return (
      <Tooltip content="급식을 먹은 날에 기록할 수 있어요" className="block">
        <section className={`flex items-center gap-3 p-4 opacity-80 ${card}`}>
          <Fluent name="memo" size={40} className="grayscale" />
          <p className="min-w-0 flex-1 text-cap text-ink-2">
            이날 점심을 먹고 나면 <b className="font-semibold text-ink">먹은 양을 기록</b>할 수 있어요
          </p>
        </section>
      </Tooltip>
    )
  }
  if (!allowed) return null
  const potential = meal.kg * BASELINE_WASTE
  return (
    <button
      type="button"
      onClick={() => openLog(meal.d)}
      className="press group flex w-full items-center gap-3 rounded-card bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-lift"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-brand-soft">
        <Fluent name="memo" size={32} className="transition-transform duration-300 group-hover:-rotate-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">먹은 양 기록하기</span>
        <span className="block text-[12px] text-ink-2">
          다 먹으면 최대 <b className="tnum font-bold text-t1">{formatKg(potential)}kg</b>을 줄여요 · {LOG_WINDOW_DAYS}일 안에 기록
        </span>
      </span>
      <IconArrowRight size={18} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
