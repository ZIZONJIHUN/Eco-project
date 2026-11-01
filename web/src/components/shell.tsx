'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatMedium, mondayOf, schoolWeek } from '@/lib/date'
import { TONE_BAR, TONE_TEXT, dayGrade, dayTone, formatKg, GRADE_LABEL } from '@/lib/grade'
import { useMounted, useOnline } from '@/lib/client/hooks'
import { useInstall } from '@/lib/client/install'
import { useApp } from './app-provider'
import { AppMark } from './app-mark'
import { InstallPanel } from './install/install-panel'
import { LogSheet } from './log-sheet'
import { MenuSheet } from './menu-sheet'
import { Onboarding } from './onboarding'
import { PullToRefresh } from './pull-to-refresh'
import { IconCalendar, IconChart, IconDownload, IconOffline, IconSettings, IconToday, IconTrophy } from './ui/icons'
import { Sheet } from './ui/sheet'
import { Tooltip } from './ui/tooltip'

const NAV = [
  { href: '/', label: '오늘', desc: '오늘 점심 한 끼의 탄소와 메뉴', Icon: IconToday },
  { href: '/meals', label: '식단', desc: '주간·월간 식단과 메뉴 찾기', Icon: IconCalendar },
  { href: '/records', label: '기록', desc: '내가 줄인 탄소와 1학년 순위', Icon: IconTrophy },
  { href: '/insights', label: '분석', desc: '기간 평균, 탄소가 많은 메뉴, 계산 방법', Icon: IconChart },
  { href: '/settings', label: '설정', desc: '내 알레르기, 화면 테마, 앱 설치', Icon: IconSettings },
] as const

const navIndex = (path: string) => {
  const i = NAV.findIndex(({ href }) => (href === '/' ? path === '/' : path.startsWith(href)))
  return i
}

