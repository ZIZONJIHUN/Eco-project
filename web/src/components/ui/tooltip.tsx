'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { IconInfo } from './icons'

const DELAY = 300
const GAP = 8
const EDGE = 8

/**
 * 마우스를 올리거나(300ms 뒤) 키보드로 포커스하면 설명이 뜬다.
 * - 화살표로 대상을 가리키고, 위에 자리가 없으면 아래로 뒤집고, 화면 밖으로 나가지 않게 민다
 * - 마우스가 떠날 때, 포커스가 빠질 때, Esc, 스크롤, 바깥 탭에서 모두 닫힌다
 * - 터치 기기에는 마우스 올리기가 없으므로 tap 이면 눌러서 열고 닫는다 (정보 아이콘용)
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  tap = false,
  className = 'inline-flex',
}: {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'bottom' | 'right'
  tap?: boolean
  className?: string
}) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number; below: boolean; right?: boolean } | null>(null)

  const show = useCallback((delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }, [])
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setOpen(false)
    setPos(null)
  }, [])

  useLayoutEffect(() => {
    if (!open || !anchor.current || !tip.current) return
    const a = anchor.current.getBoundingClientRect()
    const t = tip.current.getBoundingClientRect()
    const vw = window.innerWidth
    if (side === 'right' && a.right + GAP + t.width < vw - EDGE) {
      const top = Math.min(Math.max(a.top + a.height / 2 - t.height / 2, EDGE), window.innerHeight - t.height - EDGE)
      setPos({ top, left: a.right + GAP + 2, arrow: a.top + a.height / 2 - top, below: false, right: true })
      return
    }
    const roomAbove = a.top - t.height - GAP > EDGE
    const roomBelow = a.bottom + t.height + GAP < window.innerHeight - EDGE
    const below = side === 'bottom' ? roomBelow || !roomAbove : !roomAbove && roomBelow
    const center = a.left + a.width / 2
    const left = Math.min(Math.max(center - t.width / 2, EDGE), vw - t.width - EDGE)
    setPos({ top: below ? a.bottom + GAP : a.top - t.height - GAP, left, arrow: center - left, below })
  }, [open, side, content])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    const onDown = (e: PointerEvent) => {
      if (!anchor.current?.contains(e.target as Node)) hide()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, hide])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const child = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, { 'aria-describedby': open ? id : undefined })
    : children

  return (
    <span
      ref={anchor}
      className={className}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show(DELAY)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches?.(':focus-visible')) show(0)
      }}
      onBlur={hide}
      onClick={tap ? (e) => {
        e.stopPropagation()
        if (open) hide()
        else show(0)
      } : undefined}
    >
      {child}
      {open &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="tooltip"
            className="tooltip pointer-events-none fixed z-[80] max-w-[280px] rounded-[12px] bg-ink px-3 py-2 text-[13px] leading-snug font-medium text-bg shadow-float dark:bg-surface-3 dark:text-ink"
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              ['--tip-from' as string]: pos?.right ? '0px' : pos?.below ? '-4px' : '4px',
            }}
          >
            {content}
            <span
              aria-hidden="true"
              className="absolute size-2.5 rotate-45 rounded-[2px] bg-ink dark:bg-surface-3"
              style={pos?.right ? { left: -4, top: (pos.arrow ?? 0) - 5 } : { left: (pos?.arrow ?? 0) - 5, ...(pos?.below ? { top: -4 } : { bottom: -4 }) }}
            />
          </div>,
          document.body,
        )}
    </span>
  )
}

/** "이게 뭐지?" 싶은 곳 옆의 작은 ⓘ. 마우스는 올리면, 터치는 누르면 설명이 뜬다 */
export function InfoTip({ children, label = '설명 보기', className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <Tooltip content={children} tap className={`inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        className="relative grid size-5 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink after:absolute after:-inset-2.5 after:content-['']"
      >
        <IconInfo size={16} strokeWidth={2} />
      </button>
    </Tooltip>
  )
}
