'use client'

import Link from 'next/link'
import { useMounted } from '@/lib/client/hooks'
import { AppMark } from '../app-mark'
import { IconArrowRight } from '../ui/icons'
import { InstallPanel } from './install-panel'
import { QrCode } from './qr-code'

/**
 * 발표·교실 화면용: 큰 QR 로 폰에서 바로 열고 설치하게 한다.
 * 폰으로 이 주소에 들어오면 그 폰에 맞는 설치 방법이 바로 보인다.
 */
export function InstallScreen() {
  const mounted = useMounted()
  const url = mounted ? `${window.location.origin}/install` : ''

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1080px] flex-col px-5 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] md:px-10 md:pt-14">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppMark size={48} />
          <div className="leading-tight">
            <p className="text-cap font-semibold text-ink-3">효명고등학교</p>
            <p className="text-title font-bold tight">급식 탄소</p>
          </div>
        </div>
        <Link href="/" className="press flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-cap font-semibold shadow-[0_0_0_1px_var(--line)]">
          앱 열기
          <IconArrowRight size={16} />
        </Link>
      </header>

      <div className="mt-8 grid flex-1 items-start gap-10 md:mt-14 md:items-center md:grid-cols-[auto_minmax(0,1fr)] md:gap-16">
        <div className="hidden flex-col items-center gap-4 md:flex">
          {mounted && <QrCode url={url} size={340} label="이 페이지로 오는 QR 코드" />}
          <p className="tnum text-body font-semibold text-ink-2">{url.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-h1 font-bold tight text-balance md:text-[44px] md:leading-[1.1]">
              <span className="md:hidden">홈 화면에 추가하고 앱처럼 쓰세요</span>
              <span className="hidden md:inline">폰 카메라로 QR을 찍으면 바로 열려요</span>
            </h1>
            <p className="mt-3 max-w-[46ch] text-body text-ink-2">
              오늘 점심 한 끼의 탄소, 메뉴별 재료, 남겼을 때 버려지는 탄소와 내 알레르기까지 한 번에 볼 수 있어요. 설치하면 인터넷이 없어도 마지막 식단이 열려요.
            </p>
          </div>
          <div className="rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] md:p-6">
            <h2 className="mb-4 text-title font-bold tight">이 기기에 설치하기</h2>
            <InstallPanel showQr="never" />
          </div>
        </div>
      </div>
    </main>
  )
}
