'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { formatMedium, formatShort } from '@/lib/date'
import { KG_PER_CAR_KM, MENU_BANDS, dayGrade, formatKg, GRADE_BAR } from '@/lib/grade'
import { extremes, groupShares, kcalCheck, mean, monthly, swapPotential, topMenuOf, topMenus } from '@/lib/stats'
import { useApp } from '../app-provider'
import { IconChevronDown } from '../ui/icons'
import { Segmented } from '../ui/segmented'

const card = 'rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] md:p-6'

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

  if (!days.length) {
    return (
      <div className={card}>
        <h1 className="text-h1 font-bold">분석</h1>
        <p className="mt-2 text-body text-ink-2">아직 분석할 급식 정보가 없어요.</p>
      </div>
    )
  }

  const monthMax = Math.max(...months.map((m) => m.avg), avg) * 1.12
  const topMax = top[0]?.kg ?? 1

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <section className="rounded-card bg-brand p-5 text-brand-ink md:col-span-2 md:p-6">
          <h2 className="text-cap font-semibold opacity-80">점심 한 끼 평균</h2>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="tnum text-display font-bold tracking-[-0.04em]">{formatKg(avg)}</span>
            <span className="text-body font-semibold opacity-80">kgCO₂e</span>
          </p>
          <p className="mt-2 text-body opacity-90">
            승용차로 약 {Math.round(avg / KG_PER_CAR_KM)}km를 달릴 때 나오는 양이에요. {days.length}일을 모두 더하면 {Math.round(days.reduce((a, d) => a + d.kg, 0))}kg입니다.
          </p>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-black/15" aria-hidden="true">
            <span className="bg-lime" style={{ width: `${(grades.low / days.length) * 100}%` }} />
            <span className="bg-white/50" style={{ width: `${(grades.mid / days.length) * 100}%` }} />
            <span className="bg-[#ff9a6b]" style={{ width: `${(grades.high / days.length) * 100}%` }} />
          </div>
          <p className="tnum mt-2 text-cap opacity-85">
            낮은 날 {grades.low}일 · 보통 {grades.mid}일 · 높은 날 {grades.high}일
          </p>
        </section>
        {([
          ['가장 높았던 날', high, 'text-high'],
          ['가장 낮았던 날', low, 'text-low'],
        ] as const).map(([label, d, color]) =>
          d ? (
            <button key={label} type="button" onClick={() => openDay(d.d)} className={`${card} press flex flex-col items-start text-left hover:bg-surface-2`}>
              <span className="text-cap font-semibold text-ink-2">{label}</span>
              <span className={`tnum mt-2 text-h2 font-bold ${color}`}>{formatKg(d.kg)}kg</span>
              <span className="mt-1 text-cap text-ink-2">
                {formatMedium(d.d)} · {topMenuOf(d, data.menus).name}
              </span>
              <span className="mt-auto pt-3 text-cap font-semibold text-brand">그날 메뉴 보기</span>
            </button>
          ) : null,
        )}
      </div>

      {/* 두 열을 따로 쌓아 높이가 달라도 빈칸이 생기지 않게 한다 */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="ins-groups" className={card}>
            <h2 id="ins-groups" className="text-title font-bold tight">
              탄소는 어디서 나올까
            </h2>
            <p className="mt-1 text-cap text-ink-2">
              {groups[0] && (
                <>
                  <b className="font-semibold text-ink">{groups[0].label}</b>가 전체의 {Math.round(groups[0].share * 100)}%를 차지해요.
                </>
              )}{' '}
              고기·해산물을 두부로 바꾸면 이론상 {Math.round(swap * 100)}%까지 줄어요.
            </p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
              {groups.map((g, i) => (
                <span
                  key={g.key}
                  className={i === 0 ? 'bg-high-bar' : 'bg-ink'}
                  style={{ width: `${g.share * 100}%`, opacity: i === 0 ? 1 : Math.max(0.12, 0.62 - i * 0.09), marginLeft: i ? 2 : 0 }}
                />
              ))}
            </div>
            <ul className="mt-4">
              {groups.map((g, i) => (
                <li key={g.key} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-[3px] ${i === 0 ? 'bg-high-bar' : 'bg-ink'}`}
                    style={{ opacity: i === 0 ? 1 : Math.max(0.12, 0.62 - i * 0.09) }}
                  />
                  <span className="flex-1 text-body">{g.label}</span>
                  <span className="tnum text-body font-semibold">{Math.round(g.share * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="ins-top" className={card}>
            <h2 id="ins-top" className="text-title font-bold tight">
              탄소가 많은 메뉴
            </h2>
            <p className="mt-1 text-cap text-ink-2">1인분 기준 · 메뉴를 누르면 재료를 볼 수 있어요</p>
            <ol className="mt-3">
              {top.map((t, i) => (
                <li key={t.name}>
                  <button type="button" onClick={() => openMenu(t.name, t.last)} className="press flex w-full items-center gap-3 rounded-[12px] py-2.5 text-left hover:bg-surface-2 md:px-2">
                    <span className="tnum w-6 shrink-0 text-center text-cap font-bold text-ink-3">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold">{t.name}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                        <span className="block h-full rounded-full bg-high-bar" style={{ width: `${(t.kg / topMax) * 100}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-body font-semibold">{formatKg(t.kg)}</span>
                      <span className="tnum block text-[12px] text-ink-3">{t.count}번</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="flex flex-col gap-5">
          <section aria-labelledby="ins-month" className={card}>
            <h2 id="ins-month" className="text-title font-bold tight">
              달마다 한 끼 탄소
            </h2>
            {peak && best && (
              <p className="mt-1 text-cap text-ink-2">
                가장 많았던 달은 <b className="font-semibold text-ink">{Number(peak.month.slice(5))}월</b>({formatKg(peak.avg)}kg), 가장 적었던 달은{' '}
                <b className="font-semibold text-ink">{Number(best.month.slice(5))}월</b>({formatKg(best.avg)}kg)이에요.
              </p>
            )}
            <div className="relative mt-6 flex h-44 items-end gap-2" role="img" aria-label={months.map((m) => `${Number(m.month.slice(5))}월 ${formatKg(m.avg)}kg`).join(', ')}>
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-3/70" style={{ bottom: `${(avg / monthMax) * 100}%` }} />
              {months.map((m) => {
                const few = m.n < 10
                const g = dayGrade(m.avg, data.dayBands)
                return (
                  <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className={`tnum relative z-[1] rounded-[4px] bg-surface px-0.5 text-[11px] font-semibold ${few ? 'text-ink-3' : 'text-ink-2'}`}>{m.avg.toFixed(1)}</span>
                    <span
                      className={`w-full max-w-9 rounded-t-[7px] rounded-b-[3px] ${GRADE_BAR[g]} ${few ? 'opacity-35' : ''} ${m === peak ? 'outline-2 outline-offset-2 outline-high-bar' : ''}`}
                      style={{ height: `${(m.avg / monthMax) * 100}%` }}
                    />
                  </div>
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
            <p className="tnum mt-3 text-[12px] text-ink-3">점선: {days.length}일 평균 {avg.toFixed(2)}kg · 막대는 0부터 그려요</p>
            {months.some((m) => m.n < 10) && (
              <p className="mt-1 text-[12px] text-ink-3">
                흐린 막대는 방학 등으로 급식이 10일 미만인 달이라 비교에서 뺐어요 ({months.filter((m) => m.n < 10).map((m) => `${Number(m.month.slice(5))}월 ${m.n}일`).join(', ')}).
              </p>
            )}
          </section>
          <section aria-labelledby="ins-check" className={card}>
            <h2 id="ins-check" className="text-title font-bold tight">
              재료 추정은 얼마나 맞을까
            </h2>
            <p className="mt-1 text-cap text-ink-2">재료표로 다시 계산한 열량을 나이스 공식 열량과 비교했어요.</p>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-btn bg-surface-2 p-3">
                <dt className="text-[12px] text-ink-2">추정 평균</dt>
                <dd className="tnum mt-1 text-title font-bold">{Math.round(kcal.estimated)}</dd>
              </div>
              <div className="rounded-btn bg-surface-2 p-3">
                <dt className="text-[12px] text-ink-2">공식 평균</dt>
                <dd className="tnum mt-1 text-title font-bold">{Math.round(kcal.official)}</dd>
              </div>
              <div className="rounded-btn bg-surface-2 p-3">
                <dt className="text-[12px] text-ink-2">하루 오차</dt>
                <dd className="tnum mt-1 text-title font-bold">{kcal.errorPct.toFixed(1)}%</dd>
              </div>
            </dl>
            <p className="mt-3 text-cap text-ink-3">열량이 맞아도 고기 종류(소·돼지)는 틀릴 수 있어서, 이 검증은 주로 양을 맞혔는지를 봐요. 단위는 kcal이에요.</p>
          </section>
        </div>
      </div>

      <div id="method" className="scroll-mt-6 flex flex-col gap-3">
        <Disclosure title="계산 방법">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>나이스 교육정보 개방 포털에서 효명고 중식 식단(메뉴, 열량, 영양, 알레르기)을 받아요. 받아 둔 파일에 최신 식단을 6시간마다 더해요.</li>
            <li>메뉴마다 1인분 재료와 양(g)을 정한 재료표가 있어요. 이 표는 Claude(Anthropic)가 메뉴 이름만 보고 한 번 만들어 둔 고정 파일이고, 앱은 AI를 부르지 않아요.</li>
            <li>재료표에 없는 새 메뉴는 이름이 비슷한 메뉴의 재료를 빌리고, 이름에 고기·해산물이 적혀 있으면 그 종류로 바꿔요. 재료표의 메뉴를 하나씩 빼고 시험해 보니 등급이 맞는 비율은 약 80%였어요.</li>
            <li>재료마다 배출계수(kgCO₂e/kg)를 곱해 더해요. 국내 육류는 기후솔루션, 나머지는 Poore &amp; Nemecek(2018) 값이에요. 국내외 계수가 섞여 있어 절댓값보다 메뉴끼리의 비교에 의미가 있어요.</li>
            <li>
              하루 등급은 이 학교 급식 분포로 나눠요. 하위 30%({data.dayBands.low}kg 미만)는 낮음, 상위 30%({data.dayBands.high}kg 이상)는 높음이에요. 메뉴 하나는 {MENU_BANDS.low}kg 미만 낮음, {MENU_BANDS.high}kg 이상 높음이에요.
            </li>
            <li>승용차 거리는 1km당 {KG_PER_CAR_KM}kgCO₂e로 잡은 대략값이에요.</li>
          </ul>
        </Disclosure>
        <Disclosure title="출처">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              나이스 교육정보 개방 포털 급식식단정보 (
              <a className="underline underline-offset-2" href="https://open.neis.go.kr/" target="_blank" rel="noreferrer">
                open.neis.go.kr
              </a>
              ) · 경기도교육청 J10, 효명고 7530601
            </li>
            <li>재료표: Claude(Anthropic)가 메뉴 이름만 보고 추정한 1인분 재료와 양 (저장소 data/recipes-claude.tsv)</li>
            <li>
              기후솔루션, 국내 주요 육류 탄소발자국 보고서 (
              <a className="underline underline-offset-2" href="https://forourclimate.org/ko/newsroom/1204" target="_blank" rel="noreferrer">
                forourclimate.org
              </a>
              )
            </li>
            <li>Poore, J., &amp; Nemecek, T. (2018). Reducing food&apos;s environmental impacts through producers and consumers. Science, 360(6392), 987–992.</li>
            <li>Aslan, M. K., Heijungs, R., &amp; Ilievski, F. (2025). The Carbon Footprint Wizard. arXiv:2509.07733</li>
          </ul>
        </Disclosure>
      </div>
      <p className="text-center text-[12px] text-ink-3">
        기간 {formatShort(days[0].d)} ~ {formatShort(days.at(-1)!.d)} · 효명고 1학년 환경 + 진로 탐구 프로젝트
      </p>
    </div>
  )
}

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-card bg-surface shadow-[0_0_0_1px_var(--line)]">
      <summary className="press flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-body font-semibold md:px-6 [&::-webkit-details-marker]:hidden">
        {title}
        <IconChevronDown size={18} className="text-ink-3 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 text-cap leading-relaxed text-ink-2 md:px-6">{children}</div>
    </details>
  )
}
