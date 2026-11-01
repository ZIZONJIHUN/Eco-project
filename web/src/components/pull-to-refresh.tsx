'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from './app-provider'
import { IconArrowDown, IconCheck } from './ui/icons'
import { useToast } from './ui/toast'

const THRESHOLD = 72
const MAX = 128
const REST = 56

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done'

/**
 * 폰에서 맨 위에서 아래로 당기면 새 식단을 받는다.
 * - 당길수록 무거워지고(저항), 임계점을 넘는 순간 한 번 진동하고, 원이 차오르다 놓으면 스피너가 된다
 * - 임계점 전에 놓으면 아무 일 없이 돌아가고, 끝나면 살짝 튕기며 제자리로
 */
export function PullToRefresh() {
  const { refresh } = useApp()
  const { toast } = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [dist, setDist] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const set = useCallback((p: Phase, d: number) => {
    phaseRef.current = p
    setPhase(p)
    setDist(d)
    document.documentElement.style.setProperty('--ptr', `${d}px`)
    document.documentElement.classList.toggle('ptr-dragging', p === 'pulling' || p === 'ready')
    document.documentElement.classList.toggle('ptr-on', d > 0)
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return
    let startY: number | null = null
    let current = 0
    let armed = false

    const onStart = (e: TouchEvent) => {
      if (phaseRef.current === 'refreshing' || window.scrollY > 0 || e.touches.length !== 1 || document.querySelector('dialog[open]')) {
        startY = null
        return
      }
      startY = e.touches[0].clientY
      armed = false
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0 || window.scrollY > 0) {
        if (current) set('idle', (current = 0))
        return
      }
      e.preventDefault()
      // 당길수록 덜 움직인다
      current = MAX * (1 - Math.exp(-dy / 230))
      const ready = current >= THRESHOLD
      if (ready && !armed) {
        armed = true
        navigator.vibrate?.(12)
      } else if (!ready) armed = false
      set(ready ? 'ready' : 'pulling', current)
    }
    const onEnd = async () => {
      if (startY === null) return
      startY = null
      if (current < THRESHOLD) {
        current = 0
        set('idle', 0)
        return
      }
      current = 0
      set('refreshing', REST)
      const r = await refresh()
      set('done', REST)
      toast(
        r === 'updated'
          ? { message: '새 식단을 받았어요', tone: 'success' }
          : r === 'same'
            ? { message: '이미 최신 식단이에요' }
            : { message: '나이스에 연결하지 못했어요. 잠시 뒤 다시 당겨 주세요.', tone: 'error' },
      )
      window.setTimeout(() => set('idle', 0), 450)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [refresh, toast, set])

  if (phase === 'idle' && dist === 0) return null
  const progress = Math.min(dist / THRESHOLD, 1)
  const r = 11
  const c = 2 * Math.PI * r

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center md:hidden"
      style={{ transform: `translateY(${dist - 44 + 12}px)`, transition: phase === 'pulling' || phase === 'ready' ? 'none' : 'transform 450ms var(--ease-spring)' }}
      role="status"
      aria-live="polite"
    >
      <span className="mt-[env(safe-area-inset-top)] grid size-11 place-items-center rounded-full bg-surface text-brand shadow-float">
        {phase === 'done' ? (
          <IconCheck size={20} strokeWidth={2.6} />
        ) : (
          <span className="relative grid place-items-center">
            <svg width="28" height="28" viewBox="0 0 28 28" className={phase === 'refreshing' ? 'animate-spin' : ''} aria-hidden="true">
              <circle cx="14" cy="14" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
              <circle
                cx="14"
                cy="14"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={phase === 'refreshing' ? c * 0.7 : c * (1 - progress)}
                transform="rotate(-90 14 14)"
              />
            </svg>
            {phase !== 'refreshing' && (
              <IconArrowDown
                size={13}
                strokeWidth={2.6}
                className="absolute transition-transform duration-200"
                style={{ transform: `rotate(${phase === 'ready' ? 180 : 0}deg)` }}
              />
            )}
          </span>
        )}
      </span>
      <span className="sr-only">{phase === 'ready' ? '놓으면 새로고침해요' : phase === 'refreshing' ? '새 식단을 받는 중' : ''}</span>
    </div>
  )
}
