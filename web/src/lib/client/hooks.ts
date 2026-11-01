'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { kstToday } from '../date'

const STORAGE_EVENT = 'hm:storage'

function subscribeStorage(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(STORAGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(STORAGE_EVENT, cb)
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 이 기기에만 저장되는 값. 서버와 첫 화면은 기본값으로 그리고, 그다음 저장된 값으로 바꾼다 */
export function useStoredState<T>(key: string, fallback: T): [T, (value: T) => void] {
  // 기본값은 처음 받은 것을 계속 쓴다 (배열·객체를 넘겨도 매번 새 값으로 보지 않도록)
  const [initial] = useState(fallback)
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => readStorage(key),
    () => null,
  )
  const value = useMemo<T>(() => {
    if (raw == null) return initial
    try {
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  }, [raw, initial])
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // 사생활 보호 모드 등에서 저장이 막히면 이번 화면에서만 쓴다
      }
      window.dispatchEvent(new Event(STORAGE_EVENT))
    },
    [key],
  )
  return [value, set]
}

function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 60_000)
  document.addEventListener('visibilitychange', cb)
  return () => {
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', cb)
  }
}

/** 지금 한국 날짜. 서버가 그린 날짜로 시작해 기기 시계로 맞춘다 (자정이 지나면 바뀐다) */
export function useToday(serverDay: string): string {
  return useSyncExternalStore(subscribeClock, () => kstToday(), () => serverDay)
}

const noopSubscribe = () => () => {}
/** 브라우저에서 그려지는 중인지 (서버·첫 하이드레이션에서는 false) */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
}

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}
