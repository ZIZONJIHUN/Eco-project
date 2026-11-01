'use client'

import { useState } from 'react'
import { useMounted, useStoredState } from '@/lib/client/hooks'
import { useInstall } from '@/lib/client/install'
import { AppMark } from '../app-mark'
import { IconClose } from '../ui/icons'
import { Tooltip } from '../ui/tooltip'
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
      {/* 한 줄 배치: 아이콘 · 글 · 버튼 · 닫기. 폰에서도 버튼이 아래로 떨어지지 않게 글을 짧게 둔다 */}
      <section className="flex items-center gap-3 rounded-card bg-surface py-3 pr-1.5 pl-3 shadow-card">
        <AppMark size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="text-body leading-snug font-semibold">{desktop ? '폰에도 설치하기' : '앱으로 설치하기'}</h2>
          <p className="text-[12px] leading-snug text-ink-2">{desktop ? 'QR을 찍으면 폰에서 바로 열려요' : '홈 화면에서 바로 열리고 오프라인도 돼요'}</p>
        </div>
        <button type="button" onClick={onClick} className="press min-h-10 shrink-0 rounded-btn bg-brand px-4 text-cap font-semibold text-brand-ink">
          {desktop ? 'QR 보기' : '설치'}
        </button>
        <Tooltip content="닫기 · 설정에서 다시 설치할 수 있어요">
          <button
            type="button"
            onClick={() => {
              setDismissed(true)
              toast({ message: '설치는 설정에서 언제든 할 수 있어요', action: { label: '되돌리기', onClick: () => setDismissed(false) } })
            }}
            aria-label="설치 권유 닫기"
            className="press grid size-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
          >
            <IconClose size={18} />
          </button>
        </Tooltip>
      </section>
      <Sheet open={open} onClose={() => setOpen(false)} title={desktop ? '폰에 설치하기' : '홈 화면에 추가하기'} wide={desktop}>
        <InstallPanel />
      </Sheet>
    </>
  )
}
