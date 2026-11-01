'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { formatMedium, formatShort } from '@/lib/date'
import { KG_PER_CAR_KM, TONE_BAR, TONE_TEXT, dayGrade, dayTone, formatKg, menuTone } from '@/lib/grade'
import { extremes, groupShares, kcalCheck, mean, monthly, swapPotential, topMenuOf, topMenus } from '@/lib/stats'
import { useApp } from '../app-provider'
import { Segmented } from '../ui/segmented'
import { InfoTip, Tooltip } from '../ui/tooltip'
import { Fluent, FoodImg, Num } from '../ui/visual'
import { MethodSection, SourcesSection } from './method'

const card = 'rounded-card bg-surface p-5 shadow-card md:p-6'
const GROUP_ICON: Record<string, string> = {
  beef: 'cow-face',
  meat: 'meat-on-bone',
  seafood: 'fish',
  rice: 'cooked-rice',
  dairy: 'glass-of-milk',
  grain: 'bread',
  plant: 'leafy-green',
  seasoning: 'canned-food',
}

export function InsightsScreen() {
  const { data, openMenu, selectDay, today } = useApp()
  const router = useRouter()
  const openDay = (d: string) => {
    selectDay(d === today ? null : d)
    router.push(d === today ? '/' : `/?d=${d}`)
  }
  const years = useMemo(() => [...new Set(data.days.map((d) => d.d.slice(0, 4)))], [data.days])
  const [year, setYear] = useState(() => years.at(-1) ?? '')
  const days = useMemo(() => data.days.filter((d) => d.d.startsWith(year)), [data.days, year])

  const avg = mean(days.map((d) => d.kg))
  const { high, low } = extremes(days)
  const months = monthly(days)
  const groups = groupShares(days, data.menus)
  const top = topMenus(days, data.menus)
  const swap = swapPotential(days, data.menus)
  const kcal = kcalCheck(days)
  const full = months.filter((m) => m.n >= 10)
  const peak = full.length ? full.reduce((a, b) => (a.avg > b.avg ? a : b)) : null
  const best = full.length ? full.reduce((a, b) => (a.avg < b.avg ? a : b)) : null
  const grades = { low: 0, mid: 0, high: 0 }
  for (const d of days) grades[dayGrade(d.kg, data.dayBands)]++
  // 계산 예시: 가장 최근 급식의 탄소 1위 메뉴
  const recent = [...days].reverse().find((d) => d.d <= today) ?? days.at(-1)
  const example = recent ? topMenuOf(recent, data.menus).name : null

  if (!days.length) {
    return (
      <div className={card}>
        <h1 className="text-h1 font-bold">분석</h1>
        <p className="mt-2 text-body text-ink-2">아직 분석할 급식 정보가 없어요.</p>
      </div>
    )
  }

  const avgTone = dayTone(avg, data.dayBands)
  const monthMax = Math.max(...months.map((m) => m.avg), avg) * 1.15
  const topMax = top[0]?.kg ?? 1
  const totalKg = days.reduce((a, d) => a + d.kg, 0)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tight">분석</h1>
          <p className="tnum mt-1 text-cap text-ink-2">
            {formatMedium(days[0].d)} ~ {formatMedium(days.at(-1)!.d)} · 급식 {days.length}일
          </p>
        </div>
        {years.length > 1 && (
          <Segmented label="연도" value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: `${y}년` }))} className="min-w-[180px]" />
        )}
      </header>

      {/* 주 지표 하나 + 보조 셋 */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <section
          className="relative overflow-hidden rounded-card p-5 text-white shadow-lift md:col-span-3 md:p-6 xl:col-span-1"
          style={{ background: 'linear-gradient(140deg, #1f7556 0%, #155a42 45%, #0e3a2b 100%)' }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[#c9ee7a]/25 blur-3xl" />
          <h2 className="relative text-cap font-semibold text-white/75">점심 한 끼 평균</h2>
          <p className="relative mt-2 flex items-baseline gap-2">
            <span className="tnum text-display font-bold tracking-[-0.04em] text-[#d8f59a]">{formatKg(avg)}</span>
            <span className="text-body font-semibold text-white/70">kgCO₂e</span>
          </p>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-cap">
              <Fluent name="automobile" size={20} />
              승용차 <b className="tnum font-bold">{Math.round(avg / KG_PER_CAR_KM)}km</b>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-cap">
              <Fluent name="cloud" size={20} />
              {days.length}일 합계 <b className="tnum font-bold">{Math.round(totalKg)}kg</b>
            </span>
          </div>
          <div className="relative mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
            <span className="rounded-l-full bg-[#8fe0b4]" style={{ width: `${(grades.low / days.length) * 100}%` }} />
            <span className="bg-[#f3cd73]" style={{ width: `${(grades.mid / days.length) * 100}%` }} />
            <span className="rounded-r-full bg-[#ff9a6b]" style={{ width: `${(grades.high / days.length) * 100}%` }} />
          </div>
          <p className="tnum relative mt-2 flex flex-wrap gap-x-3 text-cap text-white/85">
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-[#8fe0b4]" />낮은 날 <b>{grades.low}</b>
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-[#f3cd73]" />보통 <b>{grades.mid}</b>
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-[#ff9a6b]" />높은 날 <b>{grades.high}</b>
            </span>
          </p>
        </section>
        {([
          ['가장 높았던 날', high, 'fire'],
          ['가장 낮았던 날', low, 'herb'],
        ] as const).map(([label, d, icon]) =>
          d ? (
            <button key={label} type="button" onClick={() => openDay(d.d)} className={`${card} press group flex flex-col items-start text-left transition-shadow hover:shadow-lift`}>
              <span className="flex w-full items-center justify-between text-cap font-semibold text-ink-2">
                {label}
                <Fluent name={icon} size={24} />
              </span>
              <span className={`tnum mt-2 text-h1 font-bold ${TONE_TEXT[dayTone(d.kg, data.dayBands)]}`}>
                {formatKg(d.kg)}
                <small className="ml-0.5 text-cap text-ink-3">kg</small>
              </span>
              <span className="mt-2 flex items-center gap-2 text-cap text-ink-2">
                <FoodImg name={topMenuOf(d, data.menus).name} size={22} />
                <span className="min-w-0">
                  {formatMedium(d.d)} · <b className="font-semibold text-ink">{topMenuOf(d, data.menus).name}</b>
                </span>
              </span>
              <span className="mt-auto pt-3 text-cap font-semibold text-brand group-hover:underline">그날 메뉴 보기 →</span>
            </button>
          ) : null,
        )}
        <section className={`${card} flex flex-col`}>
          <span className="flex items-center justify-between text-cap font-semibold text-ink-2">
            두부로 바꾸면
            <InfoTip label="두부로 바꾸면 설명">쇠고기·돼지고기·새우·생선이 든 1kg 넘는 메뉴를 같은 무게의 두부로 바꾼 가상 계산이에요.</InfoTip>
          </span>
          <span className="tnum mt-2 text-h1 font-bold text-t1">-{Math.round(swap * 100)}%</span>
          <span className="mt-2 flex items-center gap-2 text-cap text-ink-2">
            <Fluent name="beans" size={22} />
            고기·해산물을 두부로 바꾸면 이론상 이만큼 줄어요
          </span>
        </section>
      </div>

      {/* 넓을수록 단이 늘어나는 다단 배치: 카드 높이가 달라도 빈칸이 생기지 않는다 */}
      <div className="columns-1 gap-5 lg:columns-2 3xl:columns-3">
        <section aria-labelledby="ins-groups" className={`${card} mb-5 break-inside-avoid`}>
          <h2 id="ins-groups" className="flex items-center gap-1.5 text-title font-bold tight">
            탄소는 어디서 나올까
            <InfoTip label="식품 분류 설명">{days.length}일 동안 나온 모든 메뉴의 재료를 분류별로 더했어요.</InfoTip>
          </h2>
          {groups[0] && (
            <p className="mt-1 text-cap text-ink-2">
              <Num tone={4}>{groups[0].label}</Num>에서 전체의 <Num tone={4}>{Math.round(groups[0].share * 100)}%</Num>가 나와요
            </p>
          )}
          <div className="mt-4 flex h-4 overflow-hidden rounded-full" aria-hidden="true">
            {groups.map((g, i) => (
              <span
                key={g.key}
                className={`grow-x ${i === 0 ? 'bg-t4-bar' : i === 1 ? 'bg-t3-bar' : 'bg-ink'}`}
                style={{ width: `${g.share * 100}%`, opacity: i < 2 ? 1 : Math.max(0.12, 0.55 - (i - 2) * 0.08), marginLeft: i ? 2 : 0 }}
              />
            ))}
          </div>
          <ul className="mt-4">
            {groups.map((g, i) => (
              <li key={g.key} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                <Fluent name={GROUP_ICON[g.key] ?? 'fork-and-knife-with-plate'} size={26} />
                <span className="flex-1 text-body">{g.label}</span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface-3 sm:block" aria-hidden="true">
                  <span className={`block h-full rounded-full ${i === 0 ? 'bg-t4-bar' : i === 1 ? 'bg-t3-bar' : 'bg-ink-3'}`} style={{ width: `${(g.share / groups[0].share) * 100}%` }} />
                </span>
                <span className={`tnum w-12 text-right text-body font-bold ${i === 0 ? 'text-t4' : i === 1 ? 'text-t3' : ''}`}>{Math.round(g.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ins-month" className={`${card} mb-5 break-inside-avoid`}>
          <h2 id="ins-month" className="flex items-center gap-1.5 text-title font-bold tight">
            달마다 한 끼 탄소
            <InfoTip label="달별 막대 설명">달마다 급식날의 한 끼 평균이에요. 막대는 0부터 그렸고, 점선은 전체 평균이에요.</InfoTip>
          </h2>
          {peak && best && (
            <p className="mt-1 text-cap text-ink-2">
              가장 많았던 달은 <Num tone={dayTone(peak.avg, data.dayBands)}>{Number(peak.month.slice(5))}월 {formatKg(peak.avg)}kg</Num>, 가장 적었던 달은{' '}
              <Num tone={dayTone(best.avg, data.dayBands)}>{Number(best.month.slice(5))}월 {formatKg(best.avg)}kg</Num>
            </p>
          )}
          <div className="relative mt-6 flex h-48 items-end gap-2">
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink-3/50" style={{ bottom: `${(avg / monthMax) * 100}%` }} />
            {months.map((m) => {
              const few = m.n < 10
              const tone = dayTone(m.avg, data.dayBands)
              return (
                <Tooltip key={m.month} content={`${Number(m.month.slice(5))}월 · 한 끼 평균 ${formatKg(m.avg)}kg · 급식 ${m.n}일`} className="flex h-full min-w-0 flex-1">
                  <span className="flex h-full w-full flex-col items-center justify-end gap-1">
                    <span className={`tnum relative z-[1] rounded-[4px] bg-surface px-0.5 text-[11px] font-bold ${few ? 'text-ink-3' : TONE_TEXT[tone]}`}>{m.avg.toFixed(1)}</span>
                    <span
                      className={`w-full max-w-10 rounded-t-[8px] rounded-b-[3px] ${TONE_BAR[tone]} ${few ? 'opacity-30' : ''} ${m === peak ? 'outline-2 outline-offset-2 outline-t4' : ''}`}
                      style={{ height: `${(m.avg / monthMax) * 100}%` }}
                    />
                  </span>
                </Tooltip>
              )
            })}
          </div>
          <div className="mt-2 flex gap-2 text-center text-[12px] text-ink-3">
            {months.map((m) => (
              <span key={m.month} className="min-w-0 flex-1">
                {Number(m.month.slice(5))}월
              </span>
            ))}
          </div>
          <p className="tnum mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
            <span className="inline-block w-4 border-t-2 border-dashed border-ink-3" aria-hidden="true" />
            {days.length}일 평균 <b className={`font-semibold ${TONE_TEXT[avgTone]}`}>{avg.toFixed(2)}kg</b>
            {months.some((m) => m.n < 10) && <> · 흐린 막대는 급식 10일 미만(방학)이라 비교에서 뺐어요</>}
          </p>
        </section>

        <section aria-labelledby="ins-top" className={`${card} mb-5 break-inside-avoid`}>
          <h2 id="ins-top" className="flex items-center gap-1.5 text-title font-bold tight">
            탄소가 많은 메뉴
            <InfoTip label="탄소가 많은 메뉴 설명">1인분 기준이에요. 메뉴를 누르면 재료별 탄소를 볼 수 있어요.</InfoTip>
          </h2>
          <ol className="mt-3">
            {top.map((t, i) => {
              const tone = menuTone(t.kg)
              return (
                <li key={t.name}>
                  <button type="button" onClick={() => openMenu(t.name, t.last)} className="press flex w-full items-center gap-3 rounded-[14px] py-2 text-left hover:bg-surface-2 md:px-2">
                    <span className="grid w-6 shrink-0 place-items-center">
                      {i < 3 ? <Fluent name={['1st-place-medal', '2nd-place-medal', '3rd-place-medal'][i]} size={22} /> : <span className="tnum text-cap font-bold text-ink-3">{i + 1}</span>}
                    </span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">
                      <FoodImg name={t.name} size={28} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold">{t.name}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                        <span className={`block h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${(t.kg / topMax) * 100}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`tnum block text-body font-bold ${TONE_TEXT[tone]}`}>{formatKg(t.kg)}</span>
                      <span className="tnum block text-[12px] text-ink-3">{t.count}번</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        <section aria-labelledby="ins-check" className={`${card} mb-5 break-inside-avoid`}>
          <h2 id="ins-check" className="flex items-center gap-1.5 text-title font-bold tight">
            재료 추정은 얼마나 맞을까
            <InfoTip label="추정 검증 설명">재료표로 다시 계산한 열량을 학교가 올린 공식 열량과 비교했어요. 열량이 맞아도 고기 종류는 틀릴 수 있어 양을 맞혔는지를 주로 봐요.</InfoTip>
          </h2>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Kcal label="재료표 추정" value={kcal.estimated} icon="clipboard" />
            <span className="text-title font-bold text-ink-3">vs</span>
            <Kcal label="나이스 공식" value={kcal.official} icon="school" />
          </div>
          <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-surface-2 px-3 py-2.5 text-cap text-ink-2">
            <Fluent name="bullseye" size={22} />
            하루 평균 오차 <Num tone={kcal.errorPct < 15 ? 1 : kcal.errorPct < 25 ? 3 : 4}>{kcal.errorPct.toFixed(1)}%</Num> ({kcal.n}일 비교)
          </p>
        </section>
      </div>

      <MethodSection data={data} example={example} />
      <SourcesSection />

      <footer className="flex flex-col items-center gap-1 pt-2 text-center text-[12px] text-ink-3">
        <span className="tnum">
          기간 {formatShort(days[0].d)} ~ {formatShort(days.at(-1)!.d)} · 효명고 1학년 <b className="font-semibold text-ink-2">임지훈</b> · 환경 + 진로 탐구 프로젝트
        </span>
      </footer>
    </div>
  )
}

function Kcal({ label, value, icon }: { label: string; value: number; icon: string }): ReactNode {
  return (
    <div className="flex flex-col items-center rounded-[16px] bg-surface-2 p-3 text-center">
      <Fluent name={icon} size={28} />
      <span className="mt-1 text-[12px] text-ink-3">{label}</span>
      <span className="tnum text-h2 font-bold">
        {Math.round(value)}
        <small className="ml-0.5 text-[12px] text-ink-3">kcal</small>
      </span>
    </div>
  )
}
