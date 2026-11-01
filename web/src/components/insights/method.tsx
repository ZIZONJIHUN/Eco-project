'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { FOODS, type FoodKey } from '@/lib/carbon/foods'
import { KG_PER_CAR_KM, MENU_BANDS, TONE_BAR, TONE_TEXT, dayCuts, formatKg, menuTone, type Tone } from '@/lib/grade'
import type { Dataset, MenuInfo } from '@/lib/types'
import { InfoTip } from '../ui/tooltip'
import { Fluent, FoodImg, Num } from '../ui/visual'

/** 화면에 들어오면 한 번 true */
function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen]
}

/** 0 에서 목표까지 숫자가 올라간다 */
function useCountUp(target: number, run: boolean, ms = 900): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    // 움직임을 줄인 설정이면 바로 끝값으로 (애니메이션 시간 0)
    const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = dur ? Math.min((t - t0) / dur, 1) : 1
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return v
}

const STEPS: { icon: string; title: string; body: ReactNode; badge?: string; tip?: string }[] = [
  { icon: 'school', title: '나이스 식단 받기', body: '효명고 점심 메뉴 · 열량 · 영양 · 알레르기', badge: '6시간마다 새로' },
  {
    icon: 'clipboard',
    title: '1인분 재료 찾기',
    body: '메뉴마다 재료와 양(g)을 정한 재료표',
    badge: '앱은 AI를 부르지 않아요',
    tip: '재료표는 Claude(Anthropic)가 메뉴 이름만 보고 한 번 만들어 둔 고정 파일이에요. 표에 없는 새 메뉴는 이름이 비슷한 메뉴의 재료를 빌려요(시험해 보니 등급 일치 약 80%).',
  },
  { icon: 'balance-scale', title: '배출계수 곱하기', body: '재료 무게(kg) × 1kg당 탄소(kgCO₂e)', tip: '국내 육류는 기후솔루션, 나머지 식품은 Poore & Nemecek(2018) 값을 써요.' },
  { icon: 'abacus', title: '모두 더하기', body: '재료 → 메뉴 → 한 끼 합계' },
  { icon: 'bar-chart', title: '등급으로 나누기', body: '이 학교 급식 분포로 낮음 · 보통 · 높음' },
]

