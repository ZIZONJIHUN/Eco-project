'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useOnline } from '@/lib/client/hooks'
import { AppMark } from './app-mark'
import { MenuSheet } from './menu-sheet'
import { IconCalendar, IconChart, IconOffline, IconSettings, IconToday } from './ui/icons'

const NAV = [
  { href: '/', label: '오늘', Icon: IconToday },
  { href: '/meals', label: '식단', Icon: IconCalendar },
  { href: '/insights', label: '분석', Icon: IconChart },
  { href: '/settings', label: '설정', Icon: IconSettings },
] as const

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

/**
 * 폰: 화면 아래에 떠 있는 탭 4개
 * 태블릿: 왼쪽 아이콘 줄 / PC: 왼쪽 이름까지 보이는 목록
 * 위쪽·오른쪽에는 고정 막대를 두지 않는다. 왼쪽 목록도 바탕색과 같아 띠처럼 보이지 않는다.
 */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const online = useOnline()

  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[70] -translate-y-24 rounded-btn bg-ink px-4 py-3 text-cap font-semibold text-bg focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>

      <nav
        aria-label="주 메뉴"
        className="fixed top-0 bottom-0 left-0 z-30 hidden w-[96px] flex-col items-stretch gap-1 px-3 pt-[calc(28px+env(safe-area-inset-top))] md:flex lg:w-[240px] lg:px-5"
      >
        <Link href="/" className="mb-6 flex items-center justify-center gap-3 rounded-btn px-1 py-1 lg:justify-start lg:px-3" aria-label="효명 급식 탄소 홈">
          <AppMark size={40} />
          <span className="hidden leading-tight lg:block">
            <span className="block text-[12px] font-semibold text-ink-3">효명고등학교</span>
            <span className="block text-body font-bold tight">급식 탄소</span>
          </span>
        </Link>
        {NAV.map(({ href, label, Icon }) => {
          const on = isActive(path, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={`press flex flex-col items-center gap-1 rounded-[16px] px-2 py-2.5 text-[12px] font-semibold transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-body ${
                on ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:bg-surface-2' : 'text-ink-2 hover:bg-surface/60 hover:text-ink dark:hover:bg-surface'
              }`}
            >
              <Icon size={24} strokeWidth={on ? 2.1 : 1.8} className={on ? 'text-brand' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      <main id="main" tabIndex={-1} className="outline-none md:pl-[96px] lg:pl-[240px]">
        <div className="pb-safe-nav mx-auto w-full max-w-[1160px] 2xl:max-w-[1320px] px-5 pt-[calc(16px+env(safe-area-inset-top))] sm:px-6 md:px-10 md:pt-12 lg:px-12">
          {children}
        </div>
      </main>

      {!online && (
        <div
          role="status"
          className="rise fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-cap font-semibold whitespace-nowrap text-bg shadow-float md:bottom-6 md:left-[calc(50%+48px)] lg:left-[calc(50%+120px)]"
        >
          <IconOffline size={16} />
          오프라인 · 저장된 식단을 보여 줘요
        </div>
      )}

      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-[26px] border border-line bg-raised p-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        {NAV.map(({ href, label, Icon }) => {
          const on = isActive(path, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={`press flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[12px] font-semibold ${on ? 'text-ink' : 'text-ink-3'}`}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${on ? 'bg-brand-soft text-brand' : ''}`}>
                <Icon size={23} strokeWidth={on ? 2.1 : 1.8} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      <MenuSheet />
    </>
  )
}