/**
 * 폰: 화면 아래에 떠 있는 탭 4개
 * 태블릿·PC: 왼쪽에 떠 있는 진한 초록 유리판 메뉴 (위쪽·오른쪽 고정 막대는 두지 않는다)
 * 본문은 화면 폭을 꽉 채워 쓰고, 넓어질수록 각 화면이 열을 늘린다.
 */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const online = useOnline()
  const active = navIndex(path)

  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[70] -translate-y-24 rounded-btn bg-ink px-4 py-3 text-cap font-semibold text-bg focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>

      <SideNav active={active} />

      <main id="main" tabIndex={-1} className="ptr-target outline-none md:pl-[112px] lg:pl-[284px]">
        <div className="pb-safe-nav mx-auto w-full max-w-[2400px] px-4 pt-[calc(16px+env(safe-area-inset-top))] sm:px-6 md:px-8 md:pt-10 xl:px-10 2xl:px-12">
          {children}
        </div>
      </main>

      {!online && (
        <div
          role="status"
          className="rise fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-cap font-semibold whitespace-nowrap text-bg shadow-float md:bottom-6 md:left-[calc(50%+56px)] lg:left-[calc(50%+142px)]"
        >
          <IconOffline size={16} />
          오프라인 · 저장된 식단을 보여 줘요
        </div>
      )}

      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[26px] border border-line bg-raised p-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[20px] bg-brand-soft transition-transform duration-[420ms] ease-[var(--ease-spring)]"
          style={{ width: 'calc((100% - 12px) / 5)', transform: `translateX(${Math.max(active, 0) * 100}%)`, opacity: active < 0 ? 0 : 1 }}
        />
        {NAV.map(({ href, label, Icon }, i) => {
          const on = i === active
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={`press relative z-[1] flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[12px] font-semibold transition-colors ${on ? 'text-brand' : 'text-ink-3'}`}
            >
              <Icon size={23} strokeWidth={on ? 2.1 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <PullToRefresh />
      <MenuSheet />
      <LogSheet />
      <Onboarding />
    </>
  )
}

function SideNav({ active }: { active: number }) {
  const panel = useRef<HTMLElement>(null)
  const onMove = (e: RPointerEvent<HTMLElement>) => {
    const r = panel.current?.getBoundingClientRect()
    if (!r) return
    panel.current!.style.setProperty('--mx', `${e.clientX - r.left}px`)
    panel.current!.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <aside
      ref={panel}
      data-theme="dark"
      onPointerMove={onMove}
      aria-label="주 메뉴"
      className="side-panel fixed top-3 bottom-3 left-3 z-30 hidden w-[88px] flex-col overflow-hidden rounded-[28px] px-2.5 pt-[calc(18px+env(safe-area-inset-top))] pb-3 text-white md:flex lg:w-[260px] lg:px-4"
    >
      <Link href="/" className="relative flex items-center justify-center gap-3 rounded-[16px] px-1 py-1 lg:justify-start lg:px-2" aria-label="효명 급식 탄소 홈">
        <AppMark size={42} />
        <span className="hidden leading-tight lg:block">
          <span className="block text-[12px] font-semibold text-white/60">효명고등학교</span>
          <span className="block text-title font-bold tight">급식 탄소</span>
        </span>
      </Link>

      <nav className="relative mt-7 flex flex-col gap-1.5" aria-label="화면">
        <span
          aria-hidden="true"
          className="side-indicator absolute inset-x-0 top-0 h-16 rounded-[18px] lg:h-12 lg:rounded-[16px]"
          style={{ transform: `translateY(calc(${Math.max(active, 0)} * (100% + 6px)))`, opacity: active < 0 ? 0 : 1 }}
        />
        {NAV.map(({ href, label, desc, Icon }, i) => {
          const on = i === active
          return (
            <Tooltip key={href} content={desc} side="right" className="block">
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`group relative z-[1] flex h-16 flex-col items-center justify-center gap-1 rounded-[18px] text-[12px] font-semibold transition-colors lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-[16px] lg:px-3.5 lg:text-body ${
                  on ? 'text-white' : 'text-white/62 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={on ? 2.2 : 1.8}
                  className={`transition-transform duration-200 ease-out group-hover:scale-110 ${on ? 'text-lime' : ''}`}
                />
                {label}
              </Link>
            </Tooltip>
          )
        })}
      </nav>

      <div className="flex-1" />
      <SideToday />
      <SideInstall />
    </aside>
  )
}

/** 사이드 메뉴 아래: 오늘(또는 다음) 점심 탄소와 이번 주 막대 */
function SideToday() {
  const { byDay, data, day, today, pickedDay } = useApp()
  const shown = pickedDay ? today : day
  const meal = byDay.get(shown) ?? byDay.get(day)
  if (!meal) return null
  const tone = dayTone(meal.kg, data.dayBands)
  const week = schoolWeek(mondayOf(meal.d))
  const max = Math.max(...week.map((d) => byDay.get(d)?.kg ?? 0), 1)
  return (
    <Link
      href={`/?d=${meal.d}`}
      className="group relative mb-2 hidden rounded-[20px] bg-white/[0.07] p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-colors hover:bg-white/[0.11] lg:block"
    >
      <span className="flex items-center justify-between text-[12px] font-semibold text-white/60">
        {meal.d === today ? '오늘 점심' : `다음 급식 · ${formatMedium(meal.d)}`}
        <span className={TONE_TEXT[tone]}>{GRADE_LABEL[dayGrade(meal.kg, data.dayBands)]}</span>
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className={`tnum text-h2 font-bold ${TONE_TEXT[tone]}`}>{formatKg(meal.kg)}</span>
        <span className="text-[12px] font-semibold text-white/60">kgCO₂e</span>
      </span>
      <span className="mt-3 flex h-8 items-end gap-1.5" aria-hidden="true">
        {week.map((d) => {
          const m = byDay.get(d)
          return (
            <span
              key={d}
              className={`flex-1 rounded-[4px] ${m ? TONE_BAR[dayTone(m.kg, data.dayBands)] : 'bg-white/10'} ${d === meal.d ? '' : 'opacity-70'}`}
              style={{ height: m ? `${Math.max((m.kg / max) * 100, 12)}%` : '12%' }}
            />
          )
        })}
      </span>
    </Link>
  )
}

function SideInstall() {
  const mounted = useMounted()
  const { installed } = useInstall()
  const [open, setOpen] = useState(false)
  if (!mounted || installed) return null
  return (
    <>
      <Tooltip content="폰에 앱으로 설치하는 QR을 보여 줘요" side="right" className="block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[12px] font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white lg:justify-start lg:px-3.5 lg:text-cap"
        >
          <IconDownload size={20} />
          <span className="hidden lg:inline">폰에 앱 설치</span>
        </button>
      </Tooltip>
      {/* 사이드 메뉴는 어두운 테마라서, 시트는 바깥(body)에 그려 화면 테마를 따르게 한다 */}
      {createPortal(
        <Sheet open={open} onClose={() => setOpen(false)} title="폰에 설치하기" wide>
          <InstallPanel showQr="always" />
        </Sheet>,
        document.body,
      )}
    </>
  )
}
