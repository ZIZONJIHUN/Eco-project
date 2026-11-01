'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck, IconClose, IconInfo } from './icons'

type Tone = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  tone: Tone
  action?: { label: string; onClick: () => void }
}
interface ToastApi {
  toast: (t: { message: string; tone?: Tone; action?: ToastItem['action'] }) => void
}

const Ctx = createContext<ToastApi>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

// 정보·성공은 4초, 오류는 직접 닫을 때까지
const DURATION: Record<Tone, number | null> = { info: 4000, success: 4000, error: null }
const ICON = { info: IconInfo, success: IconCheck, error: IconAlert }
// 토스트 바탕이 진하므로 밝은 색을 쓴다
const ICON_COLOR = { info: 'opacity-70', success: 'text-lime dark:text-brand', error: 'text-[#ff9d95] dark:text-alert' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const schedule = useCallback(
    (id: number, tone: Tone) => {
      const ms = DURATION[tone]
      if (ms) timers.current.set(id, window.setTimeout(() => dismiss(id), ms))
    },
    [dismiss],
  )

  const toast = useCallback<ToastApi['toast']>(
    ({ message, tone = 'info', action }) => {
      const id = ++seq.current
      // 최대 3개까지 쌓고 오래된 것부터 밀어낸다
      setItems((xs) => [...xs.slice(-2), { id, message, tone, action }])
      schedule(id, tone)
    },
    [schedule],
  )

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:items-end"
      >
        {items.map((t) => {
          const Icon = ICON[t.tone]
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              onMouseEnter={() => {
                const timer = timers.current.get(t.id)
                if (timer) window.clearTimeout(timer)
              }}
              onMouseLeave={() => schedule(t.id, t.tone)}
              className="rise pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[16px] bg-ink py-2.5 pr-2 pl-4 text-body text-bg shadow-float dark:bg-surface-3 dark:text-ink"
            >
              <Icon size={18} className={`shrink-0 ${ICON_COLOR[t.tone]}`} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 text-cap font-medium">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="press shrink-0 rounded-[10px] px-3 py-2 text-cap font-semibold text-lime dark:text-brand"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => dismiss(t.id)}
                className="press grid size-9 shrink-0 place-items-center rounded-full opacity-70 hover:opacity-100"
              >
                <IconClose size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
