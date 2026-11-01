'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { allergenName } from '@/lib/allergens'
import { formatMedium } from '@/lib/date'
import { GRADE1_STUDENTS, GRADE_BAR, KG_PER_CAR_KM, formatKg, menuGrade } from '@/lib/grade'
import { useApp } from './app-provider'
import { GradeBadge } from './ui/grade-badge'
import { IconArrowRight, IconInfo } from './ui/icons'
import { Segmented } from './ui/segmented'
import { Sheet } from './ui/sheet'

const WASTE = [
  { value: '0', label: '다 먹음' },
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '100', label: '다 남김' },
] as const

const SRC_NOTE = {
  similar: (base?: string) => `재료표에 없는 새 메뉴라 이름이 비슷한 "${base}"의 재료로 추정했어요.`,
  type: (base?: string) => `재료표에 없는 새 메뉴라 같은 종류의 대표 메뉴("${base}") 재료로 추정했어요.`,
  generic: () => '재료표에 없고 비슷한 메뉴도 찾지 못해 반찬 기본값으로 추정했어요.',
}

export function MenuSheet() {
  const { menu, closeMenu } = useApp()
  return (
    <Sheet open={Boolean(menu)} onClose={closeMenu} title={menu?.name ?? ''} subtitle={menu ? <MenuSubtitle name={menu.name} /> : null}>
      {menu && <MenuBody key={`${menu.name}-${menu.day}`} name={menu.name} day={menu.day} />}
    </Sheet>
  )
}

function MenuSubtitle({ name }: { name: string }) {
  const { data } = useApp()
  const info = data.menus[name]
  if (!info) return null
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <GradeBadge grade={menuGrade(info.kg)} size="sm" />
      <span className="tnum">
        1인분 {formatKg(info.kg)} kgCO₂e · 약 {Math.round(info.kcal)} kcal
      </span>
    </span>
  )
}

function MenuBody({ name, day }: { name: string; day: string | null }) {
  const { data, allergies, byDay, today, selectDay, closeMenu } = useApp()
  const router = useRouter()
  const info = data.menus[name]
  const [waste, setWaste] = useState<(typeof WASTE)[number]['value']>('50')

  const allergens = useMemo(() => {
    const d = day ? byDay.get(day) : data.days.find((x) => x.m.some(([n]) => n === name))
    return d?.m.find(([n]) => n === name)?.[1] ?? []
  }, [byDay, data.days, day, name])

  const dates = useMemo(() => data.days.filter((d) => d.m.some(([n]) => n === name)).map((d) => d.d), [data.days, name])
  const upcoming = dates.filter((d) => d >= today && d !== day).slice(0, 4)
  const past = dates.filter((d) => d < today && d !== day)

  if (!info) return <p className="text-body text-ink-2">이 메뉴의 정보를 찾지 못했어요.</p>

  const grade = menuGrade(info.kg)
  const maxIng = Math.max(...info.ing.map((x) => x[2]), 0.001)
  const pct = Number(waste)
  const wasted = (info.kg * pct) / 100
  const all = wasted * GRADE1_STUDENTS

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

      <section aria-labelledby="ms-allergy">
        <h3 id="ms-allergy" className="mb-2.5 text-cap font-semibold text-ink-2">
          알레르기
        </h3>
        {allergens.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {allergens.map((n) => {
              const mine = allergies.includes(n)
              return (
                <li
                  key={n}
                  className={`rounded-chip px-2.5 py-1.5 text-cap font-semibold ${mine ? 'bg-alert-soft text-alert' : 'bg-surface-2 text-ink-2'}`}
                >
                  {mine && <span className="sr-only">내 알레르기: </span>}
                  {allergenName(n)}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-cap text-ink-3">나이스 식단에 표시된 알레르기가 없어요.</p>
        )}
      </section>

      <section aria-labelledby="ms-waste" className="rounded-card bg-surface-2 p-4 md:p-5">
        <h3 id="ms-waste" className="text-body font-semibold">
          남기면 버려지는 탄소
        </h3>
        <Segmented label="남기는 양" value={waste} onChange={setWaste} options={[...WASTE]} className="mt-3" />
        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="tnum text-h1 font-bold tight">{formatKg(wasted)}</span>
          <span className="text-cap font-semibold text-ink-2">kgCO₂e</span>
        </p>
        <p className="mt-1.5 text-cap text-ink-2">
          {pct === 0
            ? '다 먹으면 버려지는 탄소가 없어요.'
            : `1학년 ${GRADE1_STUDENTS}명이 똑같이 남기면 ${Math.round(all).toLocaleString()}kg, 승용차로 약 ${Math.round(all / KG_PER_CAR_KM).toLocaleString()}km를 달린 것과 같아요.`}
        </p>
      </section>

      <section aria-labelledby="ms-ing">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h3 id="ms-ing" className="text-body font-semibold">
            재료별 탄소
          </h3>
          <span className="text-cap text-ink-3">1인분 추정</span>
        </div>
        <ul>
          {[...info.ing]
            .sort((a, b) => b[2] - a[2])
            .map(([label, g, kg]) => (
              <li key={label} className="border-b border-line py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-medium">
                    {label}
                    <span className="tnum ml-1.5 text-cap text-ink-3">{g}g</span>
                  </span>
                  <span className="tnum text-body font-semibold">{kg.toFixed(3)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className={`h-full rounded-full ${GRADE_BAR[grade]}`} style={{ width: `${Math.max((kg / maxIng) * 100, 1.5)}%` }} />
                </div>
              </li>
            ))}
        </ul>
      </section>

      {info.alt && (
        <section aria-labelledby="ms-alt">
          <h3 id="ms-alt" className="text-body font-semibold">
            {info.alt.foods.join('·')}를 두부로 바꾸면
          </h3>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-btn bg-high-soft p-3 text-center">
              <span className="block text-cap text-ink-2">지금</span>
              <span className="tnum mt-0.5 block text-title font-bold text-high">{formatKg(info.kg)}</span>
            </div>
            <IconArrowRight size={18} className="text-ink-3" />
            <div className="rounded-btn bg-low-soft p-3 text-center">
              <span className="block text-cap text-ink-2">바꾸면</span>
              <span className="tnum mt-0.5 block text-title font-bold text-low">{formatKg(info.alt.kg)}</span>
            </div>
          </div>
          <p className="mt-2.5 text-cap text-ink-2">
            탄소가 {Math.round(((info.kg - info.alt.kg) / info.kg) * 100)}% 줄어요. 같은 무게로 바꾼 가상 계산이라 영양과 맛은 따로 따져 봐야 해요.
          </p>
        </section>
      )}

      {(upcoming.length > 0 || past.length > 0) && (
        <section aria-labelledby="ms-dates">
          <h3 id="ms-dates" className="text-body font-semibold">
            {upcoming.length ? '다음에 나오는 날' : '전에 나온 날'}
          </h3>
          <p className="mt-0.5 text-cap text-ink-3">올해 {dates.length}번 나왔어요</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
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
        </section>
      )}

      <p className="text-cap text-ink-3">탄소량은 재료 추정량에 식품별 배출계수를 곱한 값이에요. 메뉴끼리 비교하는 데 쓰세요.</p>
    </div>
  )
}
