'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { allergenIcon, allergenName } from '@/lib/allergens'
import { formatMedium } from '@/lib/date'
import { foodImage } from '@/lib/food-image'
import { GRADE1_STUDENTS, KG_PER_CAR_KM, TONE_BAR, TONE_SOFT_VAR, TONE_TEXT, formatKg, menuGrade, menuTone, type Tone } from '@/lib/grade'
import { useApp } from './app-provider'
import { GradeBadge } from './ui/grade-badge'
import { IconInfo } from './ui/icons'
import { Sheet } from './ui/sheet'
import { InfoTip, Tooltip } from './ui/tooltip'
import { Fluent, Num, PlateIcon } from './ui/visual'

/** 남기는 양 4단계: 많이 남길수록 색이 붉어진다 */
const WASTE: { value: number; label: string; tone: Tone }[] = [
  { value: 0, label: '다 먹음', tone: 1 },
  { value: 25, label: '25%', tone: 2 },
  { value: 50, label: '50%', tone: 3 },
  { value: 100, label: '다 남김', tone: 5 },
]
const ACTIVE: Record<Tone, string> = {
  1: 'bg-t1-bar text-white',
  2: 'bg-t2-bar text-[#1f2d06]',
  3: 'bg-t3-bar text-[#2b1a00]',
  4: 'bg-t4-bar text-white',
  5: 'bg-t5-bar text-white',
}

const SRC_NOTE = {
  similar: (base?: string) => `재료표에 없는 새 메뉴라 이름이 비슷한 "${base}"의 재료로 추정했어요.`,
  type: (base?: string) => `재료표에 없는 새 메뉴라 같은 종류의 대표 메뉴("${base}") 재료로 추정했어요.`,
  generic: () => '재료표에 없고 비슷한 메뉴도 찾지 못해 반찬 기본값으로 추정했어요.',
}

export function MenuSheet() {
  const { menu, closeMenu, data } = useApp()
  const info = menu ? data.menus[menu.name] : undefined
  const tone = info ? menuTone(info.kg) : 3
  return (
    <Sheet
      open={Boolean(menu)}
      onClose={closeMenu}
      title={menu?.name ?? ''}
      subtitle={menu ? <MenuSubtitle name={menu.name} /> : null}
      leading={
        menu ? (
          <span
            className="grid size-16 shrink-0 place-items-center rounded-[18px] md:size-[72px]"
            style={{ background: `radial-gradient(circle at 50% 60%, ${TONE_SOFT_VAR[tone]}, var(--surface-2) 80%)` }}
          >
            <Fluent name={foodImage(menu.name)} size={48} className="drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)]" />
          </span>
        ) : null
      }
    >
      {menu && <MenuBody key={`${menu.name}-${menu.day}`} name={menu.name} day={menu.day} />}
    </Sheet>
  )
}

function MenuSubtitle({ name }: { name: string }) {
  const { data } = useApp()
  const info = data.menus[name]
  if (!info) return null
  const tone = menuTone(info.kg)
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <GradeBadge grade={menuGrade(info.kg)} size="sm" tip="메뉴 하나 기준: 0.3kg 미만 낮음, 1kg 이상 높음" />
      <span className="tnum">
        1인분 <b className={`text-body font-bold ${TONE_TEXT[tone]}`}>{formatKg(info.kg)}</b> kgCO₂e · 약 {Math.round(info.kcal)} kcal
      </span>
    </span>
  )
}

