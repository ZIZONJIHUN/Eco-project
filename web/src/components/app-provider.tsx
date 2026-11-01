'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { diffDays } from '@/lib/date'
import { mean } from '@/lib/stats'
import type { Dataset, Day } from '@/lib/types'
import type { DayLog, MealLog } from '@/lib/meal-log'
import { useStoredState, useToday } from '@/lib/client/hooks'

export type ThemePref = 'system' | 'light' | 'dark'
export type RefreshResult = 'updated' | 'same' | 'failed'

interface AppState {
  data: Dataset
  byDay: Map<string, Day>
  mealDays: string[]
  /** 전체 기간 한 끼 평균 */
  avg: number
  today: string
  /** 지금 보고 있는 날 */
  day: string
  /** 사용자가 직접 고른 날 (없으면 오늘/다음 급식을 자동으로 보여 준다) */
  pickedDay: string | null
  selectDay: (day: string | null) => void
  allergies: number[]
  setAllergies: (v: number[]) => void
  theme: ThemePref
  setTheme: (v: ThemePref) => void
  menu: { name: string; day: string | null } | null
  openMenu: (name: string, day?: string | null) => void
  closeMenu: () => void
  /** 먹은 양 기록 (이 기기에만 저장) */
  log: MealLog
  saveLog: (day: string, entry: DayLog | null) => void
  logDay: string | null
  openLog: (day: string) => void
  closeLog: () => void
  refresh: () => Promise<RefreshResult>
  refreshing: boolean
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp 은 AppProvider 안에서만 쓴다')
  return v
}

const STALE_MS = 6 * 60 * 60 * 1000

/** 오늘 급식이 있으면 오늘, 없으면 나흘 안의 다음 급식, 그것도 없으면 오늘(빈 화면에서 다음 급식을 안내) */
export function autoDay(today: string, byDay: Map<string, Day>, mealDays: string[]): string {
  if (byDay.has(today)) return today
  const next = mealDays.find((d) => d > today)
  if (next && diffDays(today, next) <= 4) return next
  return today
}

export function AppProvider({ initial, children }: { initial: Dataset; children: ReactNode }) {
  const [data, setData] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const [menu, setMenu] = useState<AppState['menu']>(null)
  const [logDay, setLogDay] = useState<string | null>(null)
  const [log, setLogState] = useStoredState<MealLog>('hm-log', {})
  const [allergies, setAllergies] = useStoredState<number[]>('hm-allergy', [])
  const [theme, setTheme] = useStoredState<ThemePref>('hm-theme', 'system')
  const today = useToday(initial.generatedDay)

  const byDay = useMemo(() => new Map(data.days.map((d) => [d.d, d])), [data])
  const mealDays = useMemo(() => data.days.map((d) => d.d), [data])
  const avg = useMemo(() => mean(data.days.map((d) => d.kg)), [data])
  const day = pickedDay ?? autoDay(today, byDay, mealDays)

  // 화면 테마: 고른 값 또는 시스템 설정
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) m.content = dark ? '#0d110f' : '#f3f4f1'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const generatedAt = data.generatedAt
  const inflight = useRef<Promise<RefreshResult> | null>(null)
  const refresh = useCallback(async (): Promise<RefreshResult> => {
    if (inflight.current) return inflight.current
    setRefreshing(true)
    inflight.current = (async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' })
        if (!res.ok) return 'failed'
        const next = (await res.json()) as Dataset
        if (next.generatedAt === generatedAt) return 'same'
        setData(next)
        return 'updated'
      } catch {
        return 'failed'
      } finally {
        setRefreshing(false)
        inflight.current = null
      }
    })()
    return inflight.current
  }, [generatedAt])

  // 앱을 오래 켜 두었다가 다시 보면(6시간 넘게) 조용히 새로 받는다
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      if (Date.now() - new Date(generatedAt).getTime() > STALE_MS) void refresh()
    }
    check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [generatedAt, refresh])

  const openMenu = useCallback((name: string, d: string | null = null) => setMenu({ name, day: d }), [])
  const closeMenu = useCallback(() => setMenu(null), [])
  const openLog = useCallback((d: string) => setLogDay(d), [])
  const closeLog = useCallback(() => setLogDay(null), [])
  const saveLog = useCallback(
    (d: string, entry: DayLog | null) => {
      const next = { ...log }
      if (entry) next[d] = entry
      else delete next[d]
      setLogState(next)
    },
    [log, setLogState],
  )

  const value = useMemo<AppState>(
    () => ({
      data,
      byDay,
      mealDays,
      avg,
      today,
      day,
      pickedDay,
      selectDay: setPickedDay,
      allergies,
      setAllergies,
      theme,
      setTheme,
      menu,
      openMenu,
      closeMenu,
      log,
      saveLog,
      logDay,
      openLog,
      closeLog,
      refresh,
      refreshing,
    }),
    [data, byDay, mealDays, avg, today, day, pickedDay, allergies, setAllergies, theme, setTheme, menu, openMenu, closeMenu, log, saveLog, logDay, openLog, closeLog, refresh, refreshing],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
