'use client'

import { useState } from 'react'
import { useMounted, useStoredState } from '@/lib/client/hooks'
import { useInstall } from '@/lib/client/install'
import { AppMark } from '../app-mark'
import { IconClose } from '../ui/icons'
import { Sheet } from '../ui/sheet'
import { useToast } from '../ui/toast'
import { InstallPanel } from './install-panel'

/** 오늘 화면 아래의 설치 권유 카드. 설치했거나 닫으면 다시 보이지 않는다 (설정에서 언제든 설치 가능) */
export function InstallNudge() {
  const mounted = useMounted()
  const { env, canPrompt, installed, prompt } = useInstall()
  const [dismissed, setDismissed] = useStoredState('hm-install-dismissed', false)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  if (!mounted || !env || installed || dismissed) return null

  const desktop = env.platform === 'desktop'
  const onClick = async () => {
    if (canPrompt && !desktop) {
      const r = await prompt()
      if (r === 'accepted') toast({ message: '설치했어요. 홈 화면에서 열어 보세요.', tone: 'success' })
      if (r !== 'unavailable') return
    }
    setOpen(true)
  }

  return (
    <>
      <section className="relative flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-surface p-4 pr-12 shadow-[0_0_0_1px_var(--line)] md:p-5 md:pr-14">
        <AppMark size={44} />
        <div className="min-w-[150px] flex-1">
          <h2 className="text-body font-semibold">{desktop ? '폰에도 설치해 보세요' : '홈 화면에 추가해 보세요'}</h2>
          <p className="text-cap text-ink-2">{desktop ? 'QR을 찍으면 폰에서 바로 열려요' : '앱처럼 바로 열리고, 인터넷이 없어도 보여요'}</p>
        </div>
        <button type="button" onClick={onClick} className="press min-h-11 shrink-0 rounded-btn bg-brand px-4 text-cap font-semibold text-brand-ink max-sm:basis-full">
          {desktop ? 'QR 보기' : '설치하기'}
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true)
            toast({ message: '설치는 설정에서 언제든 할 수 있어요', action: { label: '되돌리기', onClick: () => setDismissed(false) } })
          }}
          aria-label="설치 권유 닫기"
          className="press absolute top-2 right-2 grid size-11 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
        >
          <IconClose size={18} />
        </button>
      </section>
      <Sheet open={open} onClose={() => setOpen(false)} title={desktop ? '폰에 설치하기' : '홈 화면에 추가하기'} wide={desktop}>
        <InstallPanel />
      </Sheet>
    </>
  )
}