function Section({ title, aside, children, tip }: { title: string; aside?: ReactNode; children: ReactNode; tip?: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-body font-semibold">
          {title}
          {tip && <InfoTip label={`${title} 설명`}>{tip}</InfoTip>}
        </h3>
        {aside && <span className="text-cap text-ink-3">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function MenuBody({ name, day }: { name: string; day: string | null }) {
  const { data, allergies, byDay, today, selectDay, closeMenu } = useApp()
  const router = useRouter()
  const info = data.menus[name]
  const [waste, setWaste] = useState(50)

  const allergens = useMemo(() => {
    const d = day ? byDay.get(day) : data.days.find((x) => x.m.some(([n]) => n === name))
    return d?.m.find(([n]) => n === name)?.[1] ?? []
  }, [byDay, data.days, day, name])

  const dates = useMemo(() => data.days.filter((d) => d.m.some(([n]) => n === name)).map((d) => d.d), [data.days, name])
  const upcoming = dates.filter((d) => d >= today && d !== day).slice(0, 4)
  const past = dates.filter((d) => d < today && d !== day)

  if (!info) return <p className="text-body text-ink-2">이 메뉴의 정보를 찾지 못했어요.</p>

  const opt = WASTE.find((w) => w.value === waste) ?? WASTE[2]
  const wasted = (info.kg * waste) / 100
  const all = wasted * GRADE1_STUDENTS
  const km = all / KG_PER_CAR_KM
  // 버려지는 탄소는 남긴 정도의 색(조금=연두, 반=호박, 다=빨강)을 그대로 쓴다
  const wasteTone = opt.tone
  const ing = [...info.ing].sort((a, b) => b[2] - a[2])
  const maxIng = Math.max(...ing.map((x) => x[2]), 0.001)
  const topIng = ing[0]

  const goDay = (d: string) => {
    selectDay(d)
    closeMenu()
    router.push(`/?d=${d}`)
  }

  return (
    <div className="flex flex-col gap-6 pt-1">
      {info.src !== 'table' && (
        <p className="flex gap-2.5 rounded-btn bg-surface-2 p-3.5 text-cap text-ink-2">
          <IconInfo size={18} className="mt-px shrink-0 text-ink-3" />
          <span>{SRC_NOTE[info.src](info.base)} 실제와 다를 수 있어요.</span>
        </p>
      )}

      <Section title="알레르기" tip="나이스 식단에 적힌 알레르기 번호예요. 빨간 칸은 설정에서 고른 내 알레르기예요.">
        {allergens.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {allergens.map((n) => {
              const mine = allergies.includes(n)
              return (
                <li
                  key={n}
                  className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-cap font-semibold ${
                    mine ? 'bg-alert text-white dark:text-[#1a0f0e]' : 'bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]'
                  }`}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-surface">
                    <Fluent name={allergenIcon(n)} size={18} />
                  </span>
                  {mine && <span className="sr-only">내 알레르기: </span>}
                  {allergenName(n)}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-cap text-ink-3">나이스 식단에 표시된 알레르기가 없어요.</p>
        )}
      </Section>

      <section aria-labelledby="ms-waste" className="rounded-card bg-surface-2 p-4 md:p-5">
        <h3 id="ms-waste" className="flex items-center gap-1.5 text-body font-semibold">
          남기면 버려지는 탄소
          <InfoTip label="남김 계산 설명">남긴 만큼의 탄소는 만들고 옮기는 데 이미 나왔지만 아무도 먹지 않은 탄소예요.</InfoTip>
        </h3>
        <div role="radiogroup" aria-label="남기는 양" className="mt-3 grid grid-cols-4 gap-1.5">
          {WASTE.map((w) => {
            const on = w.value === waste
            return (
              <button
                key={w.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setWaste(w.value)}
                className={`press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] text-cap font-semibold transition-colors duration-200 ${
                  on ? `${ACTIVE[w.tone]} shadow-lift` : `bg-surface ${TONE_TEXT[w.tone]} shadow-card hover:bg-surface-3`
                }`}
              >
                <PlateIcon fraction={w.value / 100} size={22} />
                <span className={on ? '' : 'text-ink-2'}>{w.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span key={waste} className={`rise tnum text-h1 font-bold tight ${TONE_TEXT[wasteTone]}`}>
            {formatKg(wasted)}
          </span>
          <span className="text-cap font-semibold text-ink-2">kgCO₂e 버려져요 · 나 혼자</span>
        </div>

        {waste === 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-t1-soft px-3 py-2.5 text-cap font-semibold text-t1">
            <Fluent name="sparkles" size={20} />다 먹으면 버려지는 탄소가 없어요
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <EqTile icon="busts-in-silhouette" label="1학년 모두" value={`${GRADE1_STUDENTS}명`} />
            <Op>×</Op>
            <EqTile icon="wastebasket" label={`${opt.label === '다 남김' ? '다 남기면' : `${opt.label} 남기면`}`} value={`${formatKg(wasted)}kg`} tone={wasteTone} />
            <Op className="max-sm:hidden">=</Op>
            <EqTile icon="cloud" label="학년 전체" value={`${Math.round(all).toLocaleString()}kg`} tone={wasteTone} strong className="max-sm:col-span-3" />
          </div>
        )}
        {waste > 0 && (
          <Tooltip content={`승용차 1km ≈ ${KG_PER_CAR_KM}kgCO₂e로 잡은 대략값이에요.`} className="mt-2 flex">
            <p className="flex w-full items-center gap-2.5 rounded-[14px] bg-surface px-3 py-2.5 text-cap text-ink-2 shadow-card">
              <Fluent name="automobile" size={28} />
              <span>
                승용차로 <Num tone={wasteTone}>{Math.round(km).toLocaleString()}km</Num> 달린 것과 같아요
              </span>
            </p>
          </Tooltip>
        )}
      </section>

      <Section title="재료별 탄소" aside="1인분 추정" tip="메뉴 이름으로 정한 1인분 재료의 양(g)에 재료마다 정해진 배출계수를 곱한 값이에요.">
        {topIng && info.kg > 0 && (
          <p className="mb-2 text-cap text-ink-2">
            <Num tone={menuTone(topIng[2])}>{topIng[0]}</Num>이 이 메뉴 탄소의 <Num tone={menuTone(topIng[2])}>{Math.round((topIng[2] / info.kg) * 100)}%</Num>를 차지해요
          </p>
        )}
        <ul>
          {ing.map(([label, g, kg]) => {
            const t = menuTone(kg)
            return (
              <li key={label} className="border-b border-line py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-medium">
                    {label}
                    <span className="tnum ml-1.5 text-cap text-ink-3">{g}g</span>
                  </span>
                  <span className={`tnum text-body font-bold ${TONE_TEXT[t]}`}>{kg.toFixed(3)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={`grow-x h-full rounded-full ${TONE_BAR[t]}`} style={{ width: `${Math.max((kg / maxIng) * 100, 1.5)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      {info.alt && (
        <Section title={`${info.alt.foods.join('·')}를 두부로 바꾸면`} tip="같은 무게의 두부로 바꾼 가상 계산이에요. 영양과 맛은 따로 따져 봐야 해요.">
          <div className="rounded-card bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-t1-soft px-3 py-1.5 text-cap font-semibold text-t1">
                탄소 <b className="tnum text-title font-bold">-{Math.round(((info.kg - info.alt.kg) / info.kg) * 100)}%</b>
              </span>
              <span className="text-cap text-ink-2">
                <Num tone={menuTone(info.kg - info.alt.kg)}>{formatKg(info.kg - info.alt.kg)}kg</Num> 줄어요
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <CompareBar label="지금" kg={info.kg} max={info.kg} tone={menuTone(info.kg)} />
              <CompareBar label="두부로" kg={info.alt.kg} max={info.kg} tone={menuTone(info.alt.kg)} icon="beans" />
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
            <IconInfo size={14} />
            같은 무게로 바꾼 가상 계산이에요. 영양과 맛은 따로 따져 봐야 해요.
          </p>
        </Section>
      )}

      {(upcoming.length > 0 || past.length > 0) && (
        <Section title={upcoming.length ? '다음에 나오는 날' : '전에 나온 날'} aside={`올해 ${dates.length}번`}>
          <div className="flex flex-wrap gap-1.5">
            {(upcoming.length ? upcoming : past.slice(-4).reverse()).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => goDay(d)}
                className="press min-h-10 rounded-btn border border-line-strong px-3 text-cap font-semibold hover:bg-surface-2"
              >
                {formatMedium(d)}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function EqTile({ icon, label, value, tone, strong = false, className = '' }: {
  icon: string
  label: string
  value: string
  tone?: Tone
  strong?: boolean
  className?: string
}) {
  return (
    <span className={`flex flex-col items-center justify-center gap-1 rounded-[14px] px-2 py-2.5 text-center ${strong ? 'bg-surface shadow-lift' : 'bg-surface shadow-card'} ${className}`}>
      <Fluent name={icon} size={30} />
      <span className="text-[12px] leading-tight text-ink-3">{label}</span>
      <b className={`tnum text-body leading-tight font-bold ${tone ? TONE_TEXT[tone] : 'text-ink'} ${strong ? 'text-title' : ''}`}>{value}</b>
    </span>
  )
}

function Op({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`grid place-items-center text-title font-bold text-ink-3 ${className}`}>{children}</span>
}

function CompareBar({ label, kg, max, tone, icon }: { label: string; kg: number; max: number; tone: Tone; icon?: string }) {
  return (
    <div className="grid grid-cols-[56px_1fr_52px] items-center gap-2.5">
      <span className="flex items-center gap-1 text-cap font-semibold text-ink-2">
        {icon && <Fluent name={icon} size={16} />}
        {label}
      </span>
      <span className="h-3 overflow-hidden rounded-full bg-surface-3">
        <span className={`grow-x block h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max((kg / max) * 100, 2)}%` }} />
      </span>
      <span className={`tnum text-right text-body font-bold ${TONE_TEXT[tone]}`}>{formatKg(kg)}</span>
    </div>
  )
}