/** 계산 순서를 그림과 움직이는 화살표로 */
function Flow() {
  const [ref, seen] = useInView<HTMLOListElement>()
  return (
    <ol ref={ref} className="grid gap-3 lg:grid-cols-5 lg:gap-0">
      {STEPS.map((s, i) => (
        <li
          key={s.title}
          className={`relative flex gap-4 transition-all duration-500 ease-out lg:flex-col lg:items-center lg:px-2 lg:text-center ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
          style={{ transitionDelay: `${i * 120}ms` }}
        >
          {/* 다음 단계로 이어지는 선과 그 위를 흐르는 점 */}
          {i < STEPS.length - 1 && (
            <>
              <span aria-hidden="true" className="absolute top-14 bottom-[-12px] left-[27px] w-[2px] overflow-hidden rounded-full bg-line-strong lg:top-[27px] lg:right-[-50%] lg:bottom-auto lg:left-[50%] lg:h-[2px] lg:w-auto">
                <span className="absolute inset-0 hidden lg:block" style={{ animation: 'flow-x 1.8s ease-in-out infinite', animationDelay: `${i * 0.36}s` }}>
                  <span className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-brand" />
                </span>
                <span className="absolute inset-0 lg:hidden" style={{ animation: 'flow-y 1.8s ease-in-out infinite', animationDelay: `${i * 0.36}s` }}>
                  <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-brand" />
                </span>
              </span>
            </>
          )}
          <span className="relative z-[1] grid size-14 shrink-0 place-items-center rounded-[18px] bg-surface shadow-lift">
            <Fluent name={s.icon} size={34} />
            <span className="tnum absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">{i + 1}</span>
          </span>
          <span className="min-w-0 pb-2 lg:mt-3">
            <span className="flex items-center gap-1 text-body font-semibold lg:justify-center">
              {s.title}
              {s.tip && <InfoTip label={`${s.title} 설명`}>{s.tip}</InfoTip>}
            </span>
            <span className="block text-cap text-ink-2">{s.body}</span>
            {s.badge && <span className="mt-1.5 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{s.badge}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** 실제 메뉴 하나로 계산을 따라가 보기: 막대가 자라고 합계가 올라간다 */
function Worked({ name, info }: { name: string; info: MenuInfo }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  const total = useCountUp(info.kg, seen)
  const rows = [...info.ing].sort((a, b) => b[2] - a[2]).slice(0, 5)
  const max = Math.max(...rows.map((r) => r[2]), 0.001)
  const factorOf = (label: string) => Object.values(FOODS).find((f) => f.label === label)?.factor ?? 0
  const tone = menuTone(info.kg)
  return (
    <div ref={ref} className="rounded-card bg-surface-2 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-[14px] bg-surface shadow-card">
          <FoodImg name={name} size={34} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink-3">예시로 따라가 보기</p>
          <p className="truncate text-body font-bold">{name} 1인분</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(([label, g, kg], i) => {
          const t = menuTone(kg)
          return (
            <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="truncate text-cap text-ink-2">
                <b className="font-semibold text-ink">{label}</b> <span className="tnum">{g}g</span> × <span className="tnum">{factorOf(label)}</span>
              </span>
              <span className={`tnum text-cap font-bold ${TONE_TEXT[t]}`}>= {kg.toFixed(2)}kg</span>
              <span className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <span
                  className={`block h-full origin-left rounded-full ${TONE_BAR[t]} transition-transform duration-700 ease-out`}
                  style={{ width: `${Math.max((kg / max) * 100, 2)}%`, transform: `scaleX(${seen ? 1 : 0})`, transitionDelay: `${i * 110}ms` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-cap font-semibold text-ink-2">한 메뉴 합계</span>
        <span className={`tnum text-h2 font-bold ${TONE_TEXT[tone]}`}>
          {total.toFixed(2)}
          <small className="ml-0.5 text-cap text-ink-3">kgCO₂e</small>
        </span>
      </div>
    </div>
  )
}

/** 등급 기준을 막대 위에 표시 */
function Scale({ data }: { data: Dataset }) {
  const cuts = dayCuts(data.dayBands)
  const max = Math.max(...data.days.map((d) => d.kg), cuts[3] + 1)
  const tones: [number, number, Tone][] = [
    [0, cuts[0], 1],
    [cuts[0], cuts[1], 2],
    [cuts[1], cuts[2], 3],
    [cuts[2], cuts[3], 4],
    [cuts[3], max, 5],
  ]
  return (
    <div className="rounded-card bg-surface-2 p-4 md:p-5">
      <p className="text-body font-bold">하루 등급은 이렇게 나눠요</p>
      <p className="mt-0.5 text-cap text-ink-2">
        이 학교 급식 {data.days.length}일 중 하위 <Num tone={1}>30%</Num>는 낮음, 상위 <Num tone={4}>30%</Num>는 높음
      </p>
      <div className="relative mt-8 flex h-4 gap-[2px]">
        {tones.map(([a, b, t]) => (
          <span key={t} className={`h-full rounded-[4px] ${TONE_BAR[t]}`} style={{ width: `${((b - a) / max) * 100}%` }} />
        ))}
        {/* 두 경계선의 숫자가 겹치지 않게 낮음 경계는 선의 왼쪽, 높음 경계는 오른쪽에 쓴다 */}
        {[data.dayBands.low, data.dayBands.high].map((v, i) => (
          <span key={v} className="absolute -top-2 bottom-[-8px] w-[2px] -translate-x-1/2 rounded-full bg-ink" style={{ left: `${(v / max) * 100}%` }}>
            <span className={`tnum absolute -top-5 text-[12px] font-bold whitespace-nowrap ${i ? 'left-1 text-t4' : 'right-1 text-t1'}`}>{v}kg</span>
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 text-center text-[12px] font-bold">
        <span className="text-t1">낮음</span>
        <span className="text-t3">보통</span>
        <span className="text-t4">높음</span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-cap text-ink-2">
        <Fluent name="fork-and-knife-with-plate" size={22} />
        메뉴 하나는 <Num tone={1}>{MENU_BANDS.low}kg</Num> 미만 낮음 · <Num tone={4}>{MENU_BANDS.high}kg</Num> 이상 높음
      </p>
    </div>
  )
}

export function MethodSection({ data, example }: { data: Dataset; example: string | null }) {
  const info = example ? data.menus[example] : null
  return (
    <section id="method" aria-labelledby="method-title" className="scroll-mt-6 rounded-card bg-surface p-5 shadow-card md:p-7">
      <div className="flex items-center gap-3">
        <Fluent name="light-bulb" size={40} />
        <div>
          <h2 id="method-title" className="text-h2 font-bold tight">
            탄소는 이렇게 계산해요
          </h2>
          <p className="mt-0.5 text-cap text-ink-2">국내외 배출계수가 섞여 있어 절댓값보다 메뉴끼리 비교하는 데 의미가 있어요</p>
        </div>
      </div>
      <div className="mt-6">
        <Flow />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {info && example ? <Worked name={example} info={info} /> : null}
        <Scale data={data} />
        <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 md:p-5">
          <p className="text-body font-bold">어떤 계수를 쓰나요?</p>
          <FactorRow icon="cut-of-meat" label="쇠고기" k="beef" />
          <FactorRow icon="meat-on-bone" label="돼지고기" k="pork" />
          <FactorRow icon="poultry-leg" label="닭고기" k="chicken" />
          <FactorRow icon="cooked-rice" label="쌀" k="rice" />
          <FactorRow icon="leafy-green" label="채소" k="veg" />
          <p className="mt-1 flex items-center gap-2 border-t border-line pt-3 text-cap text-ink-2">
            <Fluent name="automobile" size={24} />
            승용차 1km ≈ <Num>{KG_PER_CAR_KM}kg</Num> 로 잡은 대략값
          </p>
        </div>
      </div>
    </section>
  )
}

function FactorRow({ icon, label, k }: { icon: string; label: string; k: FoodKey }) {
  const f = FOODS[k]
  const max = FOODS.beef.factor
  const tone = menuTone(f.factor / 10)
  return (
    <div className="grid grid-cols-[22px_56px_minmax(0,1fr)_56px] items-center gap-2">
      <Fluent name={icon} size={22} />
      <span className="text-cap font-semibold">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-3">
        <span className={`block h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max((f.factor / max) * 100, 2)}%` }} />
      </span>
      <span className={`tnum text-right text-cap font-bold ${TONE_TEXT[tone]}`}>{formatKg(f.factor, f.factor < 10 ? 2 : 1)}</span>
    </div>
  )
}

const SOURCES = [
  { tag: '급식 데이터', icon: 'school', title: '나이스 교육정보 개방 포털 급식식단정보', detail: '경기도교육청 J10 · 효명고 7530601 · 중식', url: 'https://open.neis.go.kr/' },
  {
    tag: '재료표',
    icon: 'clipboard',
    title: '메뉴별 1인분 재료와 양',
    detail: 'Claude(Anthropic)가 메뉴 이름만 보고 한 번 추정한 고정 표',
    url: 'https://github.com/ZIZONJIHUN/Eco-project/blob/main/data/recipes-claude.tsv',
  },
  { tag: '배출계수 · 국내 육류', icon: 'cow-face', title: '국내 주요 육류 탄소발자국 보고서', detail: '기후솔루션 · 원문 수치 재확인 필요', url: 'https://forourclimate.org/ko/newsroom/1204' },
  {
    tag: '배출계수 · 그 밖의 식품',
    icon: 'books',
    title: "Reducing food's environmental impacts through producers and consumers",
    detail: 'Poore, J. & Nemecek, T. (2018) · Science 360(6392), 987–992',
    url: 'https://doi.org/10.1126/science.aaq0216',
  },
  { tag: '참고 논문', icon: 'page-facing-up', title: 'The Carbon Footprint Wizard', detail: 'Aslan, Heijungs & Ilievski (2025) · arXiv:2509.07733', url: 'https://arxiv.org/abs/2509.07733' },
  { tag: '그림', icon: 'sparkles', title: 'Microsoft Fluent Emoji (3D)', detail: 'MIT License · 음식·알레르기 그림', url: 'https://github.com/microsoft/fluentui-emoji' },
]

export function SourcesSection() {
  return (
    <section aria-labelledby="sources-title">
      <h2 id="sources-title" className="mb-3 flex items-center gap-2 text-title font-bold tight">
        <Fluent name="bookmark-tabs" size={28} />
        출처
      </h2>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SOURCES.map((s) => (
          <li key={s.title}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full items-start gap-3 rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-2">
                <Fluent name={s.icon} size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{s.tag}</span>
                <span className="mt-1 block text-body leading-snug font-semibold group-hover:underline">{s.title}</span>
                <span className="mt-0.5 block text-cap text-ink-3">{s.detail}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">
                <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">(새 창)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
