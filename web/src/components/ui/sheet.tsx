'use client'

import { useEffect, useRef, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { IconClose } from './icons'

/**
 * 폰: 아래에서 올라오는 시트 (손잡이를 끌어내려 닫기)
 * 태블릿·PC: 가운데 대화상자
 * <dialog> 를 써서 포커스가 안에 머물고, Esc 로 닫으면 열었던 버튼으로 포커스가 돌아간다.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.classList.remove('closing')
      d.showModal()
      panel.current?.scrollTo({ top: 0 })
    } else if (!open && d.open) {
      d.classList.add('closing')
      const t = window.setTimeout(() => {
        d.close()
        d.classList.remove('closing')
        d.style.removeProperty('--drag')
      }, 160)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(min-width: 768px)').matches) return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    ref.current?.classList.add('dragging')
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dy = Math.max(0, e.clientY - drag.current.y)
    drag.current.dy = dy
    ref.current?.style.setProperty('--drag', `${dy}px`)
  }
  const onPointerUp = () => {
    const g = drag.current
    drag.current = null
    ref.current?.classList.remove('dragging')
    if (!g) return
    const velocity = g.dy / Math.max(1, performance.now() - g.t)
    if (g.dy > 110 || velocity > 0.6) onClose()
    else ref.current?.style.setProperty('--drag', '0px')
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        className={`sheet-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface shadow-sheet md:max-h-[86dvh] md:rounded-sheet md:shadow-float ${
          wide ? 'md:w-[min(720px,100%)]' : 'md:w-[min(560px,100%)]'
        }`}
      >
        <div
          className="flex shrink-0 touch-none justify-center pt-2.5 pb-1 md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-2 pb-3 md:px-7 md:pt-6">
          <div className="min-w-0">
            <h2 id="sheet-title" className="text-h2 font-bold tight text-balance">
              {title}
            </h2>
            {subtitle && <div className="mt-1.5 text-cap text-ink-2">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="press -mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-3"
          >
            <span className="grid size-8 place-items-center rounded-full bg-surface-3">
              <IconClose size={16} strokeWidth={2.2} />
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(24px+env(safe-area-inset-bottom))] md:px-7 md:pb-7">
          {children}
        </div>
      </div>
    </dialog>
  )
}
